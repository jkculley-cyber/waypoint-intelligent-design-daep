-- Migration 019: Allow admins to update their district record
-- The districts table had no UPDATE policy, silently blocking settings saves.

CREATE POLICY "Admins can update their district"
  ON districts FOR UPDATE
  USING (id = public.user_district_id() AND public.user_role() = 'admin');
