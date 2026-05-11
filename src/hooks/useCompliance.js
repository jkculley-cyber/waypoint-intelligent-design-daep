import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch compliance checklists with optional filters
 */
export function useComplianceChecklists(filters = {}) {
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchChecklists = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('compliance_checklists')
        .select(`
          *,
          student:students(id, first_name, last_name, student_id_number, grade_level, is_sped, is_504, sped_eligibility, campus_id),
          incident:incidents!incident_id(id, incident_date, offense_code_id, consequence_type, status,
            offense:offense_codes(id, code, title, category)
          )
        `)
        .eq('district_id', districtId)
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.placement_blocked !== undefined) {
        query = query.eq('placement_blocked', filters.placement_blocked)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      let results = data || []
      // Client-side campus scoping (compliance_checklists has no direct campus_id)
      if (filters._campusScope?.length) {
        results = results.filter(c => c.student?.campus_id && filters._campusScope.includes(c.student.campus_id))
      }
      setChecklists(results)
    } catch (err) {
      console.error('Error fetching compliance checklists:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId, filters.status, filters.placement_blocked, filters._campusScope])

  useEffect(() => {
    fetchChecklists()
  }, [fetchChecklists])

  return { checklists, loading, error, refetch: fetchChecklists }
}

/**
 * Fetch a single compliance checklist
 */
export function useComplianceChecklist(checklistId) {
  const [checklist, setChecklist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchChecklist = useCallback(async () => {
    if (!checklistId || !districtId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('compliance_checklists')
        .select(`
          *,
          student:students(*),
          incident:incidents!incident_id(*,
            offense:offense_codes(*)
          )
        `)
        .eq('id', checklistId)
        .eq('district_id', districtId)
        .single()

      if (fetchError) throw fetchError
      setChecklist(data)
    } catch (err) {
      console.error('Error fetching checklist:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [checklistId, districtId])

  useEffect(() => {
    fetchChecklist()
  }, [fetchChecklist])

  return { checklist, loading, error, refetch: fetchChecklist }
}

/**
 * Compliance checklist update operations
 */
export function useComplianceActions() {
  const { user } = useAuth()

  // itemCompletedBy: the full merged item_completed_by JSONB object
  // (caller builds it by merging current checklist.item_completed_by with the new entry)
  const updateChecklistItem = async (checklistId, field, value, itemCompletedBy) => {
    const update = { [field]: value || null }
    if (itemCompletedBy !== undefined) {
      update.item_completed_by = itemCompletedBy
    }

    const { data, error } = await supabase
      .from('compliance_checklists')
      .update(update)
      .eq('id', checklistId)
      .select()
      .single()

    return { data, error }
  }

  const updateChecklist = async (checklistId, updates) => {
    const { data, error } = await supabase
      .from('compliance_checklists')
      .update(updates)
      .eq('id', checklistId)
      .select()
      .single()

    return { data, error }
  }

  // Restructured override (T1-5, migration 078): two-step request → approval
  // with dual-signature requirement. Frontend code MUST use these RPCs;
  // direct UPDATE of compliance_checklists.block_overridden is no longer
  // sufficient — the dual-signature CHECK on compliance_override_requests
  // and the SECURITY DEFINER RPC enforce the workflow at the DB layer.

  /**
   * Step 1 — requester creates a pending override request.
   * @param {string} checklistId
   * @param {string} reasonCategory  one of: parent_signed_waiver,
   *   ard_committee_emergency_action, safety_emergency,
   *   student_protective_request, legal_counsel_authorized, other_documented
   * @param {string} reasonDetail    structured reason (≥30 chars)
   * @param {string} supportingDocumentUrl  Supabase Storage path to
   *   parent-signed waiver / ARD minutes / counsel approval
   */
  const requestOverride = async (checklistId, reasonCategory, reasonDetail, supportingDocumentUrl) => {
    const { data, error } = await supabase.rpc('fn_request_compliance_override', {
      p_checklist_id: checklistId,
      p_reason_category: reasonCategory,
      p_reason_detail: reasonDetail,
      p_supporting_document_url: supportingDocumentUrl,
    })
    return { data, error }  // data = override_request_id (UUID)
  }

  /**
   * Step 2 — APPROVER (must be a different user from the requester) approves
   * via the verify-and-approve-override Edge Function (T2-4). The function:
   *   - validates the supporting_document_url resolves to a real file in
   *     Storage with non-zero size and an accepted MIME (PDF/JPG/PNG/Word)
   *   - calls fn_approve_compliance_override under the caller's auth so
   *     dual-signature CHECK fires and audit trigger gets caller's auth.uid()
   * On approval the gate flips: compliance_checklist.block_overridden=true,
   * placement_blocked=false, incident.compliance_cleared=true.
   *
   * Returns { data: { success, document_verified }, error } — UI surfaces
   * the validated MIME + size to confirm what was actually checked.
   */
  const approveOverride = async (requestId, approvalNotes) => {
    const { data, error } = await supabase.functions.invoke('verify-and-approve-override', {
      body: { request_id: requestId, approval_notes: approvalNotes || null },
    })
    if (error) return { data: null, error }
    if (data?.error) return { data: null, error: new Error(data.error) }
    return { data, error: null }
  }

  /** Reject a pending override request. */
  const rejectOverride = async (requestId, approvalNotes) => {
    const { error } = await supabase.rpc('fn_reject_compliance_override', {
      p_request_id: requestId,
      p_approval_notes: approvalNotes,
    })
    return { error }
  }

  /**
   * @deprecated Use requestOverride + approveOverride. Kept as a soft-fail
   * stub so old callers fail loudly rather than silently bypassing the gate.
   */
  const overrideBlock = async () => {
    const error = new Error(
      'overrideBlock is deprecated. Use requestOverride() then approveOverride() ' +
      '(migration 078, dual-signature workflow). The DB will reject same-user ' +
      'flips of block_overridden via direct UPDATE.'
    )
    console.error('[useCompliance]', error.message)
    return { data: null, error }
  }

  return {
    updateChecklistItem,
    updateChecklist,
    requestOverride,
    approveOverride,         // T2-4: validates document via Edge Function
    rejectOverride,
    overrideBlock,  // deprecated; left for old caller surface
  }
}

/**
 * Fetch override requests for a compliance checklist (most recent first).
 */
export function useOverrideRequests(checklistId) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchRequests = useCallback(async () => {
    if (!checklistId || !districtId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('compliance_override_requests')
        .select(`
          *,
          requester:profiles!compliance_override_requests_requested_by_fkey(id, full_name, role),
          approver:profiles!compliance_override_requests_approved_by_fkey(id, full_name, role)
        `)
        .eq('compliance_checklist_id', checklistId)
        .order('requested_at', { ascending: false })
      if (fetchError) throw fetchError
      setRequests(data || [])
    } catch (err) {
      console.error('Error fetching override requests:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [checklistId, districtId])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return { requests, loading, error, refetch: fetchRequests }
}
