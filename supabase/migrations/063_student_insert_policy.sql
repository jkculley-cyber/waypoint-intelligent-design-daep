-- Migration 063: Allow campus leadership to add students
-- Previously only admin role could insert students. Principal, AP, and counselor
-- need insert access to quick-add students during incident referral.

CREATE POLICY "Campus leadership can add students at their campuses"
  ON students FOR INSERT
  WITH CHECK (
    district_id = public.user_district_id()
    AND campus_id = ANY(public.user_campus_ids())
    AND public.user_role() IN ('principal', 'ap', 'counselor')
  );
