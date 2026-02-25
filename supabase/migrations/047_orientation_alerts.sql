-- Migration 047: Orientation Alerts + Separation Orders
-- Adds DB triggers for missed-orientation and placement-not-started alerts,
-- plus auto-resolve on first daily kiosk check-in or manual activation.
-- Also creates incident_separations table for FERPA-guarded keep-away notes.

-- ============================================================
-- TRIGGER 1: Create "orientation_missed" alert when status → 'missed'
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_create_orientation_missed_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campus_id UUID;
  v_district_id UUID;
BEGIN
  -- Only fire when orientation_status changes to 'missed'
  IF NEW.orientation_status IS DISTINCT FROM 'missed' OR OLD.orientation_status = 'missed' THEN
    RETURN NEW;
  END IF;

  -- Dedup: skip if active orientation_missed alert already exists for this student
  IF EXISTS (
    SELECT 1 FROM alerts
    WHERE student_id = NEW.student_id
      AND trigger_type = 'orientation_missed'
      AND status NOT IN ('resolved', 'dismissed')
  ) THEN
    RETURN NEW;
  END IF;

  -- Get campus_id and district_id from the linked incident
  SELECT campus_id, district_id
  INTO v_campus_id, v_district_id
  FROM incidents
  WHERE id = NEW.incident_id
  LIMIT 1;

  INSERT INTO alerts (
    district_id,
    campus_id,
    student_id,
    alert_level,
    trigger_type,
    trigger_description,
    status,
    suggested_interventions
  ) VALUES (
    COALESCE(v_district_id, NEW.district_id),
    v_campus_id,
    NEW.student_id,
    'yellow',
    'orientation_missed',
    'Student missed their scheduled DAEP orientation date. A new orientation must be scheduled.',
    'active',
    ARRAY[
      'Contact family to reschedule orientation',
      'Verify student transportation to DAEP',
      'Update orientation date in placement scheduler'
    ]
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orientation_missed_alert ON public.daep_placement_scheduling;
CREATE TRIGGER trg_orientation_missed_alert
  AFTER UPDATE ON public.daep_placement_scheduling
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_orientation_missed_alert();

-- ============================================================
-- TRIGGER 2: Create "placement_not_started" alert when status → 'completed'
-- (orientation kiosk completion fires this)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_create_placement_not_started_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campus_id UUID;
  v_district_id UUID;
BEGIN
  -- Only fire when orientation_status changes to 'completed'
  IF NEW.orientation_status IS DISTINCT FROM 'completed' OR OLD.orientation_status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Dedup: skip if active placement_not_started alert already exists for this student
  IF EXISTS (
    SELECT 1 FROM alerts
    WHERE student_id = NEW.student_id
      AND trigger_type = 'placement_not_started'
      AND status NOT IN ('resolved', 'dismissed')
  ) THEN
    RETURN NEW;
  END IF;

  -- Get campus_id and district_id from the linked incident
  SELECT campus_id, district_id
  INTO v_campus_id, v_district_id
  FROM incidents
  WHERE id = NEW.incident_id
  LIMIT 1;

  INSERT INTO alerts (
    district_id,
    campus_id,
    student_id,
    alert_level,
    trigger_type,
    trigger_description,
    status,
    suggested_interventions
  ) VALUES (
    COALESCE(v_district_id, NEW.district_id),
    v_campus_id,
    NEW.student_id,
    'yellow',
    'placement_not_started',
    'Student completed orientation but has not yet signed in on the daily check-in kiosk. Confirm DAEP start.',
    'active',
    ARRAY[
      'Confirm student''s DAEP start date',
      'Contact family if student is absent',
      'Verify transportation arrangements'
    ]
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_placement_not_started_alert ON public.daep_placement_scheduling;
CREATE TRIGGER trg_placement_not_started_alert
  AFTER UPDATE ON public.daep_placement_scheduling
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_placement_not_started_alert();

-- ============================================================
-- TRIGGER 3A: Auto-resolve "placement_not_started" alert on first daily kiosk check-in
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_resolve_placement_started_on_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Resolve any active placement_not_started alerts for this student
  UPDATE alerts
  SET
    status = 'resolved',
    resolved_at = now(),
    resolution_notes = 'Auto-resolved: student signed in on the daily check-in kiosk.'
  WHERE student_id = NEW.student_id
    AND trigger_type = 'placement_not_started'
    AND status NOT IN ('resolved', 'dismissed');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_placement_started_checkin ON public.daily_behavior_tracking;
CREATE TRIGGER trg_resolve_placement_started_checkin
  AFTER INSERT ON public.daily_behavior_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_resolve_placement_started_on_checkin();

-- ============================================================
-- TRIGGER 3B: Auto-resolve "placement_not_started" alert when incident → 'active'
-- (staff manually activated without kiosk)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_resolve_placement_started_on_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status changes to 'active'
  IF NEW.status IS DISTINCT FROM 'active' OR OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  -- Resolve any active placement_not_started alerts for this student
  UPDATE alerts
  SET
    status = 'resolved',
    resolved_at = now(),
    resolution_notes = 'Auto-resolved: DAEP placement manually activated by staff.'
  WHERE student_id = NEW.student_id
    AND trigger_type = 'placement_not_started'
    AND status NOT IN ('resolved', 'dismissed');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_placement_started_activation ON public.incidents;
CREATE TRIGGER trg_resolve_placement_started_activation
  AFTER UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_resolve_placement_started_on_activation();

-- ============================================================
-- TABLE: incident_separations
-- FERPA-guarded keep-away notes (staff only, never parent-facing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_separations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id      UUID NOT NULL REFERENCES public.districts(id),
  incident_id      UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  other_student_id UUID NOT NULL REFERENCES public.students(id),
  notes            TEXT,
  created_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incident_separations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage separations" ON public.incident_separations;
CREATE POLICY "Staff manage separations"
  ON public.incident_separations FOR ALL
  USING (district_id = user_district_id() OR is_waypoint_admin())
  WITH CHECK (district_id = user_district_id() OR is_waypoint_admin());

CREATE INDEX IF NOT EXISTS idx_inc_sep_incident ON public.incident_separations(incident_id);
CREATE INDEX IF NOT EXISTS idx_inc_sep_student  ON public.incident_separations(other_student_id);
