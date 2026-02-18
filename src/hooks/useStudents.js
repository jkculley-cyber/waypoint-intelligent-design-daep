import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Fetch a list of students with optional filters
 */
export function useStudents(filters = {}) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districtId } = useAuth()

  const fetchStudents = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('students')
        .select(`
          *,
          campus:campuses(id, name, campus_type),
          incidents(id, consequence_type, consequence_days, consequence_start, consequence_end, status, sped_compliance_required, compliance_cleared),
          daily_behavior_tracking(id, tracking_date)
        `)
        .eq('district_id', districtId)
        .eq('is_active', true)
        .order('last_name', { ascending: true })

      if (filters._campusScope) query = query.in('campus_id', filters._campusScope)
      if (filters.campus_id) query = query.eq('campus_id', filters.campus_id)
      if (filters.grade_level !== undefined && filters.grade_level !== '') {
        query = query.eq('grade_level', filters.grade_level)
      }
      // SPED-only scope: only show SPED or 504 students
      if (filters._spedOnly) query = query.or('is_sped.eq.true,is_504.eq.true')
      if (filters.is_sped) query = query.eq('is_sped', true)
      if (filters.is_504) query = query.eq('is_504', true)
      if (filters.is_ell) query = query.eq('is_ell', true)
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,student_id_number.ilike.%${filters.search}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [districtId, filters._campusScope, filters._spedOnly, filters.campus_id, filters.grade_level, filters.is_sped, filters.is_504, filters.is_ell, filters.search])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return { students, loading, error, refetch: fetchStudents }
}

/**
 * Fetch a single student by ID with full details
 */
export function useStudent(studentId) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }

    const fetchStudent = async () => {
      setLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('students')
          .select(`
            *,
            campus:campuses(id, name, campus_type),
            parent:profiles!parent_profile_id(id, full_name, email, phone)
          `)
          .eq('id', studentId)
          .single()

        if (fetchError) throw fetchError
        setStudent(data)
      } catch (err) {
        console.error('Error fetching student:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchStudent()
  }, [studentId])

  return { student, loading, error }
}

/**
 * Student CRUD operations
 */
export function useStudentActions() {
  const { districtId } = useAuth()

  const createStudent = async (studentData) => {
    const { data, error } = await supabase
      .from('students')
      .insert({ ...studentData, district_id: districtId })
      .select()
      .single()

    return { data, error }
  }

  const updateStudent = async (id, updates) => {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  }

  return { createStudent, updateStudent }
}
