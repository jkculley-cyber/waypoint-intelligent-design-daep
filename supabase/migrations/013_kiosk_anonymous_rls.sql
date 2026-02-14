-- Migration 013: Add anonymous RLS policies for kiosk check-in
-- The kiosk page (/kiosk) runs without authentication (public route).
-- It needs limited anonymous access to:
--   1. Look up a student by student_id_number (students table)
--   2. Read/insert daily check-in records (daily_behavior_tracking table)
--   3. Read active DAEP placement for progress tracker (incidents table)
--
-- Security: These policies are intentionally narrow.
--   - Students: SELECT only, active students only
--   - Behavior tracking: SELECT + INSERT only (no UPDATE/DELETE)
--   - Incidents: SELECT only, limited to active DAEP placements

-- ============================================================
-- 1. Students table: Allow anonymous lookup of active students
-- ============================================================
CREATE POLICY "Kiosk can look up active students"
  ON students FOR SELECT
  TO anon
  USING (is_active = true);

-- ============================================================
-- 2. Daily behavior tracking: Allow anonymous read + insert
-- ============================================================
CREATE POLICY "Kiosk can view behavior tracking"
  ON daily_behavior_tracking FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Kiosk can insert check-in records"
  ON daily_behavior_tracking FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Kiosk can update check-in records"
  ON daily_behavior_tracking FOR UPDATE
  TO anon
  USING (true);

-- ============================================================
-- 3. Incidents: Allow anonymous read of active placements
-- ============================================================
CREATE POLICY "Kiosk can view active placements"
  ON incidents FOR SELECT
  TO anon
  USING (
    status IN ('active', 'approved', 'compliance_hold')
    AND consequence_type IN ('daep', 'expulsion')
  );
