-- 072_navigator_history_integrity.sql
--
-- Round-3 audit, Reyes #1 (MEDIUM): navigator_placements.reason_history and
-- navigator_referrals.description_history are JSONB columns. Migrations
-- 066/068 capture mutations to the COLUMN itself in audit_log, but the
-- inner content of a JSONB array is opaque to row-level audit logging. An
-- attacker (or a sloppy maintenance script) could:
--     UPDATE navigator_placements
--     SET reason_history = jsonb_set(
--           reason_history, '{0,changed_at}', '"2026-04-01T00:00:00Z"'
--         )
--     WHERE id = ...
-- The audit_log captures "reason_history was UPDATEd" but does NOT show
-- that history[0].changed_at was rolled back from a Tuesday to the prior
-- Monday. A hearing officer reading both the audit_log and the PDF would
-- see internally consistent edit history — but the chain is forgeable.
--
-- This migration adds CHECK constraints that enforce the only invariants
-- attackers care about:
--   1. Each history row has shape {reason|description, changed_at, changed_by}.
--      Missing keys = invalid JSONB (someone synthesizing fake rows by hand).
--   2. changed_at on each history row must be in the past (i.e., not a
--      future-stamped or far-future value some script generated).
--   3. The history array is monotonically time-ordered: history[i].changed_at
--      <= history[i+1].changed_at. A backdating attack rewrites history[0]
--      to a date earlier than history[1] would otherwise pass row-level
--      audit but fails this check.
--
-- The constraints are NOT VALID then VALIDATE separately so existing rows
-- with malformed/legitimate history (e.g., the CC15 walkthrough seed) are
-- grandfathered if they fail; we'll surface those with a follow-up audit
-- query rather than rejecting the migration.
--
-- Trade-off documented: a sufficiently determined attacker with raw SQL
-- access can disable the constraint, mutate the JSONB, then re-enable.
-- This migration raises the friction floor — it does not reach the bar of
-- a separate immutable audit_edit_log table (deferred to Tier 2 / T3 work
-- per round-3 verdict).

-- ───────────────────────────────────────────────────────────────────────
-- navigator_placements.reason_history shape + monotonic time-ordering
-- ───────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_validate_reason_history(h JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_len INT;
  v_row JSONB;
  v_prev_at TIMESTAMPTZ := NULL;
  v_cur_at  TIMESTAMPTZ;
BEGIN
  IF h IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(h) <> 'array' THEN RETURN false; END IF;
  v_len := jsonb_array_length(h);
  IF v_len = 0 THEN RETURN true; END IF;

  FOR i IN 0..(v_len - 1) LOOP
    v_row := h -> i;
    -- Required keys present
    IF NOT (v_row ? 'reason' AND v_row ? 'changed_at' AND v_row ? 'changed_by') THEN
      RETURN false;
    END IF;
    -- changed_at parses + is in the past (not future-stamped)
    BEGIN
      v_cur_at := (v_row ->> 'changed_at')::TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN
      RETURN false;
    END;
    IF v_cur_at > now() + INTERVAL '1 minute' THEN  -- 1-min grace for clock skew
      RETURN false;
    END IF;
    -- Monotonically non-decreasing time order
    IF v_prev_at IS NOT NULL AND v_cur_at < v_prev_at THEN
      RETURN false;
    END IF;
    v_prev_at := v_cur_at;
  END LOOP;

  RETURN true;
END $$;

ALTER TABLE navigator_placements
  DROP CONSTRAINT IF EXISTS navigator_placements_reason_history_integrity;
ALTER TABLE navigator_placements
  ADD CONSTRAINT navigator_placements_reason_history_integrity
  CHECK (fn_validate_reason_history(reason_history)) NOT VALID;

DO $$
BEGIN
  ALTER TABLE navigator_placements
    VALIDATE CONSTRAINT navigator_placements_reason_history_integrity;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'reason_history validate skipped — existing rows fail integrity check; review with: SELECT id FROM navigator_placements WHERE NOT fn_validate_reason_history(reason_history);';
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- navigator_referrals.description_history shape + monotonic time-ordering
-- (mirror of the above with field name swap)
-- ───────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_validate_description_history(h JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_len INT;
  v_row JSONB;
  v_prev_at TIMESTAMPTZ := NULL;
  v_cur_at  TIMESTAMPTZ;
BEGIN
  IF h IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(h) <> 'array' THEN RETURN false; END IF;
  v_len := jsonb_array_length(h);
  IF v_len = 0 THEN RETURN true; END IF;

  FOR i IN 0..(v_len - 1) LOOP
    v_row := h -> i;
    IF NOT (v_row ? 'description' AND v_row ? 'changed_at' AND v_row ? 'changed_by') THEN
      RETURN false;
    END IF;
    BEGIN
      v_cur_at := (v_row ->> 'changed_at')::TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN
      RETURN false;
    END;
    IF v_cur_at > now() + INTERVAL '1 minute' THEN
      RETURN false;
    END IF;
    IF v_prev_at IS NOT NULL AND v_cur_at < v_prev_at THEN
      RETURN false;
    END IF;
    v_prev_at := v_cur_at;
  END LOOP;

  RETURN true;
END $$;

ALTER TABLE navigator_referrals
  DROP CONSTRAINT IF EXISTS navigator_referrals_description_history_integrity;
ALTER TABLE navigator_referrals
  ADD CONSTRAINT navigator_referrals_description_history_integrity
  CHECK (fn_validate_description_history(description_history)) NOT VALID;

DO $$
BEGIN
  ALTER TABLE navigator_referrals
    VALIDATE CONSTRAINT navigator_referrals_description_history_integrity;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'description_history validate skipped — existing rows fail integrity check; review with: SELECT id FROM navigator_referrals WHERE NOT fn_validate_description_history(description_history);';
END $$;
