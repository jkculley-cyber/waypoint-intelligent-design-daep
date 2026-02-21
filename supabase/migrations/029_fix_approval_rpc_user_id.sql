-- Migration 029: Fix spoofable p_user_id in approval RPCs
-- process_approval_step and resubmit_approval_chain both accepted a p_user_id
-- parameter supplied by the caller. This allowed any authenticated user to record
-- approval actions attributed to a different user's UUID.
-- Fix: drop the p_user_id parameter and use auth.uid() internally.

-- ============================================================
-- Drop old function signatures (parameter removal = new signature)
-- ============================================================
DROP FUNCTION IF EXISTS process_approval_step(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS resubmit_approval_chain(UUID, UUID);

-- ============================================================
-- Recreate process_approval_step using auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION process_approval_step(
  p_step_id UUID,
  p_action  TEXT,
  p_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_step     RECORD;
  v_chain    RECORD;
  v_next_step RECORD;
  v_result   JSONB;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
    UPDATE daep_approval_steps
    SET status = 'approved', acted_by = v_actor_id, acted_at = now(),
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
    UPDATE daep_approval_steps
    SET status = 'denied', acted_by = v_actor_id, acted_at = now(),
        comments = p_comments, updated_at = now()
    WHERE id = p_step_id;

    UPDATE daep_approval_chains
    SET chain_status = 'denied', current_step = NULL,
        denied_by = v_actor_id, denied_at = now(), denied_reason = p_comments,
        updated_at = now()
    WHERE id = v_chain.id;

    UPDATE incidents SET status = 'denied', updated_at = now() WHERE id = v_chain.incident_id;

    v_result = jsonb_build_object('success', true, 'action', 'denied');

  ELSIF p_action = 'return' THEN
    UPDATE daep_approval_steps
    SET status = 'returned', acted_by = v_actor_id, acted_at = now(),
        comments = p_comments, updated_at = now()
    WHERE id = p_step_id;

    UPDATE daep_approval_steps
    SET status = 'pending', acted_by = NULL, acted_at = NULL,
        comments = NULL, updated_at = now()
    WHERE chain_id = v_chain.id
      AND id != p_step_id
      AND status IN ('approved', 'waiting');

    UPDATE daep_approval_chains
    SET chain_status = 'returned', current_step = NULL,
        returned_by = v_actor_id, returned_at = now(), return_reason = p_comments,
        updated_at = now()
    WHERE id = v_chain.id;

    UPDATE incidents SET status = 'returned', updated_at = now() WHERE id = v_chain.incident_id;

    v_result = jsonb_build_object('success', true, 'action', 'returned');

  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be approve, deny, or return', p_action;
  END IF;

  -- Audit log
  INSERT INTO audit_log (district_id, user_id, action, entity_type, entity_id, changes)
  VALUES (
    v_chain.district_id,
    v_actor_id,
    'approval_' || p_action,
    'daep_approval_step',
    p_step_id,
    jsonb_build_object(
      'chain_id',    v_chain.id,
      'incident_id', v_chain.incident_id,
      'step_role',   v_step.step_role,
      'action',      p_action,
      'comments',    COALESCE(p_comments, '')
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- Recreate resubmit_approval_chain using auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION resubmit_approval_chain(
  p_chain_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id  UUID := auth.uid();
  v_chain     RECORD;
  v_first_step RECORD;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_chain FROM daep_approval_chains WHERE id = p_chain_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval chain not found';
  END IF;

  IF v_chain.chain_status != 'returned' THEN
    RAISE EXCEPTION 'Chain is not in returned status (current: %)', v_chain.chain_status;
  END IF;

  IF v_chain.submitted_by != v_actor_id THEN
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

  UPDATE incidents SET status = 'pending_approval', updated_at = now()
  WHERE id = v_chain.incident_id;

  -- Audit log
  INSERT INTO audit_log (district_id, user_id, action, entity_type, entity_id, changes)
  VALUES (
    v_chain.district_id,
    v_actor_id,
    'approval_resubmit',
    'daep_approval_chain',
    p_chain_id,
    jsonb_build_object('incident_id', v_chain.incident_id)
  );

  RETURN jsonb_build_object('success', true, 'action', 'resubmitted');
END;
$$;

GRANT EXECUTE ON FUNCTION process_approval_step(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resubmit_approval_chain(UUID) TO authenticated;
