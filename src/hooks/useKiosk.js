import { useState, useEffect, useCallback, useRef } from 'react'
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
      // SECURITY DEFINER RPC — anon role never queries the students table directly
      const { data, error: fetchError } = await supabase.rpc('lookup_student_for_kiosk', {
        p_student_id_number: studentIdNumber,
        p_campus_id: campusId || null,
      })

      if (fetchError || !data || data.length === 0) {
        setError('Student not found. Please check your ID and try again.')
        setStudent(null)
      } else {
        setStudent(data[0])
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

    // First check: look up any existing record for today (fast path, avoids write on most re-visits)
    const { data: existing } = await supabase
      .from('daily_behavior_tracking')
      .select('id')
      .eq('student_id', studentId)
      .eq('tracking_date', today)
      .maybeSingle()

    if (existing) {
      // Already checked in — update bag number if provided
      if (phoneBagNumber) {
        await supabase
          .from('daily_behavior_tracking')
          .update({ phone_bag_number: phoneBagNumber })
          .eq('id', existing.id)
      }
      return { data: existing, error: null, alreadyCheckedIn: true }
    }

    // Attempt insert. The DB unique constraint on (student_id, tracking_date)
    // guarantees only one record per day even under concurrent requests.
    const baseData = {
      student_id: studentId,
      campus_id: campusId,
      district_id: districtId,
      tracking_date: today,
      check_in_time: now,
      status: 'checked_in',
      period_scores: {},
      ...(phoneBagNumber ? { phone_bag_number: phoneBagNumber } : {}),
    }

    const { data, error } = await supabase
      .from('daily_behavior_tracking')
      .insert(baseData)
      .select()
      .single()

    // code 23505 = unique_violation — another request beat us to it (race condition)
    // Treat as "already checked in" rather than an error.
    if (error?.code === '23505') {
      const { data: raceRecord } = await supabase
        .from('daily_behavior_tracking')
        .select('id')
        .eq('student_id', studentId)
        .eq('tracking_date', today)
        .maybeSingle()
      return { data: raceRecord, error: null, alreadyCheckedIn: true }
    }

    // If insert failed for another reason (e.g. phone_bag_number column missing),
    // retry without it — migration 011 may not have been applied yet.
    if (error && phoneBagNumber) {
      const { data: retry, error: retryErr } = await supabase
        .from('daily_behavior_tracking')
        .insert({ ...baseData, phone_bag_number: undefined })
        .select()
        .single()
      return { data: retry, error: retryErr }
    }

    return { data, error }
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
  const channelRef = useRef(null)

  const fetchRecords = useCallback(async () => {
    if (!campusId) {
      setRecords([])
      setLoading(false)
      return
    }

    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    let query = supabase
      .from('daily_behavior_tracking')
      .select('id, student_id, check_in_time, check_out_time, status, phone_bag_number, campus_id, students(id, first_name, last_name, student_id_number, grade_level)')
      .eq('tracking_date', today)
      .order('check_in_time', { ascending: true })

    // Filter by campus unless 'all' is passed
    if (campusId !== 'all') {
      query = query.eq('campus_id', campusId)
    }

    const { data } = await query

    setRecords(data || [])
    setLoading(false)
  }, [campusId])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Realtime subscription - auto-refetch when check-ins change
  useEffect(() => {
    if (!campusId) return

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channelConfig = {
      event: '*',
      schema: 'public',
      table: 'daily_behavior_tracking',
    }
    // Only filter by campus if not showing all
    if (campusId !== 'all') {
      channelConfig.filter = `campus_id=eq.${campusId}`
    }

    const channel = supabase
      .channel(`phone-return-${campusId}`)
      .on('postgres_changes', channelConfig, () => {
        fetchRecords()
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [campusId, fetchRecords])

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
