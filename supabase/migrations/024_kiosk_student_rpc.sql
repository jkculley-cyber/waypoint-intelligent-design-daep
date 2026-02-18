-- Migration 024: Secure kiosk student lookup via SECURITY DEFINER RPC
-- Prevents anonymous callers from directly querying the students table.
-- The anon role calls this function; the function runs as the defining user
-- and returns only the minimal fields needed for kiosk authentication.

CREATE OR REPLACE FUNCTION lookup_student_for_kiosk(
  p_student_id_number TEXT,
  p_campus_id         UUID DEFAULT NULL
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
      AND (p_campus_id IS NULL OR s.campus_id = p_campus_id)
    LIMIT 1;
END;
$$;

-- Allow the anon role to execute this function only
GRANT EXECUTE ON FUNCTION lookup_student_for_kiosk(TEXT, UUID) TO anon;

-- Revoke direct SELECT on students from anon (belt-and-suspenders — RLS still applies,
-- but this makes the intent explicit for the kiosk use-case)
-- NOTE: Only run this if anonymous students SELECT is not needed elsewhere.
-- Uncomment when confirmed:
-- REVOKE SELECT ON students FROM anon;
