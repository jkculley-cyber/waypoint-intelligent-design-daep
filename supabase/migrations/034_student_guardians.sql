-- Migration 034: Multi-guardian support
-- Creates student_guardians table with portal access linking

CREATE TABLE IF NOT EXISTS student_guardians (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  district_id      UUID NOT NULL REFERENCES districts(id),
  guardian_name    TEXT NOT NULL,
  relationship     TEXT NOT NULL CHECK (relationship IN ('mother','father','grandparent','guardian','step_parent','other')),
  email            TEXT,
  phone            TEXT,
  is_primary       BOOLEAN DEFAULT false,
  has_portal_access BOOLEAN DEFAULT false,
  portal_user_id   UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by student
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON student_guardians(student_id);
-- Index for portal login lookup
CREATE INDEX IF NOT EXISTS idx_student_guardians_portal_user ON student_guardians(portal_user_id) WHERE portal_user_id IS NOT NULL;

-- RLS
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;

-- Staff can read guardians in their district
CREATE POLICY "staff_read_district" ON student_guardians
  FOR SELECT
  USING (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()));

-- Staff (admin/principal/AP) can insert/update/delete
CREATE POLICY "staff_write_district" ON student_guardians
  FOR ALL
  USING (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()));

-- Parent users: can read their own guardian records (via portal_user_id)
CREATE POLICY "guardian_read_own" ON student_guardians
  FOR SELECT
  USING (portal_user_id = auth.uid());

-- Track updated_at
CREATE OR REPLACE FUNCTION update_student_guardians_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_student_guardians_updated_at
  BEFORE UPDATE ON student_guardians
  FOR EACH ROW EXECUTE FUNCTION update_student_guardians_updated_at();
