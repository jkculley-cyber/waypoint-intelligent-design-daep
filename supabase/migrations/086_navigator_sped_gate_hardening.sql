-- Migration 086: Harden the Navigator SPED 10-day / MDR gate
-- ---------------------------------------------------------------------------
-- CC39 review follow-up. The 066 gate (fn_navigator_check_sped_10day) had four
-- holes that let an unlawful IDEA removal reach the tamper-evident record with
-- no DB block — in the one product whose differentiator is SPED compliance:
--
--   H-1  A *manifestation-positive* MDR satisfied the gate. §300.530(e)/(f):
--        a manifestation-positive removal beyond 10 cumulative days is unlawful
--        UNLESS a §300.530(g) special-circumstances basis (weapons / illegal
--        drugs / serious bodily injury) applies. 084 added the column but nothing
--        enforced it — the block lived only in the New Placement drawer's JS.
--   H-2  The gate counted only the nullable `days` column (COALESCE ...,0). A
--        placement entered with dates but a blank Days field added 0 to the
--        cumulative total, silently skipping the whole 10-day rule.
--   M-5  The linked MDR was a bare FK — an MDR belonging to a *different student*
--        (or, since FK validation ignores RLS, a different district) satisfied
--        the gate.
--   L-1  The trigger fired only on UPDATE OF (days, placement_type,
--        manifestation_determination_id) — moving start_date across the
--        school-year boundary re-zeroed the cumulative count without re-check.
--
-- This migration replaces the function (SECURITY DEFINER, unchanged) and widens
-- the trigger's UPDATE OF column list. Purely additive to schema; 084's column
-- and CHECK are reused. Non-breaking: open-ended placements with neither a day
-- count nor an end_date still contribute 0 (genuinely uncountable at entry),
-- but a placement with dates now counts its real span.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_navigator_check_sped_10day()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_sped      BOOLEAN;
  v_cumulative   INT;
  v_sy_start     DATE;
  v_new_days     INT;
  v_mdr_student  UUID;
  v_is_manifest  BOOLEAN;
BEGIN
  IF NEW.placement_type NOT IN ('iss','oss') THEN
    RETURN NEW;
  END IF;

  SELECT is_sped INTO v_is_sped FROM students WHERE id = NEW.student_id;
  IF NOT COALESCE(v_is_sped, false) THEN
    RETURN NEW;
  END IF;

  v_sy_start := fn_school_year_start(NEW.start_date);

  -- Effective removal days: prefer the explicit count, else derive from the
  -- date span (inclusive), else 0. Closes H-2 — a blank `days` no longer makes
  -- a dated removal invisible to the cumulative total.
  v_new_days := COALESCE(
    NEW.days,
    CASE WHEN NEW.end_date IS NOT NULL AND NEW.end_date >= NEW.start_date
         THEN (NEW.end_date - NEW.start_date) + 1 END,
    0
  );

  -- Sum existing SY placements EXCLUDING this row, using the same
  -- days-or-span-or-0 rule so the totals are consistent.
  SELECT COALESCE(SUM(
    COALESCE(
      days,
      CASE WHEN end_date IS NOT NULL AND end_date >= start_date
           THEN (end_date - start_date) + 1 END,
      0
    )
  ), 0) INTO v_cumulative
  FROM navigator_placements
  WHERE student_id = NEW.student_id
    AND placement_type IN ('iss','oss')
    AND start_date >= v_sy_start
    AND id IS DISTINCT FROM NEW.id;

  IF (v_cumulative + v_new_days) > 10 THEN
    -- Over the threshold: an MDR must be linked.
    IF NEW.manifestation_determination_id IS NULL THEN
      RAISE EXCEPTION
        'IDEA 34 CFR §300.530: SPED student would exceed 10 cumulative removal days this school year (% existing + % new = %). Manifestation Determination Review required before this placement. Link manifestation_determinations.id on this row to proceed.',
        v_cumulative, v_new_days, v_cumulative + v_new_days
        USING ERRCODE = 'P0001',
              HINT = 'Convene MDR via the Navigator placement form, then retry.';
    END IF;

    -- The linked MDR must belong to THIS student (closes M-5).
    SELECT student_id, is_manifestation
      INTO v_mdr_student, v_is_manifest
    FROM manifestation_determinations
    WHERE id = NEW.manifestation_determination_id;

    IF v_mdr_student IS NULL THEN
      RAISE EXCEPTION
        'Linked Manifestation Determination Review (%) does not exist.',
        NEW.manifestation_determination_id
        USING ERRCODE = 'P0001';
    END IF;

    IF v_mdr_student IS DISTINCT FROM NEW.student_id THEN
      RAISE EXCEPTION
        'Linked Manifestation Determination Review belongs to a different student. The MDR must be for the student being removed.'
        USING ERRCODE = 'P0001',
              HINT = 'Select an MDR convened for this student.';
    END IF;

    -- Manifestation-positive removal beyond 10 days is lawful ONLY under a
    -- §300.530(g) special-circumstances basis (closes H-1).
    IF COALESCE(v_is_manifest, false) AND NEW.special_circumstances_basis IS NULL THEN
      RAISE EXCEPTION
        'IDEA 34 CFR §300.530(e): the MDR found this behavior WAS a manifestation of the disability. A removal beyond 10 cumulative days is not permitted unless a §300.530(g) special-circumstances basis (weapons, illegal drugs, or serious bodily injury) applies.'
        USING ERRCODE = 'P0001',
              HINT = 'Set special_circumstances_basis if (and only if) §300.530(g) genuinely applies; otherwise the removal must not exceed 10 days.';
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- Widen the trigger so start_date / end_date changes (which move the cumulative
-- window and the derived span) re-run the check (closes L-1).
DROP TRIGGER IF EXISTS trg_navigator_sped_10day ON navigator_placements;
DROP TRIGGER IF EXISTS trg_2_placements_sped_10day ON navigator_placements;
CREATE TRIGGER trg_2_placements_sped_10day
  BEFORE INSERT OR UPDATE OF days, start_date, end_date, placement_type, manifestation_determination_id, special_circumstances_basis
  ON navigator_placements
  FOR EACH ROW EXECUTE FUNCTION fn_navigator_check_sped_10day();

-- ---------------------------------------------------------------------------
-- VERIFICATION (paste into Supabase SQL Editor — this project has no migration
-- tracking table, so confirm the function + trigger are actually live):
--
--   -- 1. Function body carries the new guards:
--   SELECT pg_get_functiondef('fn_navigator_check_sped_10day'::regproc) LIKE '%300.530(e)%'
--       AS has_manifestation_guard;   -- expect true
--
--   -- 2. Trigger fires on the widened column set:
--   SELECT pg_get_triggerdef(oid) FROM pg_trigger
--   WHERE tgname = 'trg_2_placements_sped_10day';   -- expect start_date, end_date listed
--
--   -- 3. Behavior probe (rollback after): with a manifestation-positive MDR for
--   --    a SPED student already >10 days, an UPDATE setting a >10-day removal and
--   --    special_circumstances_basis = NULL must RAISE. Setting basis = 'weapons'
--   --    (when it genuinely applies) must succeed.
-- ---------------------------------------------------------------------------
