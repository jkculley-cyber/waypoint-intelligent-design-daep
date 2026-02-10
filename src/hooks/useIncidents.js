import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch incidents with optional filters
 */
export function useIncidents(filters = {}) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchIncidents = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('incidents')
        .select(`
          *,
          student:students(id, first_name, last_name, middle_name, grade_level, student_id_number, is_sped, is_504, is_ell, is_homeless, is_foster_care, sped_eligibility),
          offense:offense_codes(id, code, title, category, severity),
          reporter:profiles!incidents_reported_by_fkey(id, full_name, role),
          reviewer:profiles!incidents_reviewed_by_fkey(id, full_name),
          compliance:compliance_checklists!fk_incidents_compliance(id, status, placement_blocked)
        `)
        .eq('district_id', districtId)
        .order('incident_date', { ascending: false })

      if (filters._campusScope) query = query.in('campus_id', filters._campusScope)
      if (filters.campus_id) query = query.eq('campus_id', filters.campus_id)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.student_id) query = query.eq('student_id', filters.student_id)
      if (filters.consequence_type) query = query.eq('consequence_type', filters.consequence_type)
      if (filters.sped_compliance_required !== undefined) {
        query = query.eq('sped_compliance_required', filters.sped_compliance_required)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setIncidents(data || [])
    } catch (err) {
      console.error('Error fetching incidents:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId, filters._campusScope, filters.campus_id, filters.status, filters.student_id, filters.consequence_type, filters.sped_compliance_required])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  return { incidents, loading, error, refetch: fetchIncidents }
}

/**
 * Fetch a single incident by ID with full details
 */
export function useIncident(incidentId) {
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchIncident = useCallback(async () => {
    if (!incidentId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('incidents')
        .select(`
          *,
          student:students(*),
          offense:offense_codes(*),
          reporter:profiles!incidents_reported_by_fkey(id, full_name, role, email),
          reviewer:profiles!incidents_reviewed_by_fkey(id, full_name),
          compliance:compliance_checklists!fk_incidents_compliance(*),
          transition_plan:transition_plans!fk_incidents_transition_plan(id, status, plan_type)
        `)
        .eq('id', incidentId)
        .single()

      if (fetchError) throw fetchError
      setIncident(data)
    } catch (err) {
      console.error('Error fetching incident:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    fetchIncident()
  }, [fetchIncident])

  return { incident, loading, error, refetch: fetchIncident }
}

/**
 * Incident CRUD operations
 */
export function useIncidentActions() {
  const { districtId, user } = useAuth()

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
      .select()
      .single()

    return { data, error }
  }

  const activateIncident = async (id) => {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  }

  const completeIncident = async (id) => {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  }

  return { createIncident, updateIncident, approveIncident, activateIncident, completeIncident }
}
