-- Migration 076: Lock compliance_checklists watched fields when status='completed' (T1-4)
--
-- CC22 R1 finding F4 — convergent 3-of-4 voices (Reyes SEVERE, Patricia THEATER,
-- Marlene blocker): once compliance_checklists.status='completed', the row
-- remains UPDATE-able. RLS allows admin/principal/AP/SPED coordinator to
-- silently edit manifestation_determination, manifestation_result,
-- ard_committee_met, parent_notified, etc. — three days after the parent
-- acknowledged the placement, a district admin can quietly change a date and
-- the parent never knows.
--
-- This migration installs a BEFORE UPDATE trigger that raises P0001 if any
-- compliance-bearing field changes while status was, and remains, 'completed'.
-- Allowed transitions: completed → in_progress (re-open), completed → waived,
-- in_progress/incomplete → completed (legitimate completion). When status
-- moves AWAY from 'completed', the lock releases for that UPDATE; when it
-- moves BACK to 'completed', the row is locked again.
--
-- The unlock-on-reopen path is the legitimate fix for "we got something wrong
-- on the MDR." Re-open, fix, complete again. Each step audited (migration 073).

CREATE OR REPLACE FUNCTION fn_waypoint_compliance_lock_completed()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Lock only applies when both OLD and NEW status are 'completed'.
  -- Movements into or out of 'completed' are legitimate state transitions.
  IF OLD.status <> 'completed' OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Status is 'completed' on both sides. Reject any change to watched fields.
  IF (NEW.ard_committee_notified      IS DISTINCT FROM OLD.ard_committee_notified)
     OR (NEW.ard_committee_met        IS DISTINCT FROM OLD.ard_committee_met)
     OR (NEW.manifestation_determination IS DISTINCT FROM OLD.manifestation_determination)
     OR (NEW.manifestation_result     IS DISTINCT FROM OLD.manifestation_result)
     OR (NEW.bip_reviewed             IS DISTINCT FROM OLD.bip_reviewed)
     OR (NEW.bip_updated              IS DISTINCT FROM OLD.bip_updated)
     OR (NEW.fba_conducted            IS DISTINCT FROM OLD.fba_conducted)
     OR (NEW.parent_notified          IS DISTINCT FROM OLD.parent_notified)
     OR (NEW.parent_notification_method IS DISTINCT FROM OLD.parent_notification_method)
     OR (NEW.fape_plan_documented     IS DISTINCT FROM OLD.fape_plan_documented)
     OR (NEW.educational_services_arranged IS DISTINCT FROM OLD.educational_services_arranged)
     OR (NEW.iep_goals_reviewed       IS DISTINCT FROM OLD.iep_goals_reviewed)
     OR (NEW.placement_justification  IS DISTINCT FROM OLD.placement_justification)
     OR (NEW.least_restrictive_considered IS DISTINCT FROM OLD.least_restrictive_considered)
     OR (NEW.completed_by             IS DISTINCT FROM OLD.completed_by)
     OR (NEW.completed_at             IS DISTINCT FROM OLD.completed_at)
  THEN
    RAISE EXCEPTION
      'compliance_checklists row is locked: status=''completed''. Re-open the checklist first (status → ''in_progress'') to make changes, then re-complete. Audit log will capture the re-open and re-complete events.'
      USING ERRCODE = 'P0001',
            HINT = 'UPDATE compliance_checklists SET status = ''in_progress'' WHERE id = ' || OLD.id || '; then make your edit; then UPDATE status back to ''completed''.';
  END IF;

  RETURN NEW;
END $$;

-- '3_' prefix fires after parent-notice ('1_'), before audit ('9_').
DROP TRIGGER IF EXISTS trg_3_compliance_checklists_lock ON compliance_checklists;
CREATE TRIGGER trg_3_compliance_checklists_lock
  BEFORE UPDATE ON compliance_checklists
  FOR EACH ROW EXECUTE FUNCTION fn_waypoint_compliance_lock_completed();
