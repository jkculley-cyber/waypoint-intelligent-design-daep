-- Migration 033: Kiosk second-factor (DOB/PIN) + parent acknowledgment column
-- Adds kiosk_pin to students, updates lookup_student_for_kiosk RPC,
-- and adds parent_acknowledged_at to incidents.

-- ─── 1. Add kiosk_pin column to students ─────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS kiosk_pin TEXT;

-- ─── 2. Add parent_acknowledged_at to incidents ───────────────────────────────
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS parent_acknowledged_at TIMESTAMPTZ;

-- ─── 3. Update lookup_student_for_kiosk RPC ───────────────────────────────────
-- Must DROP first because we're changing the parameter signature.
DROP FUNCTION IF EXISTS lookup_student_for_kiosk(TEXT, UUID);

CREATE OR REPLACE FUNCTION lookup_student_for_kiosk(
  p_student_id_number TEXT,
  p_campus_id         UUID    DEFAULT NULL,
  p_dob               DATE    DEFAULT NULL,
  p_pin               TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id                UUID,
  first_name        TEXT,
  last_name         TEXT,
  grade_level       INT,
  student_id_number TEXT,
  campus_id         UUID,
  date_of_birth     DATE,
  is_sped           BOOLEAN,
  is_504            BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.grade_level,
    s.student_id_number,
    s.campus_id,
    s.date_of_birth,
    s.is_sped,
    s.is_504
  FROM students s
  WHERE s.student_id_number = p_student_id_number
    AND s.is_active = TRUE
    AND (p_campus_id IS NULL OR s.campus_id = p_campus_id)
    -- DOB verification: only apply if caller provides it
    AND (p_dob IS NULL OR s.date_of_birth = p_dob)
    -- PIN verification: only apply if caller provides it
    AND (p_pin IS NULL OR s.kiosk_pin = p_pin)
  LIMIT 1;
END;
$$;

-- Grant execute to anon (kiosk runs without a session)
GRANT EXECUTE ON FUNCTION lookup_student_for_kiosk(TEXT, UUID, DATE, TEXT) TO anon;
