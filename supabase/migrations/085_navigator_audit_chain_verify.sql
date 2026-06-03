-- Migration 085: Navigator audit-chain verification surface (N-1 / FRE 803(6))
-- ===========================================================================
-- CC32 finding: Navigator is ALREADY in migration 081's tamper-evident hash
-- chain. fn_navigator_audit_trigger (067) writes every referral/placement/
-- support/MDR mutation into the shared `audit_log`; 081's trg_audit_log_mirror
-- chains every audit_log row into `audit_edit_log`. Verified read-only in prod:
-- all Navigator entity types unmirrored=0, the 376-row chain verifies with
-- broken_rows=0, and chained snapshots carry the reason_history/
-- description_history JSONB. So the CC30 "Navigator has no chain" was a
-- false-missing — there is nothing to "port".
--
-- What WAS missing — and what this migration adds, purely additively (081 is on
-- a SHARED table; modifying it in place risks taking Waypoint down — risk N-4):
--
--   1. ACCESS. 081's read policy + verify RPCs gate on
--      role IN ('admin','principal','waypoint_admin'). Navigator districts run
--      hearings with ap / counselor / sped_coordinator / cbc / sss /
--      section_504_coordinator / director_student_affairs — all locked out of
--      verifying the chain that backs their own hearing evidence.
--      -> fn_navigator_verify_chain(): whole-chain integrity, callable by any
--         non-parent/non-student staff role. SECURITY DEFINER reads the table
--         as owner, so it needs no table-level GRANT (the 081 lockdown stays).
--
--   2. PROOF. Nothing cross-checked the edit history rendered in the hearing
--      packet PDF (navigatorPdf.js — reason_history / description_history JSONB,
--      which migration 072's own comment calls "forgeable") against the
--      immutable chain. That cross-check is what makes the 803(6) trustworthiness
--      claim CHECKABLE rather than asserted.
--      -> fn_navigator_verify_student_history(student): for each of a student's
--         placements/referrals, compares the LIVE free-text + *_history JSONB
--         against the most-recent chained snapshot. A row mutated OUTSIDE the
--         audited path (trigger disabled, raw JSONB edit, then re-enabled — the
--         exact 072 attack) shows history_matches_chain=false. District-scoped.
--
-- Detection limit (do NOT oversell): a postgres-superuser who rewrites the
-- whole chain forward from a tamper point produces a self-consistent chain this
-- cannot detect — that's what 082's external head-hash backup is for. These
-- functions detect the realistic vector: direct JSONB edits that bypass the
-- audit trigger. The chain head hash returned here is the value a custodian
-- attests to; cross-referencing it with the 082 Storage backup closes the loop.

-- ============================================================================
-- 0. Prereqs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. Whole-chain integrity, callable by Navigator staff roles
-- ============================================================================
--
-- Functionally identical to 081's fn_verify_audit_edit_log_chain(), but with a
-- staff-wide role gate instead of admin/principal-only. Re-implemented (not a
-- wrapper) so a future change to 081's gate can't silently narrow Navigator's
-- access. SECURITY DEFINER + table ownership means no GRANT on audit_edit_log
-- is required — the 081 REVOKE/RLS lockdown is untouched.

CREATE OR REPLACE FUNCTION fn_navigator_verify_chain()
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
  v_prev         TEXT := NULL;
  v_first_broken BIGINT := NULL;
  v_broken       BIGINT := 0;
  v_total        BIGINT := 0;
  v_head_hash    TEXT;
  v_head_seq     BIGINT;
  v_expected     TEXT;
  v_role         TEXT;
  rec            RECORD;
BEGIN
  -- Any authenticated staff member may verify chain integrity. Parents and
  -- students cannot. NULL role (unauthenticated) cannot.
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role IN ('parent', 'student') THEN
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
       OR rec.prev_row_hash IS DISTINCT FROM v_prev THEN
      IF v_first_broken IS NULL THEN v_first_broken := rec.seq; END IF;
      v_broken := v_broken + 1;
    END IF;
    v_prev      := rec.row_hash;
    v_head_hash := rec.row_hash;
    v_head_seq  := rec.seq;
  END LOOP;

  RETURN QUERY SELECT v_first_broken, v_broken, v_total, v_head_hash, v_head_seq;
END $$;

GRANT EXECUTE ON FUNCTION fn_navigator_verify_chain() TO authenticated;

-- ============================================================================
-- 2. Per-student edit-history cross-check (the 803(6) proof surface)
-- ============================================================================
--
-- For one student, compares each placement/referral's LIVE state against the
-- most-recent chained snapshot of that row. history_matches_chain=false means
-- the live *_history JSONB diverged from what the immutable chain recorded —
-- i.e. it was edited outside the audited path. A clean result (all rows
-- matches=true) is the evidence a records custodian relies on to testify the
-- rendered edit history is the same chain the system recorded at the time.

CREATE OR REPLACE FUNCTION fn_navigator_verify_student_history(p_student_id UUID)
RETURNS TABLE (
  entity_type           TEXT,
  entity_id             UUID,
  record_label          TEXT,
  last_chain_seq        BIGINT,
  last_chain_action     TEXT,
  audited               BOOLEAN,   -- a chain snapshot exists for this row
  live_history_len      INT,
  chained_history_len   INT,
  history_matches_chain BOOLEAN,   -- live *_history JSONB == chained snapshot
  live_value_matches    BOOLEAN    -- live free-text == chained snapshot free-text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_role             TEXT;
  v_caller_district  UUID;
  v_student_district UUID;
BEGIN
  SELECT role, district_id INTO v_role, v_caller_district
    FROM profiles WHERE id = auth.uid();
  IF v_role IS NULL OR v_role IN ('parent', 'student') THEN
    RAISE EXCEPTION 'Role % cannot verify Navigator audit history', COALESCE(v_role, '<none>')
      USING ERRCODE = '42501';
  END IF;

  SELECT district_id INTO v_student_district FROM students WHERE id = p_student_id;
  IF v_student_district IS NULL THEN
    RAISE EXCEPTION 'Student % not found', p_student_id USING ERRCODE = 'P0001';
  END IF;

  -- District isolation: waypoint_admin sees all; everyone else only their own
  -- district's students (defense-in-depth on top of table RLS, since this
  -- SECURITY DEFINER function reads navigator_* as owner).
  IF v_role <> 'waypoint_admin' AND v_student_district IS DISTINCT FROM v_caller_district THEN
    RAISE EXCEPTION 'Student % is outside your district', p_student_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH pl AS (
    SELECT id, placement_type, start_date, reason, reason_history
      FROM navigator_placements WHERE student_id = p_student_id
  ),
  pl_chain AS (
    SELECT DISTINCT ON (ae.entity_id)
           ae.entity_id, ae.seq, ae.action, ae.changes->'new' AS snap
      FROM audit_edit_log ae
     WHERE ae.entity_type = 'navigator_placements'
       AND ae.entity_id IN (SELECT id FROM pl)
     ORDER BY ae.entity_id, ae.seq DESC
  ),
  rf AS (
    SELECT id, referral_date, description, description_history
      FROM navigator_referrals WHERE student_id = p_student_id
  ),
  rf_chain AS (
    SELECT DISTINCT ON (ae.entity_id)
           ae.entity_id, ae.seq, ae.action, ae.changes->'new' AS snap
      FROM audit_edit_log ae
     WHERE ae.entity_type = 'navigator_referrals'
       AND ae.entity_id IN (SELECT id FROM rf)
     ORDER BY ae.entity_id, ae.seq DESC
  )
  SELECT
    'navigator_placements'::TEXT,
    pl.id,
    (COALESCE(to_char(pl.start_date, 'YYYY-MM-DD'), '—') || ' ' ||
       UPPER(COALESCE(pl.placement_type, '')) || ' placement')::TEXT,
    c.seq,
    c.action,
    (c.seq IS NOT NULL),
    jsonb_array_length(COALESCE(pl.reason_history, '[]'::jsonb)),
    jsonb_array_length(COALESCE(c.snap->'reason_history', '[]'::jsonb)),
    COALESCE(pl.reason_history, '[]'::jsonb) = COALESCE(c.snap->'reason_history', '[]'::jsonb),
    COALESCE(pl.reason, '') = COALESCE(c.snap->>'reason', '')
  FROM pl LEFT JOIN pl_chain c ON c.entity_id = pl.id

  UNION ALL

  SELECT
    'navigator_referrals'::TEXT,
    rf.id,
    (COALESCE(to_char(rf.referral_date, 'YYYY-MM-DD'), '—') || ' referral')::TEXT,
    c.seq,
    c.action,
    (c.seq IS NOT NULL),
    jsonb_array_length(COALESCE(rf.description_history, '[]'::jsonb)),
    jsonb_array_length(COALESCE(c.snap->'description_history', '[]'::jsonb)),
    COALESCE(rf.description_history, '[]'::jsonb) = COALESCE(c.snap->'description_history', '[]'::jsonb),
    COALESCE(rf.description, '') = COALESCE(c.snap->>'description', '')
  FROM rf LEFT JOIN rf_chain c ON c.entity_id = rf.id;
END $$;

GRANT EXECUTE ON FUNCTION fn_navigator_verify_student_history(UUID) TO authenticated;

-- ============================================================================
-- 3. Verification block (paste into Supabase SQL Editor after apply)
-- ============================================================================
-- No migration-tracking table exists; the SQL-Editor diff panel != applied
-- state. Run these and confirm. (The role-gated functions raise 42501 when
-- run as a NULL-auth.uid() SQL-Editor session — that's expected and proves the
-- gate works; use a service-role-impersonated session or the smoke test for a
-- positive call. The structural checks below DO run as-is.)
--
-- BLOCK A — both functions exist:
--   SELECT to_regprocedure('public.fn_navigator_verify_chain()')                AS chain_fn,
--          to_regprocedure('public.fn_navigator_verify_student_history(uuid)')  AS hist_fn;
--   -- Expect both non-null.
--
-- BLOCK B — chain verifies (run as a session with a staff auth.uid(), or via
--   the smoke test). Functionally must match 081's verifier:
--   SELECT * FROM fn_navigator_verify_chain();
--   -- Expect: first_broken_seq=NULL, broken_count=0, total_count=(audit_edit_log count).
--
-- BLOCK C — per-student cross-check for a seeded Lincoln HS student:
--   SELECT * FROM fn_navigator_verify_student_history('<student_uuid>');
--   -- Expect: audited=true and history_matches_chain=true for every row.
--   -- Any history_matches_chain=false = a record edited outside the audited path.
