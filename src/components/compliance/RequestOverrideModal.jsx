import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useComplianceActions } from '../../hooks/useCompliance'

/**
 * T2-1 — RequestOverrideModal (CC22 R2 finding F-R2-1).
 *
 * Replaces the legacy free-text override flow. Implements the migration 078
 * dual-signature workflow at the requester step:
 *   1. Pick a structured reason category (6-value enum)
 *   2. Provide reason detail (≥30 chars enforced at DB CHECK)
 *   3. Upload a supporting document to Supabase Storage
 *      (parent-signed waiver / ARD minutes / counsel approval)
 *   4. Submit — creates a pending override_request, audit-logged
 *
 * A different user (admin/principal/sped_coordinator) must then approve via
 * OverridePanel. The DB rejects same-user approval at multiple layers
 * (CHECK constraint + RPC re-check).
 */

const REASON_CATEGORIES = [
  {
    value: 'parent_signed_waiver',
    label: 'Parent-signed waiver',
    description: 'Parent has signed a written waiver agreeing to placement pending MDR completion.',
  },
  {
    value: 'ard_committee_emergency_action',
    label: 'ARD committee emergency action',
    description: 'ARD committee has resolved per emergency procedure; minutes to be linked.',
  },
  {
    value: 'safety_emergency',
    label: 'Safety emergency',
    description: 'Immediate safety concern requires placement before MDR completion.',
  },
  {
    value: 'student_protective_request',
    label: 'Student protective request',
    description: 'Student or family is requesting placement away from a danger; document the request.',
  },
  {
    value: 'legal_counsel_authorized',
    label: 'Legal counsel authorized',
    description: 'District counsel has approved override; counsel email or memo to be linked.',
  },
  {
    value: 'other_documented',
    label: 'Other (must be documented)',
    description: 'Other category — supporting document required to explain.',
  },
]

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 10 * 1024 * 1024  // 10MB
const MIN_DETAIL_CHARS = 30

export default function RequestOverrideModal({ isOpen, onClose, checklistId, onRequestCreated }) {
  const { districtId, user } = useAuth()
  const { requestOverride } = useComplianceActions()
  const [category, setCategory] = useState('')
  const [detail, setDetail] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadedDoc, setUploadedDoc] = useState(null)  // { storage_path, filename, size }
  const [submitting, setSubmitting] = useState(false)
  const [fileError, setFileError] = useState(null)
  const fileInputRef = useRef(null)

  const reset = () => {
    setCategory(''); setDetail(''); setUploadedDoc(null)
    setFileError(null); setSubmitting(false); setUploading(false)
  }

  const handleClose = async () => {
    // P3: clean up orphan uploads on cancel — files contain PII and must not
    // sit in Storage disconnected from any audit trail. Best-effort delete;
    // failures are logged and we proceed (the cancelled-state is the priority).
    if (uploadedDoc?.storage_path) {
      try {
        await supabase.storage.from('daep-documents').remove([uploadedDoc.storage_path])
      } catch (err) {
        console.warn('orphan-doc cleanup failed (non-blocking):', err)
      }
    }
    reset()
    onClose?.()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Invalid file type. Use PDF, JPG, PNG, or Word.')
      return
    }
    if (file.size > MAX_SIZE) {
      setFileError('File too large. Max 10MB.')
      return
    }
    setUploading(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${districtId}/compliance-overrides/${checklistId}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage
        .from('daep-documents')
        .upload(storagePath, file)
      if (upErr) throw upErr
      setUploadedDoc({
        storage_path: storagePath,
        filename: file.name,
        size: file.size,
      })
    } catch (err) {
      console.error('upload failed:', err)
      setFileError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const removeDoc = async () => {
    if (!uploadedDoc?.storage_path) return
    try {
      await supabase.storage.from('daep-documents').remove([uploadedDoc.storage_path])
    } catch (err) {
      console.error('removal failed:', err)
    }
    setUploadedDoc(null)
  }

  const handleSubmit = async () => {
    if (!category) { toast.error('Pick a reason category'); return }
    if (detail.trim().length < MIN_DETAIL_CHARS) {
      toast.error(`Reason detail must be at least ${MIN_DETAIL_CHARS} characters`)
      return
    }
    if (!uploadedDoc) { toast.error('Supporting document is required'); return }

    setSubmitting(true)
    const { data: requestId, error } = await requestOverride(
      checklistId, category, detail.trim(), uploadedDoc.storage_path,
    )
    if (error) {
      toast.error('Override request failed: ' + error.message)
      setSubmitting(false)
      return
    }
    toast.success('Override requested. A different user must approve.')
    onRequestCreated?.(requestId)
    handleClose()
  }

  const detailRemaining = Math.max(0, MIN_DETAIL_CHARS - detail.trim().length)
  const canSubmit = category && detail.trim().length >= MIN_DETAIL_CHARS && uploadedDoc && !submitting

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request compliance override" size="md">
      <div className="space-y-4">
        <div className="p-3 rounded bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-800">
            <strong>Dual-signature required.</strong> This creates a pending request.
            A different admin, principal, or SPED coordinator must approve before the
            placement gate clears. Every step is audit-logged.
          </p>
        </div>

        {/* Reason category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Choose a category…</option>
            {REASON_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {category && (
            <p className="text-xs text-gray-500 mt-1">
              {REASON_CATEGORIES.find(c => c.value === category)?.description}
            </p>
          )}
        </div>

        {/* Reason detail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason detail <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 ml-2">
              {detailRemaining > 0
                ? `${detailRemaining} more character(s) required`
                : `${detail.trim().length} characters`}
            </span>
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={`Document the specific reason for this override (≥${MIN_DETAIL_CHARS} chars)…`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[100px]"
          />
          <p className="text-xs text-gray-500 mt-1">
            Be specific. This text becomes part of the audit log and may be subpoena'd.
          </p>
        </div>

        {/* Supporting document */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supporting document <span className="text-red-500">*</span>
          </label>
          {uploadedDoc ? (
            <div className="p-3 border-2 border-green-200 bg-green-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{uploadedDoc.filename}</p>
                <p className="text-xs text-gray-500">{(uploadedDoc.size / 1024).toFixed(1)} KB · uploaded</p>
              </div>
              <button
                type="button"
                onClick={removeDoc}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${uploading ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-gray-300 hover:border-gray-400'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploading
                ? <p className="text-sm text-gray-600">Uploading…</p>
                : (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-orange-600">Click to upload</span> or drag &amp; drop
                    <br />
                    <span className="text-xs text-gray-500">PDF, JPG, PNG, Word — max 10MB</span>
                  </p>
                )}
            </div>
          )}
          {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
          <p className="text-xs text-gray-500 mt-1">
            Examples: parent-signed waiver, ARD committee minutes, counsel approval memo.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
            variant="warning"
          >
            Submit request
          </Button>
        </div>
      </div>
    </Modal>
  )
}
