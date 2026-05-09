import { useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import { useAuth } from '../../contexts/AuthContext'
import { useComplianceActions, useOverrideRequests } from '../../hooks/useCompliance'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/utils'
import RequestOverrideModal from './RequestOverrideModal'

/**
 * T2-1 — OverridePanel (CC22 R2 finding F-R2-1).
 *
 * Replaces the legacy block_overridden display + ConfirmDialog-based override
 * flow in ComplianceChecklist.jsx. Renders three states based on
 * compliance_override_requests state:
 *   1. No pending request + checklist is blocked  → "Request Override" button
 *   2. Pending request                            → review panel for the
 *      approver (different user than requester); approve / reject buttons
 *   3. Approved request                            → green confirmation panel
 *      with link to supporting document, approver/requester names, audit hint
 */

const REASON_CATEGORY_LABELS = {
  parent_signed_waiver:           'Parent-signed waiver',
  ard_committee_emergency_action: 'ARD committee emergency action',
  safety_emergency:               'Safety emergency',
  student_protective_request:     'Student protective request',
  legal_counsel_authorized:       'Legal counsel authorized',
  other_documented:               'Other (documented)',
}

export default function OverridePanel({ checklist, onUpdate }) {
  const { user, profile } = useAuth()
  const { approveOverride, rejectOverride } = useComplianceActions()
  const { requests, refetch } = useOverrideRequests(checklist?.id)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [reviewingId, setReviewingId] = useState(null)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [working, setWorking] = useState(false)

  if (!checklist) return null

  const pending = requests.find(r => r.approval_status === 'pending')
  const approved = requests.find(r => r.approval_status === 'approved')

  const isApproverRole = ['admin', 'principal', 'sped_coordinator'].includes(profile?.role)
  const isPendingRequester = pending?.requested_by === user?.id

  const isBlocked = checklist.placement_blocked && !checklist.block_overridden
  const showRequestButton = isBlocked && !pending && !approved
  const showApprovedBanner = checklist.block_overridden && approved
  const showLegacyOverrideBanner = checklist.block_overridden && !approved
                                && checklist.override_reason && !checklist.override_request_id

  const viewSupportingDocument = async (storagePath) => {
    if (!storagePath) return
    try {
      const { data, error } = await supabase.storage
        .from('daep-documents')
        .createSignedUrl(storagePath, 300)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('signed-url failed:', err)
      toast.error('Could not open the supporting document')
    }
  }

  const handleApprove = async () => {
    if (!pending) return
    if (isPendingRequester) {
      toast.error('A different user must approve (dual-signature)')
      return
    }
    setWorking(true)
    // T2-4: approveOverride routes through the verify-and-approve-override
    // Edge Function which validates the supporting_document_url resolves to a
    // real, non-empty file with an accepted MIME before invoking the RPC.
    const { data, error } = await approveOverride(pending.id, decisionNotes.trim() || null)
    if (error) {
      toast.error('Approval failed: ' + error.message)
    } else {
      const verified = data?.document_verified
      toast.success(
        verified
          ? `Override approved. Document verified (${verified.filename}, ${(verified.size_bytes / 1024).toFixed(1)} KB).`
          : 'Override approved. Placement gate cleared.'
      )
      setReviewingId(null); setDecisionNotes('')
      await refetch(); onUpdate?.()
    }
    setWorking(false)
  }

  const handleReject = async () => {
    if (!pending) return
    if (isPendingRequester) {
      toast.error('A different user must review the request')
      return
    }
    if (!decisionNotes.trim()) {
      toast.error('Provide a reason for rejecting the request')
      return
    }
    setWorking(true)
    const { error } = await rejectOverride(pending.id, decisionNotes.trim())
    if (error) {
      toast.error('Rejection failed: ' + error.message)
    } else {
      toast.success('Request rejected.')
      setReviewingId(null); setDecisionNotes('')
      await refetch(); onUpdate?.()
    }
    setWorking(false)
  }

  return (
    <>
      {/* State 1: blocked + no pending → request button */}
      {showRequestButton && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-900">Compliance gate active</p>
            <p className="text-xs text-amber-700 mt-1">
              Overrides require dual-signature: a structured reason + supporting document,
              then approval from a different admin / principal / SPED coordinator.
            </p>
          </div>
          <Button variant="warning" size="sm" onClick={() => setRequestModalOpen(true)}>
            Request override
          </Button>
        </div>
      )}

      {/* State 2: pending request → approver review panel */}
      {pending && (
        <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge color="yellow" dot>Pending review</Badge>
                <span className="text-xs text-yellow-700">
                  Requested {formatDateTime(pending.requested_at)} by{' '}
                  <strong>{pending.requester?.full_name || 'Staff'}</strong>
                </span>
              </div>
              <p className="text-sm font-medium text-yellow-900">
                {REASON_CATEGORY_LABELS[pending.reason_category] || pending.reason_category}
              </p>
            </div>
            {pending.supporting_document_url && (
              <button
                type="button"
                onClick={() => viewSupportingDocument(pending.supporting_document_url)}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap"
              >
                View document →
              </button>
            )}
          </div>

          <div className="text-xs text-yellow-800 bg-white/60 rounded p-2 whitespace-pre-wrap">
            {pending.reason_detail}
          </div>

          {isPendingRequester ? (
            <div className="text-xs text-yellow-700 italic">
              You requested this override. A different admin / principal / SPED coordinator
              must approve (dual-signature requirement).
            </div>
          ) : isApproverRole ? (
            reviewingId === pending.id ? (
              <div className="space-y-2">
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Approval / rejection notes (rejection requires a reason)…"
                  className="w-full px-3 py-2 border border-yellow-300 rounded text-sm min-h-[60px] bg-white"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setReviewingId(null); setDecisionNotes('') }}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleReject} loading={working}>
                    Reject
                  </Button>
                  <Button variant="success" size="sm" onClick={handleApprove} loading={working}>
                    Approve
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button variant="warning" size="sm" onClick={() => setReviewingId(pending.id)}>
                  Review request
                </Button>
              </div>
            )
          ) : (
            <div className="text-xs text-yellow-700 italic">
              Approval requires admin, principal, or SPED coordinator role.
            </div>
          )}
        </div>
      )}

      {/* State 3: approved (new workflow) → green confirmation */}
      {showApprovedBanner && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-green-900">Override approved</p>
            {approved.supporting_document_url && (
              <button
                type="button"
                onClick={() => viewSupportingDocument(approved.supporting_document_url)}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                View document
              </button>
            )}
          </div>
          <p className="text-xs text-green-700">
            <strong>{REASON_CATEGORY_LABELS[approved.reason_category] || approved.reason_category}</strong>
            {' · Requested by '}
            {approved.requester?.full_name || 'Staff'}
            {' · Approved '}
            {formatDateTime(approved.approved_at)}
            {' by '}
            {approved.approver?.full_name || 'Staff'}
          </p>
          <p className="text-xs text-green-700 bg-white/60 rounded p-2 mt-1 whitespace-pre-wrap">
            {approved.reason_detail}
          </p>
          {approved.approval_notes && (
            <p className="text-xs text-green-700 italic mt-1">
              Approver notes: {approved.approval_notes}
            </p>
          )}
        </div>
      )}

      {/* Legacy override (pre-T1, no override_request_id linkage) */}
      {showLegacyOverrideBanner && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800">
            Block override applied (legacy single-signature)
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Reason: {checklist.override_reason}
          </p>
          <p className="text-xs text-yellow-600 italic mt-1">
            Recorded before the dual-signature workflow shipped. Future overrides
            will require a structured reason + supporting document + second signature.
          </p>
        </div>
      )}

      <RequestOverrideModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        checklistId={checklist?.id}
        onRequestCreated={async () => { await refetch(); onUpdate?.() }}
      />
    </>
  )
}
