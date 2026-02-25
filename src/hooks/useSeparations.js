import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Separation orders for a given incident.
 * Returns separations with the linked student's details.
 */
export function useSeparations(incidentId) {
  const [separations, setSeparations] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  const fetchSeparations = useCallback(async () => {
    if (!incidentId || !districtId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('incident_separations')
        .select(`
          id, notes, created_at,
          other_student:students!incident_separations_other_student_id_fkey(
            id, first_name, last_name, student_id_number, grade_level,
            campus:campuses(id, name)
          ),
          created_by_profile:profiles!incident_separations_created_by_fkey(id, full_name)
        `)
        .eq('incident_id', incidentId)
        .eq('district_id', districtId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setSeparations(data || [])
    } catch (err) {
      console.error('Error fetching separations:', err)
    } finally {
      setLoading(false)
    }
  }, [incidentId, districtId])

  useEffect(() => {
    fetchSeparations()
  }, [fetchSeparations])

  const addSeparation = useCallback(async (otherStudentId, notes) => {
    if (!incidentId || !districtId) return { error: 'Missing context' }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('incident_separations')
      .insert({
        incident_id: incidentId,
        district_id: districtId,
        other_student_id: otherStudentId,
        notes: notes || null,
        created_by: user?.id || null,
      })
    if (!error) await fetchSeparations()
    return { error }
  }, [incidentId, districtId, fetchSeparations])

  const removeSeparation = useCallback(async (separationId) => {
    const { error } = await supabase
      .from('incident_separations')
      .delete()
      .eq('id', separationId)
    if (!error) await fetchSeparations()
    return { error }
  }, [fetchSeparations])

  return { separations, loading, addSeparation, removeSeparation }
}

/**
 * Debounced student search within the district.
 * Used in the SeparationSearchModal to find students by name or ID.
 */
export function useStudentSearch(query, districtId) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.trim().length < 2 || !districtId) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const term = query.trim()
        const { data, error } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_id_number, grade_level, campus:campuses(id, name)')
          .eq('district_id', districtId)
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id_number.ilike.%${term}%`)
          .order('last_name', { ascending: true })
          .limit(20)

        if (error) throw error
        setResults(data || [])
      } catch (err) {
        console.error('Error searching students:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, districtId])

  return { results, loading }
}
