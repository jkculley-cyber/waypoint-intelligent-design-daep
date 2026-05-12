-- Migration 081: audit_edit_log WORM mirror table with SHA-256 hash chain (T3 Phase 1)
--
-- CC23 R3 Reyes residual (last engineering item on the audit cadence ceiling):
-- audit_log is the queryable surface, but it can still be UPDATEd / DELETEd by
-- any role with sufficient privilege (postgres superuser, ad-hoc psql session
-- with DB password). The hash chain on this mirror table makes such tampering
-- DETECTABLE on next verification run. Phase 2 (next session) adds external
-- Storage backup of the chain head, which is what makes detection ALSO
-- preventative — at that point a deleter cannot rewrite history without
-- also rewriting Storage objects they have no permission to touch.
--
-- Phase 1 scope (this migration):
--   1. audit_edit_log table — mirror of audit_log + chain columns
--   2. Lockdown — REVOKE all mutations from all client roles; only the
--      SECURITY DEFINER append function (owned by postgres) can write.
--   3. fn_append_audit_edit_log — appends one row with hash chain.
--      Serialized via pg_advisory_xact_lock to avoid chain races under
--      concurrent transactions.
--   4. AFTER INSERT trigger on audit_log → mirror function. Same txn as
--      the originating mutation; rollback propagates correctly.
--   5. fn_verify_audit_edit_log_chain — walks the table, recomputes each
--      hash, reports first broken seq + count + head.
--   6. fn_verify_audit_log_matches_edit_log — joins audit_log ↔
--      audit_edit_log on id; recanonicalizes; detects post-mirror
--      tampering of audit_log itself.
--   7. Backfill — every existing audit_log row gets mirrored in
--      (created_at, id) order. Per-row EXCEPTION handler keeps the
--      migration from aborting on a malformed historical row.
--
-- Trust-root note: a postgres-superuser can rewrite the full chain from any
-- point (re-canonicalize, recompute every subsequent row_hash). Phase 1
-- alone does NOT prevent this — it raises the friction floor and creates
-- a fail-loud detection surface. Phase 2 externalizes the head hash to
-- Supabase Storage so an end-to-end rewrite must also rewrite a separate
-- daily-attested artifact. Do NOT oversell Phase 1 as tamper-PROOF.

-- ============================================================================
-- 0. Prereqs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. audit_edit_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_edit_log (
  seq               BIGSERIAL PRIMARY KEY,
  audit_log_id      UUID NOT NULL UNIQUE,
  district_id       UUID,
  user_id           UUID NOT NULL,
  action            TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         UUID NOT NULL,
  changes           JSONB,
  ip_address        TEXT,
  user_agent        TEXT,
  audit_created_at  TIMESTAMPTZ NOT NULL,
  -- Chain columns
  row_canonical     TEXT NOT NULL,
  prev_row_hash     TEXT,                  -- NULL only for seq=1
  row_hash          TEXT NOT NULL,
  -- Mirror metadata
  mirrored_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT row_hash_shape       CHECK (row_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT prev_row_hash_shape  CHECK (prev_row_hash IS NULL OR prev_row_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_aelog_audit_log_id ON audit_edit_log(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_aelog_entity       ON audit_edit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_aelog_district     ON audit_edit_log(district_id, audit_created_at DESC);

-- ============================================================================
-- 2. Lockdown — RLS + REVOKE all mutations
-- ============================================================================

ALTER TABLE audit_edit_log ENABLE ROW LEVEL SECURITY;

-- Strip every write privilege from every client role. Only the postgres role
-- (and SECURITY DEFINER functions owned by postgres) retain write access.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON audit_edit_log FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON audit_edit_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON audit_edit_log FROM authenticated;
DO $$
BEGIN
  EXECUTE 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON audit_edit_log FROM service_role';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'service_role REVOKE skipped: %', SQLERRM;
END $$;

-- Grant SELECT to authenticated so RLS policies can mediate row access.
GRANT SELECT ON audit_edit_log TO authenticated;

-- District admin / principal can read their own district's rows.
DROP POLICY IF EXISTS "district_read_audit_edit_log" ON audit_edit_log;
CREATE POLICY "district_read_audit_edit_log" ON audit_edit_log
  FOR SELECT
  USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'principal')
  );

-- Waypoint admin can read everything.
DROP POLICY IF EXISTS "waypoint_admin_read_all_audit_edit_log" ON audit_edit_log;
CREATE POLICY "waypoint_admin_read_all_audit_edit_log" ON audit_edit_log
  FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'waypoint_admin');

-- ============================================================================
-- 3. Append function — only path into audit_edit_log
-- ============================================================================
--
-- Serialized via pg_advisory_xact_lock so the head-hash read and the row
-- INSERT are atomic across concurrent transactions. Contention budget is
-- bounded by audit_log write volume, which itself is bounded by mutation
-- volume. At realistic district scale (Marlene's 3,400 incidents/yr ×
-- ~6 lifecycle updates = ~55 audit writes/day) the lock is non-blocking.

CREATE OR REPLACE FUNCTION fn_append_audit_edit_log(p_audit_log_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_audit     audit_log%ROWTYPE;
  v_prev_hash TEXT;
  v_canon     TEXT;
  v_hash      TEXT;
  v_seq       BIGINT;
BEGIN
  -- Serialize chain appends within concurrent txns.
  -- hashtext('audit_edit_log_chain') gives a stable bigint key.
  PERFORM pg_advisory_xact_lock(hashtext('audit_edit_log_chain')::bigint);

  -- Fetch the audit_log row to mirror.
  SELECT * INTO v_audit FROM audit_log WHERE id = p_audit_log_id;
  IF v_audit.id IS NULL THEN
    RAISE EXCEPTION 'audit_log row % not found', p_audit_log_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Idempotency: refuse to mirror the same audit_log row twice. The UNIQUE
  -- constraint on audit_log_id would also catch this, but raising here
  -- gives a clearer error.
  IF EXISTS (SELECT 1 FROM audit_edit_log WHERE audit_log_id = p_audit_log_id) THEN
    RAISE EXCEPTION 'audit_log row % already mirrored to audit_edit_log', p_audit_log_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Canonical text form. jsonb_build_object output is JSONB-normalized
  -- (keys sorted, whitespace canonical) so the ::text cast is stable
  -- across Postgres versions of the same major line. created_at uses
  -- microsecond-precision UTC ISO-8601 via to_char, which is deterministic.
  v_canon := jsonb_build_object(
    'audit_log_id',      v_audit.id::text,
    'district_id',       COALESCE(v_audit.district_id::text, ''),
    'user_id',           v_audit.user_id::text,
    'action',            v_audit.action,
    'entity_type',       v_audit.entity_type,
    'entity_id',         v_audit.entity_id::text,
    'changes',           COALESCE(v_audit.changes, 'null'::jsonb),
    'ip_address',        COALESCE(v_audit.ip_address, ''),
    'user_agent',        COALESCE(v_audit.user_agent, ''),
    'audit_created_at',  to_char(v_audit.created_at AT TIME ZONE 'UTC',
                                 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  )::text;

  -- Previous head — uses STORED row_hash of the row with the largest seq.
  SELECT row_hash INTO v_prev_hash
    FROM audit_edit_log
   ORDER BY seq DESC
   LIMIT 1;

  v_hash := encode(digest(COALESCE(v_prev_hash, '') || v_canon, 'sha256'), 'hex');

  INSERT INTO audit_edit_log (
    audit_log_id, district_id, user_id, action, entity_type, entity_id,
    changes, ip_address, user_agent, audit_created_at,
    row_canonical, prev_row_hash, row_hash
  ) VALUES (
    v_audit.id, v_audit.district_id, v_audit.user_id, v_audit.action,
    v_audit.entity_type, v_audit.entity_id, v_audit.changes,
    v_audit.ip_address, v_audit.user_agent, v_audit.created_at,
    v_canon, v_prev_hash, v_hash
  ) RETURNING seq INTO v_seq;

  RETURN v_seq;
END $$;

-- The append function is callable by authenticated (the trigger runs as
-- definer so this grant is for direct invocation from smoke tests / future
-- admin tooling). It enforces its own idempotency, and the table-level
-- REVOKE blocks any direct INSERT bypassing it.
GRANT EXECUTE ON FUNCTION fn_append_audit_edit_log(UUID) TO authenticated;

-- ============================================================================
-- 4. Bridge trigger — mirror every audit_log INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_mirror_audit_to_edit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_append_audit_edit_log(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_log_mirror ON audit_log;
CREATE TRIGGER trg_audit_log_mirror
  AFTER INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION fn_mirror_audit_to_edit_log();

-- ============================================================================
-- 5. Chain verification function
-- ============================================================================
--
-- Walks audit_edit_log in seq order, recomputing each row's expected hash
-- using STORED prev_row_hash + STORED row_canonical. Reports the first
-- inconsistent seq + cumulative break count + total rows + chain head.
--
-- Cascade behavior: if row N is tampered, row N+1's stored prev_row_hash
-- (which points to row N's ORIGINAL hash) no longer matches v_prev
-- (which is row N's TAMPERED hash). So broken_count reflects the
-- propagation; first_broken_seq pinpoints the original tamper point.
--
-- Detection limits: a privileged attacker who rewrites the entire chain
-- from the tamper point forward (re-canonicalize → recompute all
-- subsequent row_hashes consistently) produces a self-consistent chain
-- that this function CANNOT detect. Phase 2's external head-hash backup
-- is what closes that gap.

CREATE OR REPLACE FUNCTION fn_verify_audit_edit_log_chain()
RETURNS TABLE (
  first_broken_seq BIGINT,
  broken_count     BIGINT,
  total_count      BIGINT,
  head_hash        TEXT,
  head_seq         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_prev          TEXT := NULL;
  v_first_broken  BIGINT := NULL;
  v_broken_count  BIGINT := 0;
  v_total         BIGINT := 0;
  v_head_hash     TEXT;
  v_head_seq      BIGINT;
  v_expected      TEXT;
  v_role          TEXT;
  rec             RECORD;
BEGIN
  -- Authorization: waypoint_admin OR district admin/principal.
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('waypoint_admin', 'admin', 'principal') THEN
    RAISE EXCEPTION 'Role % cannot verify audit chain', COALESCE(v_role, '<none>')
      USING ERRCODE = '42501';
  END IF;

  FOR rec IN
    SELECT seq, row_canonical, prev_row_hash, row_hash
      FROM audit_edit_log
     ORDER BY seq
  LOOP
    v_total    := v_total + 1;
    v_expected := encode(digest(COALESCE(v_prev, '') || rec.row_canonical, 'sha256'), 'hex');

    -- Two failure modes:
    --   (a) row_hash != recomputed hash      (canonical or hash tampered)
    --   (b) prev_row_hash != previous v_prev (chain link broken)
    IF rec.row_hash <> v_expected
       OR rec.prev_row_hash IS DISTINCT FROM v_prev
    THEN
      IF v_first_broken IS NULL THEN
        v_first_broken := rec.seq;
      END IF;
      v_broken_count := v_broken_count + 1;
    END IF;

    -- Use STORED row_hash to continue the chain — that's what the next
    -- row's prev_row_hash was set from at insertion time.
    v_prev      := rec.row_hash;
    v_head_hash := rec.row_hash;
    v_head_seq  := rec.seq;
  END LOOP;

  RETURN QUERY SELECT v_first_broken, v_broken_count, v_total, v_head_hash, v_head_seq;
END $$;

GRANT EXECUTE ON FUNCTION fn_verify_audit_edit_log_chain() TO authenticated;

-- ============================================================================
-- 6. Cross-check function — audit_log vs audit_edit_log
-- ============================================================================
--
-- The chain on audit_edit_log proves internal consistency. This function
-- proves CROSS-table consistency: every row in audit_edit_log has a
-- matching row in audit_log AND that row's current content recanonicalizes
-- identically. Detects two attack/error modes:
--   - Someone DELETEs / UPDATEs rows in audit_log AFTER mirror ran.
--     audit_edit_log row exists, audit_log row missing or different.
--   - Mirror trigger was disabled and rows accumulated in audit_log
--     without being mirrored.

CREATE OR REPLACE FUNCTION fn_verify_audit_log_matches_edit_log()
RETURNS TABLE (
  audit_log_total           BIGINT,
  audit_edit_log_total      BIGINT,
  unmirrored_count          BIGINT,  -- in audit_log, not in audit_edit_log
  orphaned_count            BIGINT,  -- in audit_edit_log, audit_log row missing
  mismatched_count          BIGINT,  -- in both, but canonical differs
  first_unmirrored_id       UUID,
  first_orphaned_audit_log_id UUID,
  first_mismatched_id       UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_recompute TEXT;
  rec RECORD;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role NOT IN ('waypoint_admin', 'admin', 'principal') THEN
    RAISE EXCEPTION 'Role % cannot verify audit chain', COALESCE(v_role, '<none>')
      USING ERRCODE = '42501';
  END IF;

  audit_log_total           := 0;
  audit_edit_log_total      := 0;
  unmirrored_count          := 0;
  orphaned_count            := 0;
  mismatched_count          := 0;
  first_unmirrored_id       := NULL;
  first_orphaned_audit_log_id := NULL;
  first_mismatched_id       := NULL;

  SELECT count(*) INTO audit_log_total      FROM audit_log;
  SELECT count(*) INTO audit_edit_log_total FROM audit_edit_log;

  -- Unmirrored: audit_log rows with no audit_edit_log match.
  FOR rec IN
    SELECT al.id
      FROM audit_log al
      LEFT JOIN audit_edit_log ae ON ae.audit_log_id = al.id
     WHERE ae.audit_log_id IS NULL
     ORDER BY al.created_at, al.id
  LOOP
    unmirrored_count := unmirrored_count + 1;
    IF first_unmirrored_id IS NULL THEN first_unmirrored_id := rec.id; END IF;
  END LOOP;

  -- Orphaned + mismatched: walk audit_edit_log, look up audit_log row.
  FOR rec IN
    SELECT ae.audit_log_id, ae.row_canonical,
           al.id          AS al_id,
           al.district_id AS al_district_id,
           al.user_id     AS al_user_id,
           al.action      AS al_action,
           al.entity_type AS al_entity_type,
           al.entity_id   AS al_entity_id,
           al.changes     AS al_changes,
           al.ip_address  AS al_ip_address,
           al.user_agent  AS al_user_agent,
           al.created_at  AS al_created_at
      FROM audit_edit_log ae
      LEFT JOIN audit_log al ON al.id = ae.audit_log_id
     ORDER BY ae.seq
  LOOP
    IF rec.al_id IS NULL THEN
      orphaned_count := orphaned_count + 1;
      IF first_orphaned_audit_log_id IS NULL THEN
        first_orphaned_audit_log_id := rec.audit_log_id;
      END IF;
    ELSE
      v_recompute := jsonb_build_object(
        'audit_log_id',      rec.al_id::text,
        'district_id',       COALESCE(rec.al_district_id::text, ''),
        'user_id',           rec.al_user_id::text,
        'action',            rec.al_action,
        'entity_type',       rec.al_entity_type,
        'entity_id',         rec.al_entity_id::text,
        'changes',           COALESCE(rec.al_changes, 'null'::jsonb),
        'ip_address',        COALESCE(rec.al_ip_address, ''),
        'user_agent',        COALESCE(rec.al_user_agent, ''),
        'audit_created_at',  to_char(rec.al_created_at AT TIME ZONE 'UTC',
                                     'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
      )::text;
      IF v_recompute <> rec.row_canonical THEN
        mismatched_count := mismatched_count + 1;
        IF first_mismatched_id IS NULL THEN
          first_mismatched_id := rec.audit_log_id;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    audit_log_total, audit_edit_log_total,
    unmirrored_count, orphaned_count, mismatched_count,
    first_unmirrored_id, first_orphaned_audit_log_id, first_mismatched_id;
END $$;

GRANT EXECUTE ON FUNCTION fn_verify_audit_log_matches_edit_log() TO authenticated;

-- ============================================================================
-- 7. Backfill — every existing audit_log row mirrored in (created_at, id) order
-- ============================================================================
--
-- The trigger created above only fires on NEW inserts; existing rows need
-- explicit backfill. Walks audit_log in chronological order so the chain
-- ordering reflects the audit_log timeline (within the limits of created_at
-- collisions, broken by id). Per-row EXCEPTION block: if any historical row
-- fails (malformed JSON, missing FK target after schema evolution, etc.),
-- log + skip + continue. Skipped count surfaces at end.
--
-- Concurrency note: this runs AFTER the trigger is in place. If application
-- traffic inserts a new audit_log row mid-backfill, that row's mirror fires
-- through the trigger and lands in audit_edit_log immediately. The advisory
-- lock serializes appends, so the chain stays consistent regardless of
-- interleaving. Audit consumers should not assume audit_edit_log.seq order
-- matches audit_log.created_at order — seq is chain order, created_at is
-- the canonical chronological ordering for read surfaces.

DO $$
DECLARE
  v_cnt  BIGINT := 0;
  v_err  BIGINT := 0;
  v_skip BIGINT := 0;
  v_row  RECORD;
BEGIN
  FOR v_row IN
    SELECT al.id
      FROM audit_log al
      LEFT JOIN audit_edit_log ae ON ae.audit_log_id = al.id
     WHERE ae.audit_log_id IS NULL
     ORDER BY al.created_at, al.id
  LOOP
    BEGIN
      PERFORM fn_append_audit_edit_log(v_row.id);
      v_cnt := v_cnt + 1;
      IF v_cnt % 1000 = 0 THEN
        RAISE NOTICE 'audit_edit_log backfill: % rows mirrored', v_cnt;
      END IF;
    EXCEPTION
      WHEN unique_violation THEN
        v_skip := v_skip + 1;
      WHEN OTHERS THEN
        v_err := v_err + 1;
        RAISE NOTICE 'audit_edit_log backfill skipped audit_log %: %', v_row.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'audit_edit_log backfill complete: % mirrored, % already-present, % failed',
    v_cnt, v_skip, v_err;
END $$;

-- ============================================================================
-- 8. Verification block (paste into Supabase SQL Editor after apply)
-- ============================================================================
--
-- Paste each block separately into the SQL Editor and confirm expected output.
-- This is required because the project has no migration-tracking table — the
-- SQL Editor diff panel ≠ applied state (CC23 lesson).
--
-- BLOCK A — table + columns reachable:
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'audit_edit_log'
--    ORDER BY ordinal_position;
--   -- Expect 14 rows: seq, audit_log_id, district_id, user_id, action,
--   --   entity_type, entity_id, changes, ip_address, user_agent,
--   --   audit_created_at, row_canonical, prev_row_hash, row_hash, mirrored_at.
--
-- BLOCK B — row counts match:
--   SELECT
--     (SELECT count(*) FROM audit_log)      AS audit_log_count,
--     (SELECT count(*) FROM audit_edit_log) AS audit_edit_log_count;
--   -- Expect both columns equal (or audit_edit_log slightly higher if traffic
--   -- continued during backfill — never lower).
--
-- BLOCK C — trigger installed:
--   SELECT tgname, tgtype
--     FROM pg_trigger
--    WHERE tgrelid = 'public.audit_log'::regclass
--      AND tgname = 'trg_audit_log_mirror';
--   -- Expect 1 row.
--
-- BLOCK D — table is locked down:
--   SELECT grantee, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_name = 'audit_edit_log'
--      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
--   -- Expect 0 rows (postgres role-owner privileges are not shown here).
--
-- BLOCK E — chain verifies:
--   SELECT * FROM fn_verify_audit_edit_log_chain();
--   -- Expect: first_broken_seq = NULL, broken_count = 0,
--   --         total_count = audit_log_count, head_hash = '<64-hex>', head_seq = total_count.
--
-- BLOCK F — cross-check verifies:
--   SELECT * FROM fn_verify_audit_log_matches_edit_log();
--   -- Expect: unmirrored_count = 0, orphaned_count = 0, mismatched_count = 0.
