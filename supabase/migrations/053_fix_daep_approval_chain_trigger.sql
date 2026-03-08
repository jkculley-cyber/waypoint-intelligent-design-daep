-- Migration 053: Fix trg_create_daep_approval_chain
--
-- Bug in migration 016: fn_create_daep_approval_chain() was updated but:
--   1. Still fires as BEFORE trigger — can't INSERT into daep_approval_chains
--      with incident_id = NEW.id before the incident exists (FK violation)
--   2. Missing student_id in daep_approval_chains INSERT (NOT NULL violation)
--   3. Missing district_id in daep_approval_steps INSERTs (NOT NULL violation)
--
-- Fix: change trigger to AFTER INSERT, add missing columns.

CREATE OR REPLACE FUNCTION fn_create_daep_approval_chain()
RETURNS TRIGGER AS $$
DECLARE
  chain_id       UUID;
  student_record RECORD;
BEGIN
  -- Only fire for DAEP placements
  IF NEW.consequence_type != 'daep' THEN
    RETURN NULL;
  END IF;

  -- Skip if chain already exists for this incident
  IF EXISTS (SELECT 1 FROM daep_approval_chains WHERE incident_id = NEW.id) THEN
    RETURN NULL;
  END IF;

  -- Get student SPED/504 flags for conditional steps
  SELECT is_sped, is_504 INTO student_record
  FROM students WHERE id = NEW.student_id;

  -- Create the approval chain
  INSERT INTO daep_approval_chains (
    district_id, incident_id, student_id, submitted_by,
    chain_status, current_step
  ) VALUES (
    NEW.district_id, NEW.id, NEW.student_id,
    COALESCE(NEW.reported_by, NEW.student_id),  -- fallback safeguard
    'in_progress', 1
  ) RETURNING id INTO chain_id;

  -- Link chain back to incident
  UPDATE incidents SET approval_chain_id = chain_id WHERE id = NEW.id;

  -- Step 1: Campus Behavior Coordinator (always required, starts in waiting)
  INSERT INTO daep_approval_steps (chain_id, district_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, NEW.district_id, 1, 'cbc', 'Campus Behavior Coordinator', 'waiting', true);

  -- Step 2: Counselor (always required)
  INSERT INTO daep_approval_steps (chain_id, district_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, NEW.district_id, 2, 'counselor', 'Counselor', 'pending', true);

  -- Step 3: Special Education (conditional on is_sped)
  INSERT INTO daep_approval_steps (chain_id, district_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, NEW.district_id, 3, 'sped_coordinator', 'Special Education',
    CASE WHEN COALESCE(student_record.is_sped, false) THEN 'pending' ELSE 'skipped' END,
    COALESCE(student_record.is_sped, false));

  -- Step 4: Section 504 (conditional on is_504)
  INSERT INTO daep_approval_steps (chain_id, district_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, NEW.district_id, 4, 'section_504_coordinator', 'Section 504',
    CASE WHEN COALESCE(student_record.is_504, false) THEN 'pending' ELSE 'skipped' END,
    COALESCE(student_record.is_504, false));

  -- Step 5: Student Support Specialist (always required)
  INSERT INTO daep_approval_steps (chain_id, district_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, NEW.district_id, 5, 'sss', 'Student Support Specialist', 'pending', true);

  -- Step 6: Director of Student Affairs (always required)
  INSERT INTO daep_approval_steps (chain_id, district_id, step_order, step_role, step_label, status, is_required)
  VALUES (chain_id, NEW.district_id, 6, 'director_student_affairs', 'Director of Student Affairs', 'pending', true);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate as AFTER INSERT (not BEFORE) so the incident row exists
-- when we INSERT into daep_approval_chains with incident_id FK
DROP TRIGGER IF EXISTS trg_create_daep_approval_chain ON incidents;
CREATE TRIGGER trg_create_daep_approval_chain
  AFTER INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION fn_create_daep_approval_chain();
