import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccessScope } from './useAccessScope'
import { applyCampusScope } from '../lib/accessControl'

/**
 * Fetch incidents with optional filters and pagination
 * @param {object} filters - Filter options
 * @param {number} [filters.page] - Page number (1-based). When set, enables pagination with PAGE_SIZE rows.
 * @param {number} [filters.pageSize] - Rows per page (default 50 when page is set).
 */
export function useIncidents(filters = {}) {
  const [incidents, setIncidents] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchIncidents = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)

    try {
      const paginated = typeof filters.page === 'number' && filters.page > 0
      const pageSize = filters.pageSize || 50

      let query = supabase
        .from('incidents')
        .select(`
          *,
          student:students(id, first_name, last_name, middle_name, grade_level, student_id_number, is_sped, is_504, is_ell, is_homeless, is_foster_care, sped_eligibility),
          offense:offense_codes(id, code, title, category, severity),
          campus:campuses!campus_id(id, name),
          reporter:profiles!incidents_reported_by_fkey(id, full_name, role),
          reviewer:profiles!incidents_reviewed_by_fkey(id, full_name)
        `, paginated ? { count: 'exact' } : undefined)
        .eq('district_id', districtId)
        .order('incident_date', { ascending: false })

      if (filters._campusScope) query = query.in('campus_id', filters._campusScope)
      if (filters.campus_id) query = query.eq('campus_id', filters.campus_id)
      // SPED-only scope: only show incidents for SPED/504 students
      if (filters._spedOnly) query = query.eq('sped_compliance_required', true)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.student_id) query = query.eq('student_id', filters.student_id)
      if (filters.consequence_type) query = query.eq('consequence_type', filters.consequence_type)
      if (filters.sped_compliance_required !== undefined) {
        query = query.eq('sped_compliance_required', filters.sped_compliance_required)
      }
      if (filters.dateFrom) query = query.gte('incident_date', filters.dateFrom)
      if (filters.dateTo)   query = query.lte('incident_date', filters.dateTo)

      // Apply pagination range
      if (paginated) {
        const from = (filters.page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      // Load approval chain data separately (avoids FK hint failures)
      const incidents = data || []
      const chainIds = [...new Set(incidents.map(i => i.approval_chain_id).filter(Boolean))]
      if (chainIds.length > 0) {
        const { data: chains } = await supabase
          .from('daep_approval_chains')
          .select('id, chain_status, current_step')
          .in('id', chainIds)
        const chainMap = Object.fromEntries((chains || []).map(c => [c.id, c]))
        for (const inc of incidents) {
          if (inc.approval_chain_id) inc.approval_chain = chainMap[inc.approval_chain_id] || null
        }
      }

      setIncidents(incidents)
      if (paginated && typeof count === 'number') {
        setTotalCount(count)
      }
    } catch (err) {
      console.error('Error fetching incidents:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId, filters._campusScope, filters._spedOnly, filters.campus_id, filters.status, filters.student_id, filters.consequence_type, filters.sped_compliance_required, filters.dateFrom, filters.dateTo, filters.page, filters.pageSize])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  return { incidents, totalCount, loading, error, refetch: fetchIncidents }
}

/**
 * Fetch a single incident by ID with full details.
 * Scoped to the user's district and campus to prevent cross-campus URL tampering.
 */
export function useIncident(incidentId) {
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()
  const { scope, loading: scopeLoading } = useAccessScope()

  const fetchIncident = useCallback(async () => {
    if (!incidentId || !districtId || scopeLoading) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('incidents')
        .select(`
          *,
          student:students(*),
          offense:offense_codes(*),
          reporter:profiles!incidents_reported_by_fkey(id, full_name, role, email),
          reviewer:profiles!incidents_reviewed_by_fkey(id, full_name)
        `)
        .eq('id', incidentId)
        .eq('district_id', districtId)

      query = applyCampusScope(query, scope)

      const { data, error: fetchError } = await query.maybeSingle()

      if (fetchError) throw fetchError

      // Load compliance + transition plan separately (avoids FK hint failures)
      if (data) {
        if (data.compliance_checklist_id) {
          const { data: comp } = await supabase.from('compliance_checklists').select('*').eq('id', data.compliance_checklist_id).maybeSingle()
          data.compliance = comp || null
        }
        if (data.transition_plan_id) {
          const { data: plan } = await supabase.from('transition_plans').select('id, status, plan_type').eq('id', data.transition_plan_id).maybeSingle()
          data.transition_plan = plan || null
        }
      }

      setIncident(data)
    } catch (err) {
      console.error('Error fetching incident:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [incidentId, districtId, scope, scopeLoading])

  useEffect(() => {
    fetchIncident()
  }, [fetchIncident])

  return { incident, loading, error, refetch: fetchIncident }
}

/**
 * Fetch audit log for a single incident
 */
export function useIncidentAuditLog(incidentId) {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  const fetch = useCallback(async () => {
    if (!incidentId || !districtId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('incident_audit_log')
      .select('*, actor:profiles!incident_audit_log_user_id_fkey(id, full_name, role)')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true })
    setLog(data || [])
    setLoading(false)
  }, [incidentId, districtId])

  useEffect(() => { fetch() }, [fetch])
  return { log, loading, refetch: fetch }
}

/**
 * Incident CRUD operations
 */
export function useIncidentActions() {
  const { districtId, user } = useAuth()

  const logAudit = async (incidentId, action, notes = null) => {
    if (!districtId || !user?.id) return
    await supabase.from('incident_audit_log').insert({
      district_id: districtId,
      incident_id: incidentId,
      user_id: user.id,
      action,
      notes,
    })
  }

  const createIncident = async (incidentData) => {
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        ...incidentData,
        district_id: districtId,
        reported_by: user.id,
        status: 'submitted',
      })
      .select(`
        *,
        student:students(id, first_name, last_name, is_sped, is_504),
        offense:offense_codes(id, code, title, category)
      `)
      .single()

    if (!error && data) logAudit(data.id, 'created')

    // Notify approvers (admin, principal, AP, CBC, counselor) — non-blocking
    if (!error && data) {
      const studentName = `${data.student?.first_name || ''} ${data.student?.last_name || ''}`.trim()
      const incidentUrl = `${window.location.origin}/incidents/${data.id}`
      supabase
        .from('profiles')
        .select('email')
        .eq('district_id', districtId)
        .in('role', ['admin', 'principal', 'ap', 'cbc', 'counselor'])
        .neq('id', user.id)
        .then(({ data: approvers }) => {
          for (const a of approvers || []) {
            if (a.email) {
              supabase.functions.invoke('send-notification', {
                body: {
                  to: a.email,
                  subject: `New Incident Submitted — ${studentName}`,
                  template: 'incident_submitted',
                  data: {
                    studentName,
                    incidentDate: data.incident_date,
                    offense: data.offense?.title || '',
                    incidentUrl,
                  },
                },
              }).catch(() => {})
            }
          }
        })
    }

    return { data, error }
  }

  const updateIncident = async (id, updates) => {
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  }

  const approveIncident = async (id) => {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`*, student:students(id, first_name, last_name)`)
      .single()

    if (!error && data) logAudit(data.id, 'approved')

    // Auto-notify guardians (non-blocking)
    if (!error && data?.student_id) {
      supabase
        .from('student_guardians')
        .select('guardian:profiles!student_guardians_guardian_id_fkey(email, full_name)')
        .eq('student_id', data.student_id)
        .then(({ data: guardians }) => {
          for (const g of guardians || []) {
            const email = g.guardian?.email
            if (email) {
              supabase.functions.invoke('send-notification', {
                body: {
                  to: email,
                  subject: 'A discipline record has been added for your child',
                  template: 'parent_notice',
                  data: {
                    studentName: `${data.student?.first_name || ''} ${data.student?.last_name || ''}`.trim(),
                    portalUrl: `${window.location.origin}/parent`,
                  },
                },
              }).catch(() => {})
            }
          }
        })
    }

    return { data, error }
  }

  const activateIncident = async (id) => {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status: 'active' })
      .eq('id', id)
      .select(`*, student:students(id, first_name, last_name)`)
      .single()

    if (!error && data) logAudit(data.id, 'activated')

    // Auto-notify guardians when placement is activated (non-blocking)
    if (!error && data?.student_id) {
      supabase
        .from('student_guardians')
        .select('guardian:profiles!student_guardians_guardian_id_fkey(email)')
        .eq('student_id', data.student_id)
        .then(({ data: guardians }) => {
          for (const g of guardians || []) {
            const email = g.guardian?.email
            if (email) {
              supabase.functions.invoke('send-notification', {
                body: {
                  to: email,
                  subject: 'Your child\'s DAEP placement has been activated',
                  template: 'placement_starting',
                  data: {
                    studentName: `${data.student?.first_name || ''} ${data.student?.last_name || ''}`.trim(),
                    days: data.consequence_days || '',
                    endDate: data.consequence_end || '',
                    incidentUrl: `${window.location.origin}/parent`,
                  },
                },
              }).catch(() => {})
            }
          }
        })
    }

    return { data, error }
  }

  const completeIncident = async (id, notes = null) => {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) logAudit(data.id, 'completed', notes)
    return { data, error }
  }

  const returnIncident = async (id, reason) => {
    // Fetch existing notes to append, not overwrite
    const { data: existing } = await supabase.from('incidents').select('notes').eq('id', id).single()
    const existingNotes = existing?.notes || ''
    const newNotes = reason
      ? `${existingNotes}${existingNotes ? '\n\n' : ''}[RETURNED ${new Date().toLocaleDateString()}] ${reason}`
      : existingNotes || null

    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'returned',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes: newNotes,
      })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) logAudit(data.id, 'returned', reason || null)
    return { data, error }
  }

  const denyIncident = async (id, reason) => {
    const { data: existing } = await supabase.from('incidents').select('notes').eq('id', id).single()
    const existingNotes = existing?.notes || ''
    const newNotes = reason
      ? `${existingNotes}${existingNotes ? '\n\n' : ''}[DENIED ${new Date().toLocaleDateString()}] ${reason}`
      : existingNotes || null

    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'denied',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes: newNotes,
      })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) logAudit(data.id, 'denied', reason || null)
    return { data, error }
  }

  return { createIncident, updateIncident, approveIncident, activateIncident, completeIncident, denyIncident, returnIncident }
}
