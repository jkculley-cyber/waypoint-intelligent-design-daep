-- Hotpatch for migration 081: fix digest() resolution + re-run backfill.
--
-- BUG: migration 081 declared `SET search_path = public` on the SECURITY DEFINER
-- functions that call digest() from pgcrypto. Supabase installs pgcrypto in the
-- `extensions` schema, not `public`, so the bare `digest(text, text)` call fails
-- with "function digest(text, unknown) does not exist". This propagates up
-- through the AFTER INSERT trigger and aborts every audit_log INSERT, which in
-- turn aborts every mutation that fires the audit trigger (incidents,
-- compliance_checklists, transition_plans).
--
-- IMPACT: production app mutations are blocked until this patch is applied.
-- The 081 backfill DO block also failed per-row (NOTICE'd into v_err counter)
-- so audit_edit_log is currently empty.
--
-- FIX: add `extensions` to the SET search_path on the two functions that use
-- digest(). The mirror trigger function (which doesn't use digest directly)
-- doesn't need the change — called functions use their own SET search_path,
-- so the digest call inside fn_append_audit_edit_log resolves against the
-- callee's path, not the trigger function's path.
--
-- AFTER PATCH: re-run the backfill DO block. It is idempotent — the LEFT
-- JOIN guard skips audit_log rows that are already mirrored, so re-running
-- against a state where some rows somehow mirrored is safe.

-- ============================================================================
-- 1. fn_append_audit_edit_log — search_path now includes extensions
-- ============================================================================

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
  PERFORM pg_advisory_xact_lock(hashtext('audit_edit_log_chain')::bigint);

  SELECT * INTO v_audit FROM audit_log WHERE id = p_audit_log_id;
  IF v_audit.id IS NULL THEN
    RAISE EXCEPTION 'audit_log row % not found', p_audit_log_id
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM audit_edit_log WHERE audit_log_id = p_audit_log_id) THEN
    RAISE EXCEPTION 'audit_log row % already mirrored to audit_edit_log', p_audit_log_id
      USING ERRCODE = 'P0001';
  END IF;

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

-- ============================================================================
-- 2. fn_verify_audit_edit_log_chain — search_path now includes extensions
-- ============================================================================

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

    IF rec.row_hash <> v_expected
       OR rec.prev_row_hash IS DISTINCT FROM v_prev
    THEN
      IF v_first_broken IS NULL THEN
        v_first_broken := rec.seq;
      END IF;
      v_broken_count := v_broken_count + 1;
    END IF;

    v_prev      := rec.row_hash;
    v_head_hash := rec.row_hash;
    v_head_seq  := rec.seq;
  END LOOP;

  RETURN QUERY SELECT v_first_broken, v_broken_count, v_total, v_head_hash, v_head_seq;
END $$;

-- ============================================================================
-- 3. Re-run backfill — picks up any audit_log rows still unmirrored
-- ============================================================================

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
