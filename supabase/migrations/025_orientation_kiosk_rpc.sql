-- Migration 025: Secure SECURITY DEFINER RPCs for orientation kiosk
-- Replaces fragile two-step anon lookup (student → scheduling) with single calls.
-- Also applies migration 018 RLS policies if not already present.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Apply migration 018 orientation kiosk RLS (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daep_placement_scheduling'
      AND policyname = 'Kiosk can view scheduled orientations'
  ) THEN
    EXECUTE '
      CREATE POLICY "Kiosk can view scheduled orientations"
        ON daep_placement_scheduling FOR SELECT TO anon
        USING (orientation_status IN (''scheduled'', ''completed'', ''pending'', ''missed''))
    ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daep_placement_scheduling'
      AND policyname = 'Kiosk can complete orientations'
  ) THEN
    EXECUTE '
      CREATE POLICY "Kiosk can complete orientations"
        ON daep_placement_scheduling FOR UPDATE TO anon
        USING (orientation_status IN (''scheduled'', ''pending'', ''missed''))
        WITH CHECK (orientation_status IN (''scheduled'', ''completed'', ''pending'', ''missed''))
    ';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Combined lookup: student + orientation in one SECURITY DEFINER call
--    No is_active filter — students awaiting orientation may have any active state.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lookup_orientation_for_kiosk(
  p_student_id_number TEXT
)
RETURNS TABLE (
  student_id              UUID,
  first_name              TEXT,
  last_name               TEXT,
  student_id_number       TEXT,
  grade_level             TEXT,
  scheduling_id           UUID,
  orientation_scheduled_date  DATE,
  orientation_scheduled_time  TEXT,
  orientation_status      TEXT,
  orientation_completed_date  DATE,
  orientation_form_data   JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.student_id_number,
    s.grade_level::TEXT,
    ps.id,
    ps.orientation_scheduled_date,
    ps.orientation_scheduled_time,
    ps.orientation_status::TEXT,
    ps.orientation_completed_date,
    ps.orientation_form_data
  FROM students s
  JOIN daep_placement_scheduling ps ON ps.student_id = s.id
  WHERE s.student_id_number = p_student_id_number
    AND ps.orientation_status IN ('scheduled', 'completed', 'pending', 'missed')
  ORDER BY
    -- Prefer scheduled/pending (not yet done), then missed, then completed
    CASE ps.orientation_status
      WHEN 'scheduled' THEN 1
      WHEN 'pending'   THEN 2
      WHEN 'missed'    THEN 3
      WHEN 'completed' THEN 4
      ELSE 5
    END,
    ps.orientation_scheduled_date ASC NULLS LAST
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_orientation_for_kiosk(TEXT) TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Secure UPDATE: mark orientation completed via SECURITY DEFINER
--    Kiosk never touches the table directly for writes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION complete_orientation_for_kiosk(
  p_scheduling_id UUID,
  p_form_data     JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rows INT;
BEGIN
  UPDATE daep_placement_scheduling
  SET
    orientation_status          = 'completed',
    orientation_completed_date  = CURRENT_DATE,
    orientation_form_data       = COALESCE(p_form_data, orientation_form_data)
  WHERE id = p_scheduling_id
    AND orientation_status IN ('scheduled', 'pending', 'missed');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_orientation_for_kiosk(UUID, JSONB) TO anon;
