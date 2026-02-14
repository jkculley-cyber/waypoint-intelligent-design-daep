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

  return { acknowledgeAlert, startProgress, updateActionItem, resolveAlert, dismissAlert }
}
