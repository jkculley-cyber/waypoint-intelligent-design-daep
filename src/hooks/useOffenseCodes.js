import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch offense codes (system-wide + district-specific)
 */
export function useOffenseCodes(filters = {}) {
  const [offenseCodes, setOffenseCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('offense_codes')
        .select('*')
        .or(`district_id.is.null,district_id.eq.${districtId}`)
        .order('category')
        .order('severity')

      if (filters.category) query = query.eq('category', filters.category)
      if (filters.severity) query = query.eq('severity', filters.severity)
      if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active)
      else query = query.eq('is_active', true)
      if (filters.search) query = query.ilike('name', `%${filters.search}%`)

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setOffenseCodes(data || [])
    } catch (err) {
      console.error('Error fetching offense codes:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId, filters.category, filters.severity, filters.is_active, filters.search])

  useEffect(() => {
    if (districtId) fetchCodes()
  }, [districtId, fetchCodes])

  return { offenseCodes, loading, error, refetch: fetchCodes }
}

/**
 * Fetch a single offense code
 */
export function useOffenseCode(id) {
  const [offenseCode, setOffenseCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setOffenseCode(null)
      setLoading(false)
      return
    }

    const fetchCode = async () => {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('offense_codes')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        setError(fetchError)
      } else {
        setOffenseCode(data)
      }
      setLoading(false)
    }

    fetchCode()
  }, [id])

  return { offenseCode, loading, error }
}

/**
 * Offense code CRUD actions
 */
export function useOffenseCodeActions() {
  const { districtId } = useAuth()

  const createOffenseCode = async (data) => {
    const { data: result, error } = await supabase
      .from('offense_codes')
      .insert({ ...data, district_id: districtId })
      .select()
      .single()
    return { data: result, error }
  }

  const updateOffenseCode = async (id, data) => {
    const { data: result, error } = await supabase
      .from('offense_codes')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    return { data: result, error }
  }

  const toggleOffenseCode = async (id, isActive) => {
    const { error } = await supabase
      .from('offense_codes')
      .update({ is_active: isActive })
      .eq('id', id)
    return { error }
  }

  return { createOffenseCode, updateOffenseCode, toggleOffenseCode }
}

/**
 * Fetch discipline matrix entries for a given offense code
 */
export function useDisciplineMatrix(offenseCodeId, districtId) {
  const [matrixEntries, setMatrixEntries] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!offenseCodeId || !districtId) {
      setMatrixEntries([])
      return
    }

    const fetchMatrix = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('discipline_matrix')
        .select('*')
        .eq('offense_code_id', offenseCodeId)
        .eq('district_id', districtId)
        .eq('is_active', true)
        .order('occurrence')

      if (!error) setMatrixEntries(data || [])
      setLoading(false)
    }

    fetchMatrix()
  }, [offenseCodeId, districtId])

  return { matrixEntries, loading }
}

/**
 * Fetch all matrix entries for the district (for the full matrix view)
 */
export function useFullDisciplineMatrix(filters = {}) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchMatrix = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    try {
      let query = supabase
        .from('discipline_matrix')
        .select(`
          *,
          offense_codes (
            id,
            name,
            code,
            category,
            severity,
            tec_reference,
            is_mandatory_daep,
            is_mandatory_expulsion
          )
        `)
        .eq('district_id', districtId)
        .eq('is_active', true)
        .order('offense_code_id')
        .order('occurrence')

      if (filters.category) {
        // Filter by joining with offense_codes
        query = query.eq('offense_codes.category', filters.category)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Filter out entries where the offense code join returned null (due to category filter)
      const filtered = filters.category
        ? (data || []).filter(e => e.offense_codes)
        : (data || [])

      setEntries(filtered)
    } catch (err) {
      console.error('Error fetching full matrix:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId, filters.category])

  useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  return { entries, loading, error, refetch: fetchMatrix }
}

/**
 * Count prior incidents for a student with a specific offense code
 */
export function useStudentOffenseCount(studentId, offenseCodeId) {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!studentId || !offenseCodeId) {
      setCount(0)
      return
    }

    const fetchCount = async () => {
      setLoading(true)
      const { count: total, error } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('offense_code_id', offenseCodeId)

      if (!error) setCount(total || 0)
      setLoading(false)
    }

    fetchCount()
  }, [studentId, offenseCodeId])

  return { count, loading }
}

/**
 * Discipline matrix CRUD actions
 */
export function useMatrixActions() {
  const { districtId } = useAuth()

  const createMatrixEntry = async (data) => {
    const { data: result, error } = await supabase
      .from('discipline_matrix')
      .insert({ ...data, district_id: districtId })
      .select()
      .single()
    return { data: result, error }
  }

  const updateMatrixEntry = async (id, data) => {
    const { data: result, error } = await supabase
      .from('discipline_matrix')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    return { data: result, error }
  }

  const deleteMatrixEntry = async (id) => {
    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('discipline_matrix')
      .update({ is_active: false })
      .eq('id', id)
    return { error }
  }

  const bulkCreateMatrixEntries = async (entries) => {
    const { data: result, error } = await supabase
      .from('discipline_matrix')
      .insert(entries.map(e => ({ ...e, district_id: districtId })))
      .select()
    return { data: result, error }
  }

  return { createMatrixEntry, updateMatrixEntry, deleteMatrixEntry, bulkCreateMatrixEntries }
}
