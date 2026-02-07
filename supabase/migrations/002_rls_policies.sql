-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_campus_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE offense_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipline_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE transition_plan_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_behavior_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper Functions
-- ============================================

CREATE OR REPLACE FUNCTION public.user_district_id()
RETURNS UUID AS $$
  SELECT district_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_campus_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(campus_id), '{}')
  FROM public.profile_campus_assignments
  WHERE profile_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Districts
-- ============================================
CREATE POLICY "Users can view their own district"
  ON districts FOR SELECT
  USING (id = public.user_district_id());

-- ============================================
-- Campuses
-- ============================================
CREATE POLICY "Users can view campuses in their district"
  ON campuses FOR SELECT
  USING (district_id = public.user_district_id());

CREATE POLICY "Admins can manage campuses"
  ON campuses FOR ALL
  USING (district_id = public.user_district_id() AND public.user_role() = 'admin');

-- ============================================
-- Profiles
-- ============================================
CREATE POLICY "Users can view profiles in their district"
  ON profiles FOR SELECT
  USING (district_id = public.user_district_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL
  USING (district_id = public.user_district_id() AND public.user_role() = 'admin');

-- ============================================
-- Profile Campus Assignments
-- ============================================
CREATE POLICY "Users can view their own assignments"
  ON profile_campus_assignments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all assignments in district"
  ON profile_campus_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_campus_assignments.profile_id
        AND p.district_id = public.user_district_id()
    )
    AND public.user_role() = 'admin'
  );

CREATE POLICY "Admins can manage assignments"
  ON profile_campus_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_campus_assignments.profile_id
        AND p.district_id = public.user_district_id()
    )
    AND public.user_role() = 'admin'
  );

-- ============================================
-- Students
-- ============================================
CREATE POLICY "Admin can manage all students in district"
  ON students FOR ALL
  USING (district_id = public.user_district_id() AND public.user_role() = 'admin');

CREATE POLICY "Staff can view students at their campuses"
  ON students FOR SELECT
  USING (
    district_id = public.user_district_id()
    AND campus_id = ANY(public.user_campus_ids())
    AND public.user_role() IN ('principal','ap','counselor','sped_coordinator','teacher')
  );

CREATE POLICY "Parents can view their own children"
  ON students FOR SELECT
  USING (parent_profile_id = auth.uid());

-- ============================================
-- Offense Codes
-- ============================================
CREATE POLICY "Anyone in district can view offense codes"
  ON offense_codes FOR SELECT
  USING (district_id = public.user_district_id() OR district_id IS NULL);

CREATE POLICY "Admins can manage offense codes"
  ON offense_codes FOR ALL
  USING (
    (district_id = public.user_district_id() OR district_id IS NULL)
    AND public.user_role() = 'admin'
  );

-- ============================================
-- Discipline Matrix
-- ============================================
CREATE POLICY "Staff can view matrix"
  ON discipline_matrix FOR SELECT
  USING (district_id = public.user_district_id());

CREATE POLICY "Admins can manage matrix"
  ON discipline_matrix FOR ALL
  USING (district_id = public.user_district_id() AND public.user_role() = 'admin');

-- ============================================
-- Incidents
-- ============================================
CREATE POLICY "Admin can manage all incidents"
  ON incidents FOR ALL
  USING (district_id = public.user_district_id() AND public.user_role() = 'admin');

CREATE POLICY "Staff can view incidents at their campuses"
  ON incidents FOR SELECT
  USING (
    district_id = public.user_district_id()
    AND campus_id = ANY(public.user_campus_ids())
    AND public.user_role() IN ('principal','ap','counselor','sped_coordinator','teacher')
  );

CREATE POLICY "Staff can create incidents at their campuses"
  ON incidents FOR INSERT
  WITH CHECK (
    district_id = public.user_district_id()
    AND campus_id = ANY(public.user_campus_ids())
    AND reported_by = auth.uid()
    AND public.user_role() IN ('principal','ap','counselor','sped_coordinator','teacher')
  );

CREATE POLICY "Principals and APs can update incidents"
  ON incidents FOR UPDATE
  USING (
    district_id = public.user_district_id()
    AND campus_id = ANY(public.user_campus_ids())
    AND public.user_role() IN ('principal','ap')
  );

CREATE POLICY "Parents can view their children's incidents"
  ON incidents FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE parent_profile_id = auth.uid())
  );

-- ============================================
-- Compliance Checklists
-- ============================================
CREATE POLICY "Compliance roles can manage checklists"
  ON compliance_checklists FOR ALL
  USING (
    district_id = public.user_district_id()
    AND public.user_role() IN ('admin','principal','ap','sped_coordinator')
  );

CREATE POLICY "Staff can view checklists at their campuses"
  ON compliance_checklists FOR SELECT
  USING (
    district_id = public.user_district_id()
    AND public.user_role() IN ('counselor','teacher')
    AND incident_id IN (
      SELECT id FROM incidents WHERE campus_id = ANY(public.user_campus_ids())
    )
  );

-- ============================================
-- Alerts
-- ============================================
CREATE POLICY "Alert roles can view and manage alerts"
  ON alerts FOR ALL
  USING (
    district_id = public.user_district_id()
    AND public.user_role() IN ('admin','principal','ap','counselor','sped_coordinator')
  );

-- ============================================
-- Interventions
-- ============================================
CREATE POLICY "Anyone can view interventions"
  ON interventions FOR SELECT
  USING (district_id = public.user_district_id() OR district_id IS NULL);

CREATE POLICY "Admins can manage interventions"
  ON interventions FOR ALL
  USING (
    (district_id = public.user_district_id() OR district_id IS NULL)
    AND public.user_role() = 'admin'
  );

-- ============================================
-- Student Interventions
-- ============================================
CREATE POLICY "Staff can view student interventions at their campuses"
  ON student_interventions FOR SELECT
  USING (
    district_id = public.user_district_id()
    AND student_id IN (
      SELECT id FROM students WHERE campus_id = ANY(public.user_campus_ids())
    )
  );

CREATE POLICY "Admin and leadership can manage interventions"
  ON student_interventions FOR ALL
  USING (
    district_id = public.user_district_id()
    AND public.user_role() IN ('admin','principal','ap','counselor','sped_coordinator')
  );

-- ============================================
-- Transition Plans
-- ============================================
CREATE POLICY "Staff can view plans at their campuses"
  ON transition_plans FOR SELECT
  USING (
    district_id = public.user_district_id()
    AND student_id IN (
      SELECT id FROM students WHERE campus_id = ANY(public.user_campus_ids())
    )
  );

CREATE POLICY "Admin and leadership can manage plans"
  ON transition_plans FOR ALL
  USING (
    district_id = public.user_district_id()
    AND public.user_role() IN ('admin','principal','ap','counselor','sped_coordinator')
  );

CREATE POLICY "Parents can view their children's plans"
  ON transition_plans FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE parent_profile_id = auth.uid())
  );

-- ============================================
-- Transition Plan Reviews
-- ============================================
CREATE POLICY "Staff can view reviews"
  ON transition_plan_reviews FOR SELECT
  USING (district_id = public.user_district_id());

CREATE POLICY "Leadership can manage reviews"
  ON transition_plan_reviews FOR ALL
  USING (
    district_id = public.user_district_id()
    AND public.user_role() IN ('admin','principal','ap','counselor','sped_coordinator')
  );

-- ============================================
-- Daily Behavior Tracking
-- ============================================
CREATE POLICY "Staff can manage behavior tracking at their campuses"
  ON daily_behavior_tracking FOR ALL
  USING (
    district_id = public.user_district_id()
    AND campus_id = ANY(public.user_campus_ids())
  );

CREATE POLICY "Parents can view their children's tracking"
  ON daily_behavior_tracking FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE parent_profile_id = auth.uid())
  );

-- ============================================
-- Notification Log
-- ============================================
CREATE POLICY "Users can view their own notifications"
  ON notification_log FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
  ON notification_log FOR SELECT
  USING (district_id = public.user_district_id() AND public.user_role() = 'admin');

-- ============================================
-- Audit Log
-- ============================================
CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  USING (district_id = public.user_district_id() AND public.user_role() = 'admin');

CREATE POLICY "System can insert audit entries"
  ON audit_log FOR INSERT
  WITH CHECK (district_id = public.user_district_id());
