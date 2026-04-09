-- Migration 061: Home campus DAEP allocation + transition plan handoff + seat release
--
-- Adds:
--   1. campuses.daep_seat_allocation  — each home campus's DAEP seat budget
--   2. incidents.seat_released_at     — admin override to free a no-show's seat
--   3. transition_plans handoff cols  — pending_home_campus / accepted workflow
--   4. Trigger on incidents.status='completed' → flips matching plan to pending_home_campus

-- 1. Home campus DAEP seat allocation
ALTER TABLE campuses
  ADD COLUMN IF NOT EXISTS daep_seat_allocation INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN campuses.daep_seat_allocation IS
  'How many of this home campus''s students can be in DAEP at once. District-level allocation, set by waypoint_admin.';

-- 2. Seat release override for oriented no-shows
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS seat_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seat_released_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN incidents.seat_released_at IS
  'When an admin released the seat for an oriented no-show student. NULL = seat still held.';

-- 3. Transition plan handoff columns
ALTER TABLE transition_plans
  ADD COLUMN IF NOT EXISTS handoff_status TEXT
    CHECK (handoff_status IN ('pending_home_campus', 'accepted')),
  ADD COLUMN IF NOT EXISTS handoff_initiated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS home_campus_accepted_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS home_campus_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_return_adjustments TEXT;

COMMENT ON COLUMN transition_plans.handoff_status IS
  'pending_home_campus = DAEP completed, awaiting home campus acceptance. accepted = home campus took ownership.';

-- 4. Trigger: when incident flips to status='completed', mark linked plan as pending_home_campus
CREATE OR REPLACE FUNCTION tg_incident_complete_handoff()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE transition_plans
       SET handoff_status = 'pending_home_campus',
           handoff_initiated_at = NOW()
     WHERE incident_id = NEW.id
       AND handoff_status IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_incident_complete_handoff ON incidents;
CREATE TRIGGER trg_incident_complete_handoff
  AFTER UPDATE OF status ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION tg_incident_complete_handoff();

CREATE INDEX IF NOT EXISTS idx_transition_plans_handoff_status
  ON transition_plans(handoff_status)
  WHERE handoff_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_seat_released
  ON incidents(seat_released_at)
  WHERE seat_released_at IS NULL;
