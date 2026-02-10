import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Kiosk authentication - validates student ID for check-in
 */
export function useKioskAuth() {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const authenticateStudent = async (studentIdNumber, campusId) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, student_id_number, grade_level, campus_id, district_id, is_sped, is_504')
        .eq('student_id_number', studentIdNumber)
        .eq('is_active', true)

      // Only filter by campus if a campus ID is provided
      if (campusId) {
        query = query.eq('campus_id', campusId)
      }

      const { data, error: fetchError } = await query.single()

      if (fetchError) {
        setError('Student not found. Please check your ID and try again.')
        setStudent(null)
      } else {
        setStudent(data)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setStudent(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setStudent(null)
    setError(null)
  }

  return { student, loading, error, authenticateStudent, logout }
}

/**
 * Daily behavior tracking for a student
 */
export function useDailyBehavior(studentId, date) {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchRecord = useCallback(async () => {
    if (!studentId || !date) {
      setRecord(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('daily_behavior_tracking')
      .select('*')
      .eq('student_id', studentId)
      .eq('tracking_date', date)
      .maybeSingle()

    setRecord(data)
    setLoading(false)
  }, [studentId, date])

  useEffect(() => {
    fetchRecord()
  }, [fetchRecord])

  return { record, loading, refetch: fetchRecord }
}

/**
 * Daily behavior CRUD actions
 */
export function useBehaviorActions() {
  const checkIn = async (studentId, campusId, districtId, options = {}) => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    const { phoneBagNumber } = options

    // Check if record exists for today
    const { data: existing } = await supabase
      .from('daily_behavior_tracking')
      .select('id')
      .eq('student_id', studentId)
      .eq('tracking_date', today)
      .maybeSingle()

    if (existing) {
      // Already checked in today — update bag number if provided (ignore error if column missing)
      if (phoneBagNumber) {
        try {
          await supabase
            .from('daily_behavior_tracking')
            .update({ phone_bag_number: phoneBagNumber })
            .eq('id', existing.id)
        } catch (_) { /* column may not exist yet */ }
      }
      return { data: existing, error: null, alreadyCheckedIn: true }
    } else {
      // Create new record
      const baseData = {
        student_id: studentId,
        campus_id: campusId,
        district_id: districtId,
        tracking_date: today,
        check_in_time: now,
        status: 'checked_in',
        period_scores: {},
      }

      if (phoneBagNumber) {
        // Try with bag number first; fall back without if column doesn't exist yet
        const { data, error } = await supabase
          .from('daily_behavior_tracking')
          .insert({ ...baseData, phone_bag_number: phoneBagNumber })
          .select()
          .single()

        if (error) {
          // Retry without phone_bag_number in case migration 011 hasn't been applied
          const retry = await supabase
            .from('daily_behavior_tracking')
            .insert(baseData)
            .select()
            .single()
          return retry
        }
        return { data, error }
      }

      const { data, error } = await supabase
        .from('daily_behavior_tracking')
        .insert(baseData)
        .select()
        .single()
      return { data, error }
    }
  }

  const checkOut = async (recordId) => {
    const { data, error } = await supabase
      .from('daily_behavior_tracking')
      .update({
        check_out_time: new Date().toISOString(),
        status: 'checked_out',
      })
      .eq('id', recordId)
      .select()
      .single()
    return { data, error }
  }

  const updatePeriodScore = async (recordId, period, score, notes) => {
    // First get current scores
    const { data: current } = await supabase
      .from('daily_behavior_tracking')
      .select('period_scores')
      .eq('id', recordId)
      .single()

    const updatedScores = {
      ...(current?.period_scores || {}),
      [period]: { score, notes, updated_at: new Date().toISOString() },
    }

    const { data, error } = await supabase
      .from('daily_behavior_tracking')
      .update({ period_scores: updatedScores })
      .eq('id', recordId)
      .select()
      .single()
    return { data, error }
  }

  const updateDailyNotes = async (recordId, notes) => {
    const { data, error } = await supabase
      .from('daily_behavior_tracking')
      .update({ daily_notes: notes })
      .eq('id', recordId)
      .select()
      .single()
    return { data, error }
  }

  return { checkIn, checkOut, updatePeriodScore, updateDailyNotes }
}

/**
 * Fetch today's check-ins for a campus (admin end-of-day phone return view)
 */
export function useTodayCheckIns(campusId) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(async () => {
    if (!campusId) {
      setRecords([])
      setLoading(false)
      return
    }

    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('daily_behavior_tracking')
      .select('id, student_id, check_in_time, check_out_time, status, phone_bag_number, students(id, first_name, last_name, student_id_number, grade_level)')
      .eq('campus_id', campusId)
      .eq('tracking_date', today)
      .order('check_in_time', { ascending: true })

    setRecords(data || [])
    setLoading(false)
  }, [campusId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return { records, loading, refetch: fetchRecords }
}

/**
 * Fetch behavior history for a student
 */
export function useBehaviorHistory(studentId, limit = 30) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setRecords([])
      setLoading(false)
      return
    }

    const fetchHistory = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('daily_behavior_tracking')
        .select('*')
        .eq('student_id', studentId)
        .order('tracking_date', { ascending: false })
        .limit(limit)

      setRecords(data || [])
      setLoading(false)
    }

    fetchHistory()
  }, [studentId, limit])

  return { records, loading }
}
