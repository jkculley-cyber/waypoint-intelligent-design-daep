import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch alerts with optional filters
 */
export function useAlerts(filters = {}) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const initialLoadDone = useRef(false)
  const { districtId } = useAuth()

  const fetchAlerts = useCallback(async () => {
    if (!districtId) return
    if (!initialLoadDone.current) {
      setLoading(true)
    }
    setError(null)

    try {
      let query = supabase
        .from('alerts')
        .select(`
          *,
          student:students(id, first_name, last_name, middle_name, student_id_number, grade_level, is_sped, is_504, is_ell, is_homeless, is_foster_care, sped_eligibility, campus_id),
          campus:campuses(id, name),
          resolved_by_profile:profiles!resolved_by(id, full_name)
        `)
        .not('student_id', 'is', null)
        .eq('district_id', districtId)
        .order('created_at', { ascending: false })

      if (filters._campusScope) query = query.in('campus_id', filters._campusScope)
      if (filters.alert_level) query = query.eq('alert_level', filters.alert_level)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.campus_id) query = query.eq('campus_id', filters.campus_id)
      if (filters.student_id) query = query.eq('student_id', filters.student_id)
      if (filters.trigger_type) query = query.eq('trigger_type', filters.trigger_type)

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      let results = data || []
      // Filter out orphaned alerts whose student record no longer exists
      results = results.filter(a => a.student !== null)
      // SPED-only scope: only show alerts for SPED/504 students
      if (filters._spedOnly) {
        results = results.filter(a => a.student?.is_sped || a.student?.is_504)
      }
      setAlerts(results)
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setError(err)
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [districtId, filters._campusScope, filters._spedOnly, filters.alert_level, filters.status, filters.campus_id, filters.student_id, filters.trigger_type])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  return { alerts, loading, error, refetch: fetchAlerts }
}

/**
 * Fetch a single alert by ID
 */
export function useAlert(alertId) {
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAlert = useCallback(async () => {
    if (!alertId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('alerts')
        .select(`
          *,
          student:students(*),
          campus:campuses(id, name, campus_type),
          resolved_by_profile:profiles!resolved_by(id, full_name, role)
        `)
        .eq('id', alertId)
        .single()

      if (fetchError) throw fetchError
      setAlert(data)
    } catch (err) {
      console.error('Error fetching alert:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [alertId])

  useEffect(() => {
    fetchAlert()
  }, [fetchAlert])

  return { alert, loading, error, refetch: fetchAlert }
}

/**
 * Get active alert counts for badges
 */
export function useAlertCounts() {
  const [counts, setCounts] = useState({ total: 0, red: 0, yellow: 0 })
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  const fetchCounts = useCallback(async () => {
    if (!districtId) return

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, alert_level')
        .eq('district_id', districtId)
        .in('status', ['active', 'acknowledged', 'in_progress'])

      if (error) throw error

      const red = (data || []).filter(a => a.alert_level === 'red').length
      const yellow = (data || []).filter(a => a.alert_level === 'yellow').length
      setCounts({ total: red + yellow, red, yellow })
    } catch (err) {
      console.error('Error fetching alert counts:', err)
    } finally {
      setLoading(false)
    }
  }, [districtId])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return { counts, loading, refetch: fetchCounts }
}

/**
 * Alert action operations
 */
export function useAlertActions() {
  const { user } = useAuth()

  const acknowledgeAlert = async (alertId) => {
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'acknowledged' })
      .eq('id', alertId)
      .select()
      .single()

    return { data, error }
  }

  const startProgress = async (alertId) => {
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'in_progress' })
      .eq('id', alertId)
      .select()
      .single()

    return { data, error }
  }

  const updateActionItem = async (alertId, field, value) => {
    const update = { [field]: value || new Date().toISOString() }

    const { data, error } = await supabase
      .from('alerts')
      .update(update)
      .eq('id', alertId)
      .select()
      .single()

    return { data, error }
  }

  const resolveAlert = async (alertId, notes) => {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq('id', alertId)
      .select()
      .single()

    return { data, error }
  }

  const dismissAlert = async (alertId, notes) => {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        status: 'dismissed',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      })
      .eq('id', alertId)
      .select()
      .single()

    return { data, error }
  }

  const createAlert = async ({ districtId, studentId, campusId, alertLevel, triggerType, triggerDescription, planId, incidentId, suggestedInterventions }) => {
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        district_id: districtId,
        student_id: studentId,
        campus_id: campusId,
        alert_level: alertLevel,
        trigger_type: triggerType,
        trigger_description: triggerDescription,
        plan_id: planId || null,
        incident_id: incidentId || null,
        suggested_interventions: suggestedInterventions || [],
        status: 'active',
      })
      .select()
      .single()
    return { data, error }
  }

  return { acknowledgeAlert, startProgress, updateActionItem, resolveAlert, dismissAlert, createAlert }
}

/**
 * Checks for overdue transition plan reviews and creates alerts for any not yet alerted.
 * Runs once per browser session (tracked via sessionStorage) to avoid creating duplicates.
 * Requires migration 052 (plan_id on alerts).
 */
export function useTransitionReviewOverdueAlerts(plans) {
  const { districtId, profile } = useAuth()
  const sessionKey = `waypoint_tpr_overdue_checked_${districtId}`

  useEffect(() => {
    if (!districtId || !plans?.length) return
    if (sessionStorage.getItem(sessionKey)) return

    const runCheck = async () => {
      sessionStorage.setItem(sessionKey, '1')

      const today = new Date()
      const overduePlans = []

      for (const plan of plans) {
        if (!['active', 'extended'].includes(plan.status)) continue
        if (!plan.start_date) continue

        const start = new Date(plan.start_date)
        const daysElapsed = Math.floor((today - start) / 86400000)

        // Determine overdue milestone (30/60/90)
        let overdueMilestone = null
        if (daysElapsed >= 90) overdueMilestone = 90
        else if (daysElapsed >= 60) overdueMilestone = 60
        else if (daysElapsed >= 30) overdueMilestone = 30

        if (!overdueMilestone) continue
        if (!plan.students?.id) continue

        overduePlans.push({ plan, milestone: overdueMilestone })
      }

      if (overduePlans.length === 0) return

      // Check which plans already have an active/acknowledged overdue alert
      const planIds = overduePlans.map(p => p.plan.id)
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('plan_id')
        .eq('district_id', districtId)
        .eq('trigger_type', 'transition_review_overdue')
        .in('status', ['active', 'acknowledged', 'in_progress'])
        .in('plan_id', planIds)

      const alertedPlanIds = new Set((existingAlerts || []).map(a => a.plan_id))

      // Create alerts for any overdue plans not yet alerted
      for (const { plan, milestone } of overduePlans) {
        if (alertedPlanIds.has(plan.id)) continue
        const studentName = plan.students
          ? `${plan.students.first_name} ${plan.students.last_name}`
          : 'Unknown Student'

        await supabase.from('alerts').insert({
          district_id: districtId,
          student_id: plan.students.id,
          campus_id: plan.students.campus_id || null,
          alert_level: 'yellow',
          trigger_type: 'transition_review_overdue',
          trigger_description: `${studentName} — ${milestone}-day transition plan review is overdue`,
          plan_id: plan.id,
          status: 'active',
          suggested_interventions: [],
        })
      }
    }

    runCheck()
  }, [districtId, plans])
}

/**
 * Checks for incidents stuck in pending_approval for 3+ days and creates escalation alerts.
 * Runs once per browser session.
 */
export function useApprovalEscalationAlerts() {
  const { districtId } = useAuth()
  const sessionKey = `waypoint_approval_esc_checked_${districtId}`

  useEffect(() => {
    if (!districtId) return
    if (sessionStorage.getItem(sessionKey)) return

    const runCheck = async () => {
      sessionStorage.setItem(sessionKey, '1')

      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()

      // Incidents pending approval for 3+ days
      const { data: stalePending } = await supabase
        .from('incidents')
        .select('id, student_id, campus_id, updated_at, students(first_name, last_name)')
        .eq('district_id', districtId)
        .eq('status', 'pending_approval')
        .lt('updated_at', threeDaysAgo)
        .limit(20)

      if (!stalePending?.length) return

      const incidentIds = stalePending.map(i => i.id)

      // Check which already have an escalation alert
      const { data: existing } = await supabase
        .from('alerts')
        .select('incident_id')
        .eq('district_id', districtId)
        .eq('trigger_type', 'approval_pending_escalation')
        .in('status', ['active', 'acknowledged', 'in_progress'])
        .in('incident_id', incidentIds)

      const alertedIds = new Set((existing || []).map(a => a.incident_id))

      for (const incident of stalePending) {
        if (alertedIds.has(incident.id)) continue
        const studentName = incident.students
          ? `${incident.students.first_name} ${incident.students.last_name}`
          : 'Unknown Student'
        const daysWaiting = Math.floor((Date.now() - new Date(incident.updated_at)) / 86400000)

        await supabase.from('alerts').insert({
          district_id: districtId,
          student_id: incident.student_id,
          campus_id: incident.campus_id || null,
          alert_level: 'yellow',
          trigger_type: 'approval_pending_escalation',
          trigger_description: `${studentName} — incident pending approval for ${daysWaiting} days`,
          incident_id: incident.id,
          status: 'active',
          suggested_interventions: [],
        })
      }
    }

    runCheck()
  }, [districtId])
}
