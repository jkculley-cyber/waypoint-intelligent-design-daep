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
  const checkIn = async (studentId, campusId, districtId) => {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Check if record exists for today
    const { data: existing } = await supabase
      .from('daily_behavior_tracking')
      .select('id')
      .eq('student_id', studentId)
      .eq('tracking_date', today)
      .maybeSingle()

    if (existing) {
      // Already checked in today — do not re-stamp
      return { data: existing, error: null, alreadyCheckedIn: true }
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('daily_behavior_tracking')
        .insert({
          student_id: studentId,
          campus_id: campusId,
          district_id: districtId,
          tracking_date: today,
          check_in_time: now,
          status: 'checked_in',
          period_scores: {},
        })
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
