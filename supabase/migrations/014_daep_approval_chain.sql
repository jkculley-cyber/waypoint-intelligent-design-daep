-- ============================================
-- 014: DAEP Multi-Department Approval Chain
-- Replaces Laserfiche workflow with in-app
-- sequential approval: CBC → Counselor → SPED → 504 → SSS
-- ============================================

-- 1. Add new roles to profiles CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin','principal','ap','counselor','sped_coordinator','teacher','parent','student',
    'cbc','sss','section_504_coordinator'
  ));

-- 2. Add new incident statuses
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
  CHECK (status IN (
    'draft','submitted','under_review','compliance_hold',
    'approved','active','completed','appealed','overturned',
    'pending_approval','denied','returned'
  ));

-- 3. DAEP Approval Chains table
CREATE TABLE daep_approval_chains (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id       UUID NOT NULL REFERENCES districts(id),
  incident_id       UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id),
  current_step      TEXT,
  chain_status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (chain_status IN ('pending','in_progress','approved','denied','returned')),
  requires_sped     BOOLEAN NOT NULL DEFAULT false,
  requires_504      BOOLEAN NOT NULL DEFAULT false,
  submitted_by      UUID NOT NULL REFERENCES profiles(id),
  denied_by         UUID REFERENCES profiles(id),
  denied_at         TIMESTAMPTZ,
  denied_reason     TEXT,
  returned_by       UUID REFERENCES profiles(id),
  returned_at       TIMESTAMPTZ,
  return_reason     TEXT,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_chain_incident UNIQUE (incident_id)
);
CREATE INDEX idx_approval_chains_district ON daep_approval_chains(district_id);
CREATE INDEX idx_approval_chains_incident ON daep_approval_chains(incident_id);
CREATE INDEX idx_approval_chains_student ON daep_approval_chains(student_id);
CREATE INDEX idx_approval_chains_status ON daep_approval_chains(chain_status);

-- 4. DAEP Approval Steps table
CREATE TABLE daep_approval_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id          UUID NOT NULL REFERENCES daep_approval_chains(id) ON DELETE CASCADE,
  district_id       UUID NOT NULL REFERENCES districts(id),
  step_role         TEXT NOT NULL
                    CHECK (step_role IN ('cbc','counselor','sped_coordinator','section_504_coordinator','sss')),
  step_order        INTEGER NOT NULL CHECK (step_order BETWEEN 1 AND 5),
  step_label        TEXT NOT NULL,
  is_conditional    BOOLEAN NOT NULL DEFAULT false,
  is_required       BOOLEAN NOT NULL DEFAULT true,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','waiting','approved','denied','returned','skipped')),
  acted_by          UUID REFERENCES profiles(id),
  acted_at          TIMESTAMPTZ,
  comments          TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_approval_steps_chain ON daep_approval_steps(chain_id);
CREATE INDEX idx_approval_steps_status ON daep_approval_steps(status);
CREATE INDEX idx_approval_steps_role ON daep_approval_steps(step_role);

-- 5. FK on incidents for approval chain (named constraint for PostgREST disambiguation)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS approval_chain_id UUID;
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_approval_chain
  FOREIGN KEY (approval_chain_id) REFERENCES daep_approval_chains(id);
CREATE INDEX idx_incidents_approval_chain ON incidents(approval_chain_id) WHERE approval_chain_id IS NOT NULL;

-- ============================================
-- 6. Postgres function: process_approval_step
-- ============================================
CREATE OR REPLACE FUNCTION process_approval_step(
  p_step_id UUID,
  p_action TEXT,
  p_user_id UUID,
  p_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_step RECORD;
  v_chain RECORD;
  v_next_step RECORD;
  v_result JSONB;
BEGIN
  -- Lock and fetch the step
  SELECT * INTO v_step FROM daep_approval_steps WHERE id = p_step_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval step not found';
  END IF;

  IF v_step.status != 'waiting' THEN
    RAISE EXCEPTION 'Step is not in waiting status (current: %)', v_step.status;
  END IF;

  -- Fetch the chain
  SELECT * INTO v_chain FROM daep_approval_chains WHERE id = v_step.chain_id FOR UPDATE;

  IF p_action = 'approve' THEN
    -- Mark step as approved
    UPDATE daep_approval_steps
    SET status = 'approved', acted_by = p_user_id, acted_at = now(),
        comments = p_comments, updated_at = now()
    WHERE id = p_step_id;

    -- Find next required step
    SELECT * INTO v_next_step
    FROM daep_approval_steps
    WHERE chain_id = v_chain.id
      AND step_order > v_step.step_order
      AND is_required = true
      AND status = 'pending'
    ORDER BY step_order ASC
    LIMIT 1;

    IF FOUND THEN
      -- Advance to next step
      UPDATE daep_approval_steps SET status = 'waiting', updated_at = now() WHERE id = v_next_step.id;
      UPDATE daep_approval_chains
      SET current_step = v_next_step.step_role, updated_at = now()
      WHERE id = v_chain.id;
    ELSE
      -- All steps approved — chain complete
      UPDATE daep_approval_chains
      SET chain_status = 'approved', current_step = NULL,
          completed_at = now(), updated_at = now()
      WHERE id = v_chain.id;
      UPDATE incidents SET status = 'approved', updated_at = now() WHERE id = v_chain.incident_id;
    END IF;

    v_result = jsonb_build_object('success', true, 'action', 'approved');

  ELSIF p_action = 'deny' THEN
    -- Mark step as denied
    UPDATE daep_approval_steps
    SET status = 'denied', acted_by = p_user_id, acted_at = now(),
        comments = p_comments, updated_at = now()
    WHERE id = p_step_id;

    -- Deny the chain
    UPDATE daep_approval_chains
    SET chain_status = 'denied', current_step = NULL,
        denied_by = p_user_id, denied_at = now(), denied_reason = p_comments,
        updated_at = now()
    WHERE id = v_chain.id;

    -- Update incident
    UPDATE incidents SET status = 'denied', updated_at = now() WHERE id = v_chain.incident_id;

    v_result = jsonb_build_object('success', true, 'action', 'denied');

  ELSIF p_action = 'return' THEN
    -- Mark current step as returned
    UPDATE daep_approval_steps
    SET status = 'returned', acted_by = p_user_id, acted_at = now(),
        comments = p_comments, updated_at = now()
    WHERE id = p_step_id;

    -- Reset all previously approved/waiting steps to pending
    UPDATE daep_approval_steps
    SET status = 'pending', acted_by = NULL, acted_at = NULL,
        comments = NULL, updated_at = now()
    WHERE chain_id = v_chain.id
      AND id != p_step_id
      AND status IN ('approved', 'waiting');

    -- Return the chain
    UPDATE daep_approval_chains
    SET chain_status = 'returned', current_step = NULL,
        returned_by = p_user_id, returned_at = now(), return_reason = p_comments,
        updated_at = now()
    WHERE id = v_chain.id;

    -- Update incident
    UPDATE incidents SET status = 'returned', updated_at = now() WHERE id = v_chain.incident_id;

    v_result = jsonb_build_object('success', true, 'action', 'returned');

  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be approve, deny, or return', p_action;
  END IF;

  -- Insert audit log entry for FERPA compliance
  INSERT INTO audit_log (district_id, user_id, action, entity_type, entity_id, changes)
  VALUES (
    v_chain.district_id,
    p_user_id,
    'approval_' || p_action,
    'daep_approval_step',
    p_step_id,
    jsonb_build_object(
      'chain_id', v_chain.id,
      'incident_id', v_chain.incident_id,
      'step_role', v_step.step_role,
      'action', p_action,
      'comments', COALESCE(p_comments, '')
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 7. Postgres function: resubmit_approval_chain
-- ============================================
CREATE OR REPLACE FUNCTION resubmit_approval_chain(
  p_chain_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chain RECORD;
  v_first_step RECORD;
BEGIN
  SELECT * INTO v_chain FROM daep_approval_chains WHERE id = p_chain_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval chain not found';
  END IF;

  IF v_chain.chain_status != 'returned' THEN
    RAISE EXCEPTION 'Chain is not in returned status (current: %)', v_chain.chain_status;
  END IF;

  IF v_chain.submitted_by != p_user_id THEN
    RAISE EXCEPTION 'Only the original submitter can resubmit';
  END IF;

  -- Reset all non-skipped steps to pending
  UPDATE daep_approval_steps
  SET status = 'pending', acted_by = NULL, acted_at = NULL,
      comments = NULL, updated_at = now()
  WHERE chain_id = p_chain_id AND status != 'skipped';

  -- Set first required step to waiting
  SELECT * INTO v_first_step
  FROM daep_approval_steps
  WHERE chain_id = p_chain_id AND is_required = true
  ORDER BY step_order ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE daep_approval_steps SET status = 'waiting', updated_at = now() WHERE id = v_first_step.id;
  END IF;

  -- Reset chain
  UPDATE daep_approval_chains
  SET chain_status = 'in_progress',
      current_step = v_first_step.step_role,
      denied_by = NULL, denied_at = NULL, denied_reason = NULL,
      returned_by = NULL, returned_at = NULL, return_reason = NULL,
      completed_at = NULL,
      updated_at = now()
  WHERE id = p_chain_id;

  -- Update incident
  UPDATE incidents SET status = 'pending_approval', updated_at = now()
  WHERE id = v_chain.incident_id;

  -- Audit log
  INSERT INTO audit_log (district_id, user_id, action, entity_type, entity_id, changes)
  VALUES (
    v_chain.district_id,
    p_user_id,
    'approval_resubmit',
    'daep_approval_chain',
    p_chain_id,
    jsonb_build_object('incident_id', v_chain.incident_id)
  );

  RETURN jsonb_build_object('success', true, 'action', 'resubmitted');
END;
$$;

-- ============================================
-- 8. Trigger: auto-create approval chain for DAEP incidents
-- ============================================
CREATE OR REPLACE FUNCTION fn_create_daep_approval_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chain_id UUID;
  v_student RECORD;
BEGIN
  -- Only trigger for DAEP incidents that are submitted and don't already have a chain
  IF NEW.consequence_type = 'daep' AND NEW.status = 'submitted' AND NEW.approval_chain_id IS NULL THEN
    -- Fetch student flags
    SELECT is_sped, is_504 INTO v_student FROM students WHERE id = NEW.student_id;

    -- Create the chain
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
                                      requires_sped, requires_504, chain_status, current_step)
    VALUES (NEW.district_id, NEW.id, NEW.student_id, NEW.reported_by,
            COALESCE(v_student.is_sped, false), COALESCE(v_student.is_504, false),
            'in_progress', 'cbc')
    RETURNING id INTO v_chain_id;

    -- Create all 5 steps
    -- Step 1: CBC (always required)
    INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
                                     is_conditional, is_required, status)
    VALUES (v_chain_id, NEW.district_id, 'cbc', 1, 'Campus Behavior Coordinator',
            false, true, 'waiting');

    -- Step 2: Counselor (always required)
    INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
                                     is_conditional, is_required, status)
    VALUES (v_chain_id, NEW.district_id, 'counselor', 2, 'Counselor',
            false, true, 'pending');

    -- Step 3: SPED (conditional)
    INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
                                     is_conditional, is_required, status)
    VALUES (v_chain_id, NEW.district_id, 'sped_coordinator', 3, 'Special Education',
            true,
            COALESCE(v_student.is_sped, false),
            CASE WHEN COALESCE(v_student.is_sped, false) THEN 'pending' ELSE 'skipped' END);

    -- Step 4: 504 (conditional)
    INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
                                     is_conditional, is_required, status)
    VALUES (v_chain_id, NEW.district_id, 'section_504_coordinator', 4, 'Section 504',
            true,
            COALESCE(v_student.is_504, false),
            CASE WHEN COALESCE(v_student.is_504, false) THEN 'pending' ELSE 'skipped' END);

    -- Step 5: SSS (always required)
    INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
                                     is_conditional, is_required, status)
    VALUES (v_chain_id, NEW.district_id, 'sss', 5, 'Student Support Specialist',
            false, true, 'pending');

    -- Link chain to incident and update status
    NEW.approval_chain_id := v_chain_id;
    NEW.status := 'pending_approval';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_create_daep_approval_chain ON incidents;
CREATE TRIGGER trg_create_daep_approval_chain
  BEFORE INSERT OR UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION fn_create_daep_approval_chain();

-- ============================================
-- 9. RLS Policies
-- ============================================
ALTER TABLE daep_approval_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_approval_steps ENABLE ROW LEVEL SECURITY;

-- Chains: all staff in district can SELECT
CREATE POLICY "Staff can view approval chains in their district"
  ON daep_approval_chains FOR SELECT
  USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
  );

-- Chains: admin full access
CREATE POLICY "Admin full access to approval chains"
  ON daep_approval_chains FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND district_id = daep_approval_chains.district_id)
  );

-- Chains: submitter can insert
CREATE POLICY "Submitter can create approval chains"
  ON daep_approval_chains FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
  );

-- Steps: all staff in district can SELECT
CREATE POLICY "Staff can view approval steps in their district"
  ON daep_approval_steps FOR SELECT
  USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
  );

-- Steps: admin full access
CREATE POLICY "Admin full access to approval steps"
  ON daep_approval_steps FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND district_id = daep_approval_steps.district_id)
  );

-- Steps: actors can update steps matching their role
CREATE POLICY "Step actors can update their steps"
  ON daep_approval_steps FOR UPDATE
  USING (
    step_role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
  );

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION process_approval_step TO authenticated;
GRANT EXECUTE ON FUNCTION resubmit_approval_chain TO authenticated;
