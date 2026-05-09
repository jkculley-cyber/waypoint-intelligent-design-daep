-- Migration 074: Waypoint 10-day SPED rule with P0001 RAISE (T1-1)
--
-- CC22 R1 finding F1 — convergent 4-of-4 voices: Waypoint's 10-day SPED rule
-- is currently alert-only (migration 015 inserts an `alerts` row but does NOT
-- block the placement). Reyes called this ELEVATED exposure; Patricia called it
-- "yellow tape line" theater; Marlene named it as a buy-blocker; Mark Davidson
-- (competitor) said the alert-only posture is exactly the angle Frontline will
-- use ("the alert lands in someone's queue; the placement still ships").
--
-- Mirrors Navigator migration 066 fn_navigator_check_sped_10day, adapted for
-- Waypoint's incidents/compliance_checklists schema:
--   - Waypoint stores placement type as incidents.consequence_type
--     ('iss'|'oss'|'daep'|...) instead of Navigator's placement_type
--   - Waypoint counts only incidents that have reached 'approved' or later
--     (Navigator placements have no draft state)
--   - MDR proof = compliance_checklists.manifestation_determination IS NOT NULL
--     for the linked compliance_checklist (existing Waypoint pattern), instead
--     of Navigator's separate manifestation_determinations table FK
--
-- IDEA 34 CFR §300.530(b)(7) + (e) requires an MDR before any pattern of
-- removals totaling more than 10 school days. Section 504 students are covered
-- via 34 CFR §104.36 and Honig v. Doe — both is_sped and is_504 trigger.

CREATE OR REPLACE FUNCTION fn_waypoint_check_sped_10day()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_sped     BOOLEAN;
  v_is_504      BOOLEAN;
  v_cumulative  INT;
  v_sy_start    DATE;
  v_new_days    INT;
  v_mdr_at      TIMESTAMPTZ;
  v_protected   BOOLEAN;
BEGIN
  -- Only fire on placements that have reached 'approved' or 'active' state.
  -- Drafts, submitted, and under_review are pre-decision and don't count
  -- toward cumulative removal days. Once status is approved/active/completed,
  -- the placement is or has been served.
  IF NEW.status NOT IN ('approved','active','completed') THEN
    RETURN NEW;
  END IF;

  -- Only removal-type consequences count. ISS/OSS are clear removals;
  -- DAEP placement is a removal under §300.530(b)(7). Expulsion is also
  -- a removal but separately governed; included here for completeness.
  IF NEW.consequence_type NOT IN ('iss','oss','daep','expulsion') THEN
    RETURN NEW;
  END IF;

  -- Look up the student's protected status. Both SPED and Section 504 trigger.
  SELECT is_sped, is_504 INTO v_is_sped, v_is_504
  FROM students WHERE id = NEW.student_id;
  v_protected := COALESCE(v_is_sped, false) OR COALESCE(v_is_504, false);
  IF NOT v_protected THEN
    RETURN NEW;
  END IF;

  v_sy_start := fn_school_year_start(NEW.incident_date);
  v_new_days := COALESCE(NEW.consequence_days, 0);

  -- Sum existing approved/active/completed removal-type incidents for this
  -- student in current school year, excluding self (so UPDATEs work).
  SELECT COALESCE(SUM(consequence_days), 0) INTO v_cumulative
  FROM incidents
  WHERE student_id = NEW.student_id
    AND consequence_type IN ('iss','oss','daep','expulsion')
    AND status IN ('approved','active','completed')
    AND incident_date >= v_sy_start
    AND id IS DISTINCT FROM NEW.id;

  -- If projected total wouldn't exceed 10 days, allow.
  IF (v_cumulative + v_new_days) <= 10 THEN
    RETURN NEW;
  END IF;

  -- Cumulative would exceed 10. Verify MDR has been completed.
  IF NEW.compliance_checklist_id IS NULL THEN
    RAISE EXCEPTION
      'IDEA 34 CFR §300.530: % student would exceed 10 cumulative removal days this school year (% existing + % new = %). Manifestation Determination Review required before this placement. No compliance_checklist linked to this incident.',
      CASE WHEN v_is_sped THEN 'SPED' ELSE 'Section 504' END,
      v_cumulative, v_new_days, v_cumulative + v_new_days
      USING ERRCODE = 'P0001',
            HINT = 'Create the compliance checklist first, complete the manifestation determination, then approve this placement.';
  END IF;

  SELECT manifestation_determination INTO v_mdr_at
  FROM compliance_checklists WHERE id = NEW.compliance_checklist_id;

  IF v_mdr_at IS NULL THEN
    RAISE EXCEPTION
      'IDEA 34 CFR §300.530: % student would exceed 10 cumulative removal days this school year (% existing + % new = %). Manifestation Determination Review required before this placement. The linked compliance_checklist (%) has no manifestation_determination timestamp.',
      CASE WHEN v_is_sped THEN 'SPED' ELSE 'Section 504' END,
      v_cumulative, v_new_days, v_cumulative + v_new_days,
      NEW.compliance_checklist_id
      USING ERRCODE = 'P0001',
            HINT = 'Convene the MDR meeting, record the determination on the compliance checklist, then retry this status change.';
  END IF;

  -- MDR is on file — placement may proceed.
  RETURN NEW;
END $$;

-- '2_' prefix fires before audit ('9_'), after parent-notice ('1_').
DROP TRIGGER IF EXISTS trg_2_incidents_sped_10day ON incidents;
CREATE TRIGGER trg_2_incidents_sped_10day
  BEFORE INSERT OR UPDATE OF status, consequence_type, consequence_days, compliance_checklist_id
  ON incidents
  FOR EACH ROW EXECUTE FUNCTION fn_waypoint_check_sped_10day();
