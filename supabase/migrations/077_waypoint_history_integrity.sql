-- Migration 077: Waypoint history JSONB integrity CHECK constraints (T1-6)
--
-- CC22 R1 finding F1/F4 follow-on: migration 073 adds *_history JSONB columns
-- and fills them via the audit trigger, but the inner content of the JSONB
-- array is opaque to row-level audit logging. An attacker (or sloppy
-- maintenance script) could:
--     UPDATE incidents
--     SET description_history = jsonb_set(
--           description_history, '{0,changed_at}', '"2026-04-01T00:00:00Z"'
--         )
--     WHERE id = ...
-- The audit_log captures "description_history was UPDATEd" but does NOT show
-- that history[0].changed_at was rolled back from a Tuesday to the prior Monday.
--
-- This migration adds CHECK constraints enforcing the only invariants attackers
-- care about (mirrors Navigator migration 072):
--   1. Each history row has shape {description|notes|placement_justification,
--      changed_at, changed_by}. Missing keys = invalid.
--   2. changed_at must parse as TIMESTAMPTZ ≤ now() + 1 minute (clock skew grace).
--   3. The history array is monotonically time-ordered.
--
-- Constraints are NOT VALID then VALIDATE separately so existing rows with
-- legitimate-but-malformed history (e.g., legacy seeds) are grandfathered.

-- ────────────────────────────────────────────────────────────────────────────
-- incidents.description_history
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_validate_incident_description_history(h JSONB)
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

ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_description_history_integrity;
ALTER TABLE incidents
  ADD CONSTRAINT incidents_description_history_integrity
  CHECK (fn_validate_incident_description_history(description_history)) NOT VALID;

DO $$
BEGIN
  ALTER TABLE incidents
    VALIDATE CONSTRAINT incidents_description_history_integrity;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'description_history validate skipped — review with: SELECT id FROM incidents WHERE NOT fn_validate_incident_description_history(description_history);';
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- incidents.notes_history
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_validate_incident_notes_history(h JSONB)
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
    IF NOT (v_row ? 'notes' AND v_row ? 'changed_at' AND v_row ? 'changed_by') THEN
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

ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_notes_history_integrity;
ALTER TABLE incidents
  ADD CONSTRAINT incidents_notes_history_integrity
  CHECK (fn_validate_incident_notes_history(notes_history)) NOT VALID;

DO $$
BEGIN
  ALTER TABLE incidents
    VALIDATE CONSTRAINT incidents_notes_history_integrity;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'notes_history validate skipped — review with: SELECT id FROM incidents WHERE NOT fn_validate_incident_notes_history(notes_history);';
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- compliance_checklists.placement_justification_history
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_validate_compliance_pj_history(h JSONB)
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
    IF NOT (v_row ? 'placement_justification' AND v_row ? 'changed_at' AND v_row ? 'changed_by') THEN
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

ALTER TABLE compliance_checklists
  DROP CONSTRAINT IF EXISTS compliance_checklists_pj_history_integrity;
ALTER TABLE compliance_checklists
  ADD CONSTRAINT compliance_checklists_pj_history_integrity
  CHECK (fn_validate_compliance_pj_history(placement_justification_history)) NOT VALID;

DO $$
BEGIN
  ALTER TABLE compliance_checklists
    VALIDATE CONSTRAINT compliance_checklists_pj_history_integrity;
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'placement_justification_history validate skipped — review with: SELECT id FROM compliance_checklists WHERE NOT fn_validate_compliance_pj_history(placement_justification_history);';
END $$;
