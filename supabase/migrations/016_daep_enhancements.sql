-- Migration 016: DAEP Approval Flow Enhancements
-- Adds director_student_affairs role, step 6 in approval chain,
-- document storage bucket, placement scheduling table, and triggers.

-- ============================================
-- A. Add director_student_affairs role
-- ============================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'admin', 'principal', 'ap', 'counselor', 'sped_coordinator',
    'teacher', 'cbc', 'sss', 'section_504_coordinator',
    'parent', 'student', 'director_student_affairs'
  )
);

-- ============================================
-- B. Update approval chain constraints
-- ============================================
-- Allow director_student_affairs in step_role
ALTER TABLE daep_approval_steps DROP CONSTRAINT IF EXISTS daep_approval_steps_step_role_check;
ALTER TABLE daep_approval_steps ADD CONSTRAINT daep_approval_steps_step_role_check CHECK (
  step_role IN (
    'cbc', 'counselor', 'sped_coordinator', 'section_504_coordinator',
    'sss', 'director_student_affairs'
  )
);

-- Allow step_order up to 6
ALTER TABLE daep_approval_steps DROP CONSTRAINT IF EXISTS daep_approval_steps_step_order_check;
ALTER TABLE daep_approval_steps ADD CONSTRAINT daep_approval_steps_step_order_check CHECK (
  step_order >= 1 AND step_order <= 6
);

-- ============================================
-- C. Create Supabase Storage bucket for DAEP documents
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'daep-documents',
  'daep-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
-- Staff in district can view documents
CREATE POLICY "District staff can view DAEP documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'daep-documents'
    AND auth.role() = 'authenticated'
  );

-- Staff who can create incidents can upload documents
CREATE POLICY "Staff can upload DAEP documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'daep-documents'
    AND auth.role() = 'authenticated'
  );

-- Owners can delete their uploaded documents
CREATE POLICY "Owners can delete DAEP documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'daep-documents'
    AND auth.uid() = owner
  );

-- ============================================
-- D. Create daep_placement_scheduling table
-- ============================================
CREATE TABLE IF NOT EXISTS daep_placement_scheduling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  -- ARD (SPED only)
  ard_required BOOLEAN NOT NULL DEFAULT false,
  ard_scheduled_date DATE,
  ard_status TEXT CHECK (ard_status IN ('pending', 'scheduled', 'completed')) DEFAULT 'pending',
  ard_completed_date DATE,
  ard_notes TEXT,
  -- Orientation (all students)
  orientation_scheduled_date DATE,
  orientation_status TEXT CHECK (orientation_status IN ('pending', 'scheduled', 'completed')) DEFAULT 'pending',
  orientation_completed_date DATE,
  orientation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_scheduling_incident UNIQUE (incident_id)
);

-- RLS for daep_placement_scheduling
ALTER TABLE daep_placement_scheduling ENABLE ROW LEVEL SECURITY;

-- District-scoped SELECT
CREATE POLICY "District staff can view scheduling"
  ON daep_placement_scheduling FOR SELECT
  USING (
    district_id IN (
      SELECT district_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Authorized roles can UPDATE
CREATE POLICY "Authorized staff can update scheduling"
  ON daep_placement_scheduling FOR UPDATE
  USING (
    district_id IN (
      SELECT district_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'principal', 'ap', 'counselor', 'sped_coordinator', 'director_student_affairs')
    )
  );

-- Allow INSERT for trigger function (SECURITY DEFINER)
CREATE POLICY "System can insert scheduling"
  ON daep_placement_scheduling FOR INSERT
  WITH CHECK (true);

-- ============================================
-- E. Replace fn_create_daep_approval_chain()
--    Add Step 6: Director of Student Affairs
-- ============================================
CREATE OR REPLACE FUNCTION fn_create_daep_approval_chain()
RETURNS TRIGGER AS $$
DECLARE
  chain_id UUID;
  student_record RECORD;
BEGIN
  -- Only fire for DAEP consequence_type on insert
  IF NEW.consequence_type != 'daep' THEN
    RETURN NEW;
  END IF;

  -- Get student details for conditional steps
  SELECT is_sped, is_504 INTO student_record
  FROM students WHERE id = NEW.student_id;

  -- Create the approval chain
  INSERT INTO daep_approval_chains (district_id, incident_id, chain_status, current_step)
  VALUES (NEW.district_id, NEW.id, 'in_progress', 1)
  RETURNING id INTO chain_id;

  -- Update the incident with the chain reference
  UPDATE incidents SET approval_chain_id = chain_id WHERE id = NEW.id;

  -- Step 1: Campus Behavior Coordinator (always required)
  INSERT INTO daep_approval_steps (chain_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, 1, 'cbc', 'Campus Behavior Coordinator', 'pending', true);

  -- Step 2: Counselor (always required)
  INSERT INTO daep_approval_steps (chain_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, 2, 'counselor', 'Counselor', 'waiting', true);

  -- Step 3: Special Education (conditional on is_sped)
  INSERT INTO daep_approval_steps (chain_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, 3, 'sped_coordinator', 'Special Education',
    CASE WHEN student_record.is_sped THEN 'waiting' ELSE 'skipped' END,
    student_record.is_sped);

  -- Step 4: Section 504 (conditional on is_504)
  INSERT INTO daep_approval_steps (chain_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, 4, 'section_504_coordinator', 'Section 504',
    CASE WHEN student_record.is_504 THEN 'waiting' ELSE 'skipped' END,
    student_record.is_504);

  -- Step 5: Student Support Specialist (always required)
  INSERT INTO daep_approval_steps (chain_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, 5, 'sss', 'Student Support Specialist', 'waiting', true);

  -- Step 6: Director of Student Affairs (always required)
  INSERT INTO daep_approval_steps (chain_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, 6, 'director_student_affairs', 'Director of Student Affairs', 'waiting', true);

  -- Set incident status to pending_approval
  UPDATE incidents SET status = 'pending_approval' WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- F. Create fn_create_daep_scheduling() trigger
--    Fires when incident status changes to 'approved' for DAEP
-- ============================================
CREATE OR REPLACE FUNCTION fn_create_daep_scheduling()
RETURNS TRIGGER AS $$
DECLARE
  student_is_sped BOOLEAN;
BEGIN
  -- Only fire when status changes to 'approved' and consequence is DAEP
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.consequence_type = 'daep' THEN
    -- Check if student is SPED
    SELECT is_sped INTO student_is_sped
    FROM students WHERE id = NEW.student_id;

    -- Create scheduling record (upsert to avoid duplicates)
    INSERT INTO daep_placement_scheduling (
      district_id, incident_id, student_id, ard_required,
      ard_status, orientation_status
    )
    VALUES (
      NEW.district_id, NEW.id, NEW.student_id,
      COALESCE(student_is_sped, false),
      CASE WHEN COALESCE(student_is_sped, false) THEN 'pending' ELSE 'pending' END,
      'pending'
    )
    ON CONFLICT (incident_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_create_daep_scheduling ON incidents;
CREATE TRIGGER trg_create_daep_scheduling
  AFTER UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION fn_create_daep_scheduling();
