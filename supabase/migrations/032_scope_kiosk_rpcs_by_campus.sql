-- Migration 032: Scope kiosk RPCs by campus
-- Closes remaining enumeration vectors in the SECURITY DEFINER kiosk RPCs.
--
-- BEFORE (migration 030 state):
--   • lookup_student_for_kiosk — p_campus_id had DEFAULT NULL, allowing
--     cross-district student enumeration with no campus supplied
--   • get_kiosk_student_status(UUID) — accepted any student UUID with zero
--     campus/district validation; attacker with any UUID gets full DAEP
--     placement, behavior goals, and check-in history
--   • get_kiosk_daily_behavior(UUID, DATE) — same; no campus check
--   • kiosk_check_in — accepted caller-supplied p_district_id with no
--     DB validation; attacker could record check-ins against any district
--
-- AFTER:
--   • lookup_student_for_kiosk — campus required; NULL → no rows returned
--   • get_kiosk_student_status(UUID, UUID) — validates student.campus_id
--     matches p_campus_id before returning any data; returns NULL otherwise
--   • get_kiosk_daily_behavior(UUID, DATE, UUID) — same campus validation
--   • kiosk_check_in(UUID, UUID, TEXT) — fetches district_id from students
--     table; validates student.campus_id = p_campus_id before inserting

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. lookup_student_for_kiosk — make campus_id mandatory
--    Must DROP first because PostgreSQL won't let CREATE OR REPLACE remove
--    an existing parameter default (DEFAULT NULL → no default).
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS lookup_student_for_kiosk(TEXT, UUID);

CREATE FUNCTION lookup_student_for_kiosk(
  p_student_id_number TEXT,
  p_campus_id         UUID    -- DEFAULT NULL removed; NULL → no rows returned
)
RETURNS TABLE (
  id                UUID,
  first_name        TEXT,
  last_name         TEXT,
  student_id_number TEXT,
  grade_level       TEXT,
  campus_id         UUID,
  district_id       UUID,
  is_sped           BOOLEAN,
  is_504            BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require campus_id — a NULL campus means the kiosk is misconfigured
  IF p_campus_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.student_id_number,
      s.grade_level,
      s.campus_id,
      s.district_id,
      s.is_sped,
      s.is_504
    FROM students s
    WHERE s.student_id_number = p_student_id_number
      AND s.is_active = true
      AND s.campus_id = p_campus_id   -- strict match; removed (IS NULL OR ...) bypass
    LIMIT 1;
END;
$$;

-- Grant unchanged (same signature as migration 024)
GRANT EXECUTE ON FUNCTION lookup_student_for_kiosk(TEXT, UUID) TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_kiosk_student_status — add campus validation
--    Signature changes: (UUID) → (UUID, UUID); must DROP old first
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_kiosk_student_status(UUID);

CREATE FUNCTION get_kiosk_student_status(
  p_student_id UUID,
  p_campus_id  UUID
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
  -- Campus gate: student must exist, be active, and belong to the claimed campus.
  -- Returning NULL (not raising) gives the same result as "student not found" —
  -- the kiosk shows no placement data rather than exposing an error path.
  PERFORM id
  FROM students
  WHERE id = p_student_id
    AND campus_id = p_campus_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

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

GRANT EXECUTE ON FUNCTION get_kiosk_student_status(UUID, UUID) TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. get_kiosk_daily_behavior — add campus validation
--    Signature changes: (UUID, DATE) → (UUID, DATE, UUID); must DROP old first
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_kiosk_daily_behavior(UUID, DATE);

CREATE FUNCTION get_kiosk_daily_behavior(
  p_student_id UUID,
  p_date       DATE,
  p_campus_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row daily_behavior_tracking%ROWTYPE;
BEGIN
  -- Campus gate: verify student belongs to the claimed campus before returning data
  PERFORM id
  FROM students
  WHERE id = p_student_id
    AND campus_id = p_campus_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

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

GRANT EXECUTE ON FUNCTION get_kiosk_daily_behavior(UUID, DATE, UUID) TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. kiosk_check_in — remove caller-supplied district_id; fetch from DB
--    Signature changes: (UUID,UUID,UUID,TEXT) → (UUID,UUID,TEXT); DROP old first
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS kiosk_check_in(UUID, UUID, UUID, TEXT);

CREATE FUNCTION kiosk_check_in(
  p_student_id       UUID,
  p_campus_id        UUID,
  p_phone_bag_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_date              DATE        := CURRENT_DATE;
  v_now               TIMESTAMPTZ := now();
  v_student_campus_id UUID;
  v_district_id       UUID;
  v_existing_id       UUID;
  v_new_id            UUID;
BEGIN
  -- Fetch campus and district from DB — never trust caller-supplied values.
  -- Also validates the student exists and is active.
  SELECT campus_id, district_id
  INTO v_student_campus_id, v_district_id
  FROM students
  WHERE id = p_student_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = 'P0001';
  END IF;

  -- Validate claimed campus matches actual campus
  IF v_student_campus_id <> p_campus_id THEN
    RAISE EXCEPTION 'Campus mismatch' USING ERRCODE = 'P0001';
  END IF;

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
      p_student_id, v_student_campus_id, v_district_id, v_date,
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

GRANT EXECUTE ON FUNCTION kiosk_check_in(UUID, UUID, TEXT) TO anon;
