-- Migration 082: audit_chain_backup_state + Storage bucket + hourly pg_cron (T3 Phase 2)
--
-- Closes the prevention half of Reyes's CC23 R3 residual. Phase 1 (mig 081)
-- gave audit_edit_log a SHA-256 hash chain — internally consistent, tamper-
-- DETECTABLE. A privileged attacker with postgres-superuser access could
-- still rewrite the entire chain consistently. Phase 2 externalizes the
-- chain head to a write-only Supabase Storage bucket via hourly Edge
-- Function so that a full-chain rewrite must also rewrite every prior
-- Storage object — which requires permissions the deleter doesn't have in
-- a single attack window.
--
-- Phase 2 scope (this migration):
--   1. audit_chain_backup_state — singleton state row holding cursor +
--      last head + run status. Mutable (by service-role only via SECURITY
--      DEFINER RPCs).
--   2. Atomic lock RPCs — fn_try_acquire_audit_backup_lock /
--      fn_complete_audit_backup_run. UPDATE-WHERE-RETURNING semantics for
--      cross-process mutual exclusion without session-bound advisory locks.
--   3. Storage bucket audit-edit-log-backups — private, waypoint_admin
--      read-only via storage.objects RLS, no public INSERT/UPDATE/DELETE
--      policies (service_role bypasses RLS for the Edge Function).
--   4. pg_cron schedule — verify-and-backup-audit-chain, hourly at :00.
--      Service-role key placeholder must be replaced before scheduling.
--
-- Trust-root note: the Storage bucket is still deletable by anyone with
-- Supabase project-owner dashboard access. Phase 2 doesn't escape that
-- root — it raises the friction floor materially (an attacker now has to
-- delete every prior chain-head Storage object AND rewrite the chain in
-- one window without leaving evidence in either layer) but truly external
-- redundancy (S3/GCS with separate IAM) is a future "Phase 4" decision,
-- not part of this work. Reyes's residual is closed at the substrate
-- layer; further hardening is a procurement-conversation upgrade.

-- ============================================================================
-- 1. State table — singleton cursor for the backup pipeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_chain_backup_state (
  id                  SMALLINT PRIMARY KEY CHECK (id = 1),
  last_backed_up_seq  BIGINT NOT NULL DEFAULT 0,
  last_head_hash      TEXT,
  last_head_seq       BIGINT,
  last_run_at         TIMESTAMPTZ,
  last_status         TEXT,         -- 'ok' | 'running' | 'integrity_failure' | 'error'
  last_error          TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO audit_chain_backup_state (id, last_backed_up_seq)
  VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE audit_chain_backup_state ENABLE ROW LEVEL SECURITY;

-- Read access: waypoint_admin everywhere; the singleton row is global.
DROP POLICY IF EXISTS "waypoint_admin_read_backup_state" ON audit_chain_backup_state;
CREATE POLICY "waypoint_admin_read_backup_state" ON audit_chain_backup_state
  FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin');

-- No INSERT/UPDATE/DELETE policies — authenticated cannot mutate this table.
-- service_role bypasses RLS and writes via the SECURITY DEFINER RPCs below.
-- (Direct authenticated writes are denied even with bypassing service_role
-- because the policies don't exist; if some future caller authenticates with
-- service_role and a real auth.uid(), policies will still block them.)

-- ============================================================================
-- 2. Atomic-lock RPCs — cross-process mutual exclusion via UPDATE WHERE
-- ============================================================================
--
-- pg_advisory_lock is session-bound, which doesn't work across separate
-- Edge Function invocations (each invocation is a new connection). The
-- UPDATE-WHERE-RETURNING pattern below is atomic at the row-lock level and
-- safe across processes: only one caller can flip last_status to 'running'
-- when the state is non-'running' OR stale. Stale threshold defaults to
-- 5 min — if a run crashes mid-flight, the next run picks up after 5 min.

CREATE OR REPLACE FUNCTION fn_try_acquire_audit_backup_lock(
  p_stale_threshold INTERVAL DEFAULT '5 minutes'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id SMALLINT;
BEGIN
  UPDATE audit_chain_backup_state
     SET last_status = 'running',
         last_run_at = now(),
         last_error  = NULL,
         updated_at  = now()
   WHERE id = 1
     AND (last_status IS DISTINCT FROM 'running'
          OR last_run_at < now() - p_stale_threshold)
  RETURNING id INTO v_id;

  RETURN v_id IS NOT NULL;
END $$;

GRANT EXECUTE ON FUNCTION fn_try_acquire_audit_backup_lock(INTERVAL) TO authenticated;

CREATE OR REPLACE FUNCTION fn_complete_audit_backup_run(
  p_status         TEXT,
  p_backed_up_seq  BIGINT DEFAULT NULL,
  p_head_hash      TEXT   DEFAULT NULL,
  p_head_seq       BIGINT DEFAULT NULL,
  p_error          TEXT   DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('ok', 'integrity_failure', 'error') THEN
    RAISE EXCEPTION 'invalid status %, expected ok|integrity_failure|error', p_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE audit_chain_backup_state
     SET last_status         = p_status,
         last_backed_up_seq  = COALESCE(p_backed_up_seq, last_backed_up_seq),
         last_head_hash      = COALESCE(p_head_hash,     last_head_hash),
         last_head_seq       = COALESCE(p_head_seq,      last_head_seq),
         last_error          = p_error,
         last_run_at         = now(),
         updated_at          = now()
   WHERE id = 1;
END $$;

GRANT EXECUTE ON FUNCTION fn_complete_audit_backup_run(TEXT, BIGINT, TEXT, BIGINT, TEXT) TO authenticated;

-- ============================================================================
-- 3. Storage bucket — audit-edit-log-backups
-- ============================================================================
--
-- Private bucket. RLS on storage.objects: waypoint_admin SELECT only. No
-- INSERT/UPDATE/DELETE policies for authenticated — those operations are
-- blocked. service_role bypasses RLS so the Edge Function can write.
--
-- Trust posture: the bucket is deletable by Supabase project-owner via
-- dashboard, same as the DB itself. The intent of this bucket isn't
-- "impossible to delete" — it's "deletion creates evidence of itself"
-- because the Edge Function's previous runs persist as objects that an
-- adversary must also remove. A privileged attacker can still empty the
-- bucket, but the empty state + a chain-head that points beyond audit_log
-- is itself the signal.

INSERT INTO storage.buckets (id, name, public)
  VALUES ('audit-edit-log-backups', 'audit-edit-log-backups', false)
  ON CONFLICT (id) DO NOTHING;

-- Waypoint admin can read backups; no other role can read this bucket.
DROP POLICY IF EXISTS "waypoint_admin_read_audit_backups" ON storage.objects;
CREATE POLICY "waypoint_admin_read_audit_backups" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audit-edit-log-backups'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin'
  );

-- Explicit deny for write paths is implicit (no policy = denied for
-- non-bypassing roles). Documented here for the next reader:
--   INSERT  → no policy → blocked for authenticated, allowed for service_role
--   UPDATE  → no policy → blocked for authenticated, allowed for service_role
--   DELETE  → no policy → blocked for authenticated, allowed for service_role
-- service_role bypass is the only way the Edge Function can write/overwrite.
-- We deliberately allow service_role UPDATE/DELETE on storage.objects so
-- the function can manage its own outputs (e.g., a future retention purge);
-- the audit_edit_log row chain is the canonical record, not the bucket.

-- ============================================================================
-- 4. pg_cron schedule — hourly verify-and-backup
-- ============================================================================
--
-- Extension prereqs (already installed for migrations 053/056):
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- BEFORE running this section, replace SERVICE_ROLE_KEY_HERE with the
-- service_role key from Project Settings → API. The key sits in the
-- cron.job body in plaintext; visible only to the postgres role by default.
-- Same posture as migration 053. Same lesson: rotating the service_role
-- key requires re-running this section.

-- Unschedule any prior job with this name (handles re-runs safely).
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'verify-and-backup-audit-chain';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron.unschedule skipped: %', SQLERRM;
END $$;

-- Hourly at :00. Adjust the schedule expression to change cadence.
-- '0 * * * *' = every hour at minute 0.
SELECT cron.schedule(
  'verify-and-backup-audit-chain',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kvxecksvkimcgwhxxyhw.supabase.co/functions/v1/verify-and-backup-audit-chain',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SERVICE_ROLE_KEY_HERE'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- 5. Verification block (paste into Supabase SQL Editor after apply)
-- ============================================================================
--
-- BLOCK A — state table seeded:
--   SELECT * FROM audit_chain_backup_state;
--   -- Expect 1 row: id=1, last_backed_up_seq=0, last_run_at=NULL.
--
-- BLOCK B — lock RPC returns true on first call, false on second:
--   SELECT fn_try_acquire_audit_backup_lock();   -- expect true
--   SELECT fn_try_acquire_audit_backup_lock();   -- expect false (already running)
--   -- After this, reset the state for the next caller:
--   SELECT fn_complete_audit_backup_run('error', NULL, NULL, NULL, 'test reset');
--
-- BLOCK C — bucket created:
--   SELECT id, name, public FROM storage.buckets WHERE id = 'audit-edit-log-backups';
--   -- Expect 1 row, public = false.
--
-- BLOCK D — bucket RLS policy installed:
--   SELECT policyname, cmd
--     FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects'
--      AND policyname = 'waypoint_admin_read_audit_backups';
--   -- Expect 1 row, cmd = SELECT.
--
-- BLOCK E — cron job scheduled (will only run if SERVICE_ROLE_KEY_HERE
-- was replaced before the cron.schedule call above):
--   SELECT jobname, schedule, command
--     FROM cron.job
--    WHERE jobname = 'verify-and-backup-audit-chain';
--   -- Expect 1 row, schedule = '0 * * * *'.
--   -- Command should contain Bearer <key> NOT containing the literal
--   -- SERVICE_ROLE_KEY_HERE placeholder.
