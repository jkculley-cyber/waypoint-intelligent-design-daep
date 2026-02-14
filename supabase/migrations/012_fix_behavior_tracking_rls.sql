-- Migration 012: Fix daily_behavior_tracking RLS for DAEP admins
-- Problem: Staff can only see behavior tracking records where campus_id matches
-- their assigned campuses. DAEP admins need to see ALL check-ins in their district
-- because students check in at the DAEP campus but records may be stored under
-- their home campus. Admins need district-wide visibility.

-- Drop the overly restrictive staff policy
DROP POLICY IF EXISTS "Staff can manage behavior tracking at their campuses" ON daily_behavior_tracking;

-- New policy: Staff can view ALL behavior tracking in their district
CREATE POLICY "Staff can view district behavior tracking"
  ON daily_behavior_tracking FOR SELECT
  USING (
    district_id = public.user_district_id()
  );

-- Staff can insert/update behavior tracking in their district
CREATE POLICY "Staff can manage district behavior tracking"
  ON daily_behavior_tracking FOR INSERT
  WITH CHECK (
    district_id = public.user_district_id()
  );

CREATE POLICY "Staff can update district behavior tracking"
  ON daily_behavior_tracking FOR UPDATE
  USING (
    district_id = public.user_district_id()
  );

CREATE POLICY "Staff can delete district behavior tracking"
  ON daily_behavior_tracking FOR DELETE
  USING (
    district_id = public.user_district_id()
  );
