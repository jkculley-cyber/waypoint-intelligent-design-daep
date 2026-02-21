-- Migration 030: Remove permissive anonymous RLS from kiosk tables
-- Replace with SECURITY DEFINER RPCs that scope all access by student_id.
--
-- BEFORE: 3 open policies on daily_behavior_tracking (SELECT/INSERT/UPDATE USING (true))
--         2 open policies on daep_placement_scheduling (no district filter)
--         1 open policy on incidents (no student filter)
--         → Any anonymous caller could read/write data across ALL districts
--
-- AFTER: 0 direct anon table policies. All kiosk access goes through RPCs that
--         execute as the defining role (postgres) and are scoped by student_id.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Drop permissive anon policies (from migrations 013, 018, 025)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Kiosk can view behavior tracking"   ON daily_behavior_tracking;
DROP POLICY IF EXISTS "Kiosk can insert check-in records"  ON daily_behavior_tracking;
DROP POLICY IF EXISTS "Kiosk can update check-in records"  ON daily_behavior_tracking;
DROP POLICY IF EXISTS "Kiosk can view active placements"   ON incidents;
DROP POLICY IF EXISTS "Kiosk can view scheduled orientations" ON daep_placement_scheduling;
DROP POLICY IF EXISTS "Kiosk can complete orientations"    ON daep_placement_scheduling;

-- Revoke direct SELECT/INSERT/UPDATE/DELETE from anon on these tables
-- (anon can still execute the SECURITY DEFINER RPCs below)
REVOKE ALL ON daily_behavior_tracking  FROM anon;
REVOKE ALL ON incidents                FROM anon;
REVOKE ALL ON daep_placement_scheduling FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_kiosk_daily_behavior
--    Returns today's check-in record for a student (used by useDailyBehavior hook)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_kiosk_daily_behavior(
  p_student_id UUID,
  p_date       DATE
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row daily_behavior_tracking%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM daily_behavior_tracking
  WHERE student_id = p_student_id
    AND tracking_date = p_date;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION get_kiosk_daily_behavior(UUID, DATE) TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. kiosk_check_in
--    Inserts or deduplicates a daily check-in record.
--    Returns {tracking_id UUID, already_checked_in BOOLEAN}
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION kiosk_check_in(
  p_student_id      UUID,
  p_campus_id       UUID,
  p_district_id     UUID,
  p_phone_bag_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_date DATE        := CURRENT_DATE;
  v_now  TIMESTAMPTZ := now();
  v_existing_id UUID;
  v_new_id      UUID;
BEGIN
  -- Check for existing record
  SELECT id INTO v_existing_id
  FROM daily_behavior_tracking
  WHERE student_id = p_student_id AND tracking_date = v_date;

  IF v_existing_id IS NOT NULL THEN
    -- Already checked in — update bag number if a new one was provided
    IF p_phone_bag_number IS NOT NULL THEN
      UPDATE daily_behavior_tracking
      SET phone_bag_number = p_phone_bag_number
      WHERE id = v_existing_id;
    END IF;
    RETURN jsonb_build_object('tracking_id', v_existing_id, 'already_checked_in', true);
  END IF;

  -- Insert new check-in record, handle race condition via unique constraint
  BEGIN
    INSERT INTO daily_behavior_tracking (
      student_id, campus_id, district_id, tracking_date,
      check_in_time, status, period_scores, phone_bag_number
    )
    VALUES (
      p_student_id, p_campus_id, p_district_id, v_date,
      v_now, 'checked_in', '{}'::jsonb, p_phone_bag_number
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('tracking_id', v_new_id, 'already_checked_in', false);

  EXCEPTION WHEN unique_violation THEN
    -- Race condition: another request inserted first
    SELECT id INTO v_existing_id
    FROM daily_behavior_tracking
    WHERE student_id = p_student_id AND tracking_date = v_date;

    RETURN jsonb_build_object('tracking_id', v_existing_id, 'already_checked_in', true);
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION kiosk_check_in(UUID, UUID, UUID, TEXT) TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. get_kiosk_student_status
--    One call that returns everything the kiosk needs after authentication:
--      - Active DAEP placement (if any)
--      - Days served count within the placement period
--      - Today's check-in record (if any)
--      - Behavior goals from most recent completed orientation (if any)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_kiosk_student_status(
  p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_placement         RECORD;
  v_days_served       INTEGER := 0;
  v_today_record      RECORD;
  v_behavior_goals    JSONB;
BEGIN
  -- Active DAEP/expulsion placement
  SELECT id, consequence_type, consequence_days, consequence_start, consequence_end, status
  INTO v_placement
  FROM incidents
  WHERE student_id = p_student_id
    AND status IN ('active', 'approved', 'compliance_hold')
    AND consequence_type IN ('daep', 'expulsion')
  ORDER BY consequence_start DESC NULLS LAST
  LIMIT 1;

  -- Days served = check-in count within the placement window
  IF v_placement.id IS NOT NULL AND v_placement.consequence_start IS NOT NULL THEN
    SELECT COUNT(*) INTO v_days_served
    FROM daily_behavior_tracking
    WHERE student_id = p_student_id
      AND tracking_date >= v_placement.consequence_start
      AND (v_placement.consequence_end IS NULL OR tracking_date <= v_placement.consequence_end);
  END IF;

  -- Today's check-in record
  SELECT id, status, phone_bag_number, check_in_time
  INTO v_today_record
  FROM daily_behavior_tracking
  WHERE student_id = p_student_id
    AND tracking_date = CURRENT_DATE;

  -- Behavior goals from most recent completed orientation
  SELECT orientation_form_data -> 'behavior_plan'
  INTO v_behavior_goals
  FROM daep_placement_scheduling
  WHERE student_id = p_student_id
    AND orientation_status = 'completed'
    AND orientation_form_data IS NOT NULL
    AND orientation_form_data ? 'behavior_plan'
  ORDER BY orientation_completed_date DESC NULLS LAST
  LIMIT 1;

  RETURN jsonb_build_object(
    'placement', CASE WHEN v_placement.id IS NOT NULL THEN jsonb_build_object(
      'id',                v_placement.id,
      'consequence_type',  v_placement.consequence_type,
      'consequence_days',  v_placement.consequence_days,
      'consequence_start', v_placement.consequence_start,
      'consequence_end',   v_placement.consequence_end,
      'status',            v_placement.status
    ) ELSE NULL END,
    'days_served',   v_days_served,
    'today_record', CASE WHEN v_today_record.id IS NOT NULL THEN jsonb_build_object(
      'id',               v_today_record.id,
      'status',           v_today_record.status,
      'phone_bag_number', v_today_record.phone_bag_number,
      'check_in_time',    v_today_record.check_in_time
    ) ELSE NULL END,
    'behavior_goals', v_behavior_goals
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_kiosk_student_status(UUID) TO anon;
