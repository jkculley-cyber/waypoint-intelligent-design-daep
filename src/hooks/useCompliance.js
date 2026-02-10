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
          student:students(id, first_name, last_name, student_id_number, grade_level, is_sped, is_504, sped_eligibility),
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
      setChecklists(data || [])
    } catch (err) {
      console.error('Error fetching compliance checklists:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId, filters.status, filters.placement_blocked])

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

  const fetchChecklist = useCallback(async () => {
    if (!checklistId) {
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
        .single()

      if (fetchError) throw fetchError
      setChecklist(data)
    } catch (err) {
      console.error('Error fetching checklist:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [checklistId])

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

  const updateChecklistItem = async (checklistId, field, value) => {
    const update = { [field]: value || new Date().toISOString() }

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

  const overrideBlock = async (checklistId, reason) => {
    const { data, error } = await supabase
      .from('compliance_checklists')
      .update({
        block_overridden: true,
        override_reason: reason,
        override_by: user.id,
        placement_blocked: false,
      })
      .eq('id', checklistId)
      .select()
      .single()

    if (!error) {
      // Also update the incident
      const checklist = data
      await supabase
        .from('incidents')
        .update({
          compliance_cleared: true,
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', checklist.incident_id)
    }

    return { data, error }
  }

  return { updateChecklistItem, updateChecklist, overrideBlock }
}
