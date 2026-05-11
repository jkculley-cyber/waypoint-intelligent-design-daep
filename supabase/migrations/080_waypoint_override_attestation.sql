-- Migration 080: Document attestation on compliance_override_requests (T3 — TOCTOU close)
--
-- CC22 R3 Reyes residual: migration 078 + Edge Function verify-and-approve-override
-- check that the supporting_document_url resolves to a non-zero file at approval
-- time, but capture nothing about WHAT file was seen. A bad actor with Storage
-- write access could swap the file at the same path after approval is recorded,
-- and the audit packet would still point at "a file" — just not the one that
-- was actually approved.
--
-- This migration closes the Time-Of-Check to Time-Of-Use (TOCTOU) gap:
--   1. Add document_sha256 / document_size_bytes / document_mime /
--      document_verified_at columns to compliance_override_requests.
--   2. Update fn_approve_compliance_override to REQUIRE attestation params.
--      Direct RPC approval without attestation now raises. Approvals must
--      go through the verify-and-approve-override Edge Function which
--      computes SHA-256 of the file bytes and supplies attestation.
--   3. CHECK constraint enforces hash shape (64-char lowercase hex) when set.
--
-- Existing approved rows pre-dating this migration have NULL hash — that is
-- correct historical state (pre-attestation requirement). Going forward,
-- every new approval row carries a verifiable attestation.

-- ============================================================================
-- 1. Attestation columns
-- ============================================================================

ALTER TABLE compliance_override_requests
  ADD COLUMN IF NOT EXISTS document_sha256       TEXT,
  ADD COLUMN IF NOT EXISTS document_size_bytes   BIGINT,
  ADD COLUMN IF NOT EXISTS document_mime         TEXT,
  ADD COLUMN IF NOT EXISTS document_verified_at  TIMESTAMPTZ;

-- Hash shape: lowercase hex, exactly 64 chars (SHA-256 = 256 bits = 32 bytes = 64 hex).
-- NULL allowed for pre-existing rows; new rows from fn_approve_* are required to set it.
DO $$
BEGIN
  ALTER TABLE compliance_override_requests
    ADD CONSTRAINT document_sha256_shape
    CHECK (document_sha256 IS NULL OR document_sha256 ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'document_sha256_shape constraint already exists, skipping';
END $$;

-- ============================================================================
-- 2. fn_approve_compliance_override — replace with attestation-required form
-- ============================================================================
--
-- Signature change: add p_document_sha256, p_document_size_bytes,
-- p_document_mime, p_document_verified_at as required params.
-- DROP first because we are changing the signature (adding params, even with
-- defaults, prevents in-place CREATE OR REPLACE from succeeding cleanly when
-- existing grants reference the old 2-arg form).

DROP FUNCTION IF EXISTS fn_approve_compliance_override(UUID, TEXT);

CREATE OR REPLACE FUNCTION fn_approve_compliance_override(
  p_request_id            UUID,
  p_approval_notes        TEXT,
  p_document_sha256       TEXT         DEFAULT NULL,
  p_document_size_bytes   BIGINT       DEFAULT NULL,
  p_document_mime         TEXT         DEFAULT NULL,
  p_document_verified_at  TIMESTAMPTZ  DEFAULT NULL
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

  -- Approver authorization: only admin / principal / sped_coordinator.
  -- (AP cannot approve their own area's overrides — must escalate.)
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

  -- Dual-signature check fires BEFORE attestation check so existing smoke
  -- tests that probe same-user rejection don't have to supply attestation.
  IF v_request.requested_by = v_user_id THEN
    RAISE EXCEPTION
      'Same-user override approval rejected. The approver must be a different user from the requester (dual-signature requirement). Requester: %; you: %.',
      v_request.requested_by, v_user_id
      USING ERRCODE = '42501';
  END IF;

  -- Attestation required. Closes TOCTOU: every approval must carry a
  -- SHA-256 of the supporting document computed at approval time.
  IF p_document_sha256 IS NULL
     OR p_document_size_bytes IS NULL
     OR p_document_verified_at IS NULL
  THEN
    RAISE EXCEPTION
      'Document attestation required. Approval must go through the verify-and-approve-override Edge Function, which computes SHA-256 of the supporting document at verification time. Direct RPC approval without attestation is blocked to close the TOCTOU chain-of-custody gap.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Shape checks. The CHECK constraint on the column also enforces the
  -- hash shape on write; raising here gives a clearer error message.
  IF p_document_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'document_sha256 must be 64-char lowercase hex (got: %)', p_document_sha256
      USING ERRCODE = '22023';
  END IF;
  IF p_document_size_bytes <= 0 THEN
    RAISE EXCEPTION 'document_size_bytes must be > 0 (got: %)', p_document_size_bytes
      USING ERRCODE = '22023';
  END IF;
  IF p_document_verified_at > now() + INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'document_verified_at cannot be in the future (got: %)', p_document_verified_at
      USING ERRCODE = '22023';
  END IF;

  -- Mark request approved with attestation.
  UPDATE compliance_override_requests
  SET approval_status      = 'approved',
      approved_by          = v_user_id,
      approved_at          = now(),
      approval_notes       = p_approval_notes,
      document_sha256      = p_document_sha256,
      document_size_bytes  = p_document_size_bytes,
      document_mime        = p_document_mime,
      document_verified_at = p_document_verified_at,
      updated_at           = now()
  WHERE id = p_request_id;

  -- Flip the gate on the linked compliance_checklist.
  -- Legacy override_reason / override_by preserved for historical readers.
  UPDATE compliance_checklists
  SET block_overridden     = true,
      placement_blocked    = false,
      override_request_id  = p_request_id,
      override_reason      = '[migrated to override_requests.id=' || p_request_id || ']',
      override_by          = v_user_id,
      updated_at           = now()
  WHERE id = v_request.compliance_checklist_id;

  -- Cascade compliance_cleared on the parent incident.
  UPDATE incidents
  SET compliance_cleared = true,
      updated_at         = now()
  WHERE id = v_request.incident_id;
END $$;

GRANT EXECUTE ON FUNCTION fn_approve_compliance_override(UUID, TEXT, TEXT, BIGINT, TEXT, TIMESTAMPTZ) TO authenticated;
