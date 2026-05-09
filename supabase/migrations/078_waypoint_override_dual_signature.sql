-- Migration 078: Restructured compliance override with dual-signature + document (T1-5)
--
-- CC22 R1 finding F2 — Reyes-named "Daubert killer" + Patricia "yellow tape
-- line" + Mark Davidson "the override button is the angle Frontline uses":
-- the existing useCompliance.js overrideBlock function lets a single user
-- flip placement_blocked=false with a free-text override_reason ("running
-- late, parent okay with it" is currently a valid override). No second
-- signature, no document upload, no structured reason.
--
-- This migration:
--   1. Creates compliance_override_requests table with:
--      - structured reason_category enum
--      - required supporting_document_url (Supabase Storage path)
--      - separate requested_by + approved_by (must be distinct users)
--   2. Adds override_request_id FK on compliance_checklists.
--   3. Provides two SECURITY DEFINER RPCs:
--      - fn_request_compliance_override: requester creates pending request
--      - fn_approve_compliance_override: a DIFFERENT user approves and the
--        gate flips. Same-user approval is rejected.
--   4. Deprecates (does not remove) the legacy override_reason/override_by
--      columns — frontend stops using them after migration deploy. They are
--      preserved for historical audit-log readers.

-- ============================================================================
-- 1. Override requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_override_requests (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id                 UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  compliance_checklist_id     UUID NOT NULL REFERENCES compliance_checklists(id) ON DELETE CASCADE,
  incident_id                 UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,

  reason_category             TEXT NOT NULL CHECK (reason_category IN (
                                'parent_signed_waiver',
                                'ard_committee_emergency_action',
                                'safety_emergency',
                                'student_protective_request',
                                'legal_counsel_authorized',
                                'other_documented'
                              )),
  reason_detail               TEXT NOT NULL CHECK (length(trim(reason_detail)) >= 30),
  supporting_document_url     TEXT NOT NULL CHECK (length(trim(supporting_document_url)) > 0),

  requested_by                UUID NOT NULL REFERENCES profiles(id),
  requested_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  approval_status             TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
                                'pending', 'approved', 'rejected', 'withdrawn'
                              )),
  approved_by                 UUID REFERENCES profiles(id),
  approved_at                 TIMESTAMPTZ,
  approval_notes              TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Approver must differ from requester. Enforced at DB level.
  CONSTRAINT override_dual_signature CHECK (
    approved_by IS NULL OR approved_by <> requested_by
  ),
  -- approved_by + approved_at must be set together when status='approved'
  CONSTRAINT override_approval_consistency CHECK (
    (approval_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR
    (approval_status <> 'approved')
  )
);

ALTER TABLE compliance_override_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "district_isolation_override_requests" ON compliance_override_requests;
CREATE POLICY "district_isolation_override_requests" ON compliance_override_requests
  FOR ALL
  USING (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (district_id = (SELECT district_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_override_requests_checklist ON compliance_override_requests(compliance_checklist_id);
CREATE INDEX IF NOT EXISTS idx_override_requests_pending ON compliance_override_requests(district_id, approval_status) WHERE approval_status = 'pending';

-- Audit trigger on the new table (uses fn_waypoint_audit_trigger from migration 073)
DROP TRIGGER IF EXISTS trg_9_override_requests_audit ON compliance_override_requests;
CREATE TRIGGER trg_9_override_requests_audit
  BEFORE INSERT OR UPDATE OR DELETE ON compliance_override_requests
  FOR EACH ROW EXECUTE FUNCTION fn_waypoint_audit_trigger();

-- ============================================================================
-- 2. compliance_checklists override_request_id FK
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE compliance_checklists
    ADD COLUMN IF NOT EXISTS override_request_id UUID
      REFERENCES compliance_override_requests(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'compliance_checklists.override_request_id skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- 3. RPCs
-- ============================================================================

-- 3a. Request an override (creates a pending request).
CREATE OR REPLACE FUNCTION fn_request_compliance_override(
  p_checklist_id            UUID,
  p_reason_category         TEXT,
  p_reason_detail           TEXT,
  p_supporting_document_url TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_district_id UUID;
  v_incident_id UUID;
  v_user_id     UUID;
  v_req_id      UUID;
  v_user_role   TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Authorize: only admin / principal / ap / sped_coordinator can request override
  SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;
  IF v_user_role NOT IN ('admin','principal','ap','sped_coordinator') THEN
    RAISE EXCEPTION 'Role % cannot request compliance override', v_user_role
      USING ERRCODE = '42501';
  END IF;

  -- Resolve district + incident from checklist (district isolation enforced via
  -- the SELECT — RLS will hide checklists from other districts).
  SELECT district_id, incident_id INTO v_district_id, v_incident_id
  FROM compliance_checklists WHERE id = p_checklist_id;
  IF v_district_id IS NULL THEN
    RAISE EXCEPTION 'compliance_checklist % not found or not accessible', p_checklist_id
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO compliance_override_requests (
    district_id, compliance_checklist_id, incident_id,
    reason_category, reason_detail, supporting_document_url,
    requested_by, requested_at, approval_status
  ) VALUES (
    v_district_id, p_checklist_id, v_incident_id,
    p_reason_category, p_reason_detail, p_supporting_document_url,
    v_user_id, now(), 'pending'
  ) RETURNING id INTO v_req_id;

  RETURN v_req_id;
END $$;

-- 3b. Approve an override (must be a different user from the requester).
-- Approval is what flips the gate: compliance_checklist.block_overridden = true.
CREATE OR REPLACE FUNCTION fn_approve_compliance_override(
  p_request_id     UUID,
  p_approval_notes TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id        UUID;
  v_user_role      TEXT;
  v_request        compliance_override_requests%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Approver authorization: only admin / principal / sped_coordinator
  -- (AP cannot approve their own area's overrides — must escalate)
  SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;
  IF v_user_role NOT IN ('admin','principal','sped_coordinator') THEN
    RAISE EXCEPTION 'Role % cannot approve compliance override', v_user_role
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request FROM compliance_override_requests WHERE id = p_request_id;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'override request % not found', p_request_id
      USING ERRCODE = '42501';
  END IF;

  IF v_request.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'override request % is already %', p_request_id, v_request.approval_status
      USING ERRCODE = 'P0001';
  END IF;

  -- Dual-signature check: approver MUST differ from requester
  IF v_request.requested_by = v_user_id THEN
    RAISE EXCEPTION
      'Same-user override approval rejected. The approver must be a different user from the requester (dual-signature requirement). Requester: %; you: %.',
      v_request.requested_by, v_user_id
      USING ERRCODE = '42501';
  END IF;

  -- Mark request approved
  UPDATE compliance_override_requests
  SET approval_status = 'approved',
      approved_by     = v_user_id,
      approved_at     = now(),
      approval_notes  = p_approval_notes,
      updated_at      = now()
  WHERE id = p_request_id;

  -- Flip the gate on the linked compliance_checklist.
  -- The legacy override_reason / override_by fields are populated for
  -- historical/audit-log compatibility; new code reads override_request_id.
  UPDATE compliance_checklists
  SET block_overridden     = true,
      placement_blocked    = false,
      override_request_id  = p_request_id,
      override_reason      = '[migrated to override_requests.id=' || p_request_id || ']',
      override_by          = v_user_id,
      updated_at           = now()
  WHERE id = v_request.compliance_checklist_id;

  -- Cascade compliance_cleared on the parent incident (preserves existing
  -- approval workflow). The audit trigger on incidents records the change.
  UPDATE incidents
  SET compliance_cleared = true,
      updated_at         = now()
  WHERE id = v_request.incident_id;
END $$;

-- 3c. Reject an override request
CREATE OR REPLACE FUNCTION fn_reject_compliance_override(
  p_request_id     UUID,
  p_approval_notes TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id   UUID;
  v_user_role TEXT;
  v_request   compliance_override_requests%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;
  IF v_user_role NOT IN ('admin','principal','sped_coordinator') THEN
    RAISE EXCEPTION 'Role % cannot reject compliance override', v_user_role
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request FROM compliance_override_requests WHERE id = p_request_id;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'override request % not found', p_request_id USING ERRCODE = '42501';
  END IF;
  IF v_request.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'override request % is already %', p_request_id, v_request.approval_status
      USING ERRCODE = 'P0001';
  END IF;
  IF v_request.requested_by = v_user_id THEN
    RAISE EXCEPTION
      'Same-user rejection rejected. The reviewer must differ from the requester.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE compliance_override_requests
  SET approval_status = 'rejected',
      approved_by     = v_user_id,
      approved_at     = now(),
      approval_notes  = p_approval_notes,
      updated_at      = now()
  WHERE id = p_request_id;
END $$;

GRANT EXECUTE ON FUNCTION fn_request_compliance_override(UUID,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_approve_compliance_override(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_reject_compliance_override(UUID,TEXT) TO authenticated;
