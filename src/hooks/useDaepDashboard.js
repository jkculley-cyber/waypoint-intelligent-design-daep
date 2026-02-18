import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccessScope } from './useAccessScope'
import { applyCampusScope } from '../lib/accessControl'
import { getSchoolYearStart } from '../lib/utils'

/**
 * Helper: check if a student is SPED or 504.
 */
function isSpedStudent(student) {
  return student?.is_sped || student?.is_504
}

/**
 * Summary stat counts for DAEP dashboard top cards.
 */
export function useDaepSummaryStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()
  const { scope, loading: scopeLoading } = useAccessScope()

  useEffect(() => {
    if (!districtId || scopeLoading) return

    const fetchStats = async () => {
      setLoading(true)
      const schoolYearStart = getSchoolYearStart().toISOString()

      try {
        if (scope.spedOnly) {
          // SPED coordinator: fetch rows with student data, filter client-side
          let query = supabase
            .from('incidents')
            .select('id, status, incident_date, student:students(id, is_sped, is_504)')
            .eq('district_id', districtId)
            .eq('consequence_type', 'daep')
          query = applyCampusScope(query, scope)
          const { data, error } = await query
          if (error) throw error

          const rows = (data || []).filter(r => isSpedStudent(r.student))
          setStats({
            activeEnrollments: rows.filter(r => ['active', 'approved'].includes(r.status)).length,
            pendingPlacements: rows.filter(r => ['submitted', 'under_review', 'compliance_hold'].includes(r.status)).length,
            completedYtd: rows.filter(r => r.status === 'completed' && r.incident_date >= schoolYearStart).length,
            complianceHolds: rows.filter(r => r.status === 'compliance_hold').length,
          })
        } else {
          // Standard count queries
          let activeQuery = supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('district_id', districtId)
            .eq('consequence_type', 'daep')
            .in('status', ['active', 'approved'])
          activeQuery = applyCampusScope(activeQuery, scope)
          const { count: activeEnrollments } = await activeQuery

          let pendingQuery = supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('district_id', districtId)
            .eq('consequence_type', 'daep')
            .in('status', ['submitted', 'under_review', 'compliance_hold'])
          pendingQuery = applyCampusScope(pendingQuery, scope)
          const { count: pendingPlacements } = await pendingQuery

          let completedQuery = supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('district_id', districtId)
            .eq('consequence_type', 'daep')
            .eq('status', 'completed')
            .gte('incident_date', schoolYearStart)
          completedQuery = applyCampusScope(completedQuery, scope)
          const { count: completedYtd } = await completedQuery

          let holdsQuery = supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('district_id', districtId)
            .eq('consequence_type', 'daep')
            .eq('status', 'compliance_hold')
          holdsQuery = applyCampusScope(holdsQuery, scope)
          const { count: complianceHolds } = await holdsQuery

          setStats({
            activeEnrollments: activeEnrollments || 0,
            pendingPlacements: pendingPlacements || 0,
            completedYtd: completedYtd || 0,
            complianceHolds: complianceHolds || 0,
          })
        }
      } catch (err) {
        console.error('Error fetching DAEP summary stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [districtId, scopeLoading, scope])

  return { stats, loading }
}

/**
 * Active DAEP enrollments with student details and instructional day calculations.
 */
export function useActiveDaepEnrollments() {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()
  const { scope, loading: scopeLoading } = useAccessScope()

  const fetchEnrollments = useCallback(async () => {
    if (!districtId || scopeLoading) return
    setLoading(true)
    try {
      let query = supabase
        .from('incidents')
        .select(`
          id, incident_date, consequence_start, consequence_end, consequence_days, days_absent, status,
          student:students(id, first_name, last_name, middle_name, grade_level, student_id_number,
            is_sped, is_504, is_ell, is_homeless, is_foster_care, campus_id),
          campus:campuses!campus_id(id, name),
          offense:offense_codes(id, code, title)
        `)
        .eq('district_id', districtId)
        .eq('consequence_type', 'daep')
        .in('status', ['active', 'approved', 'completed'])

      query = applyCampusScope(query, scope)
      const { data, error } = await query

      if (error) throw error

      // Fetch check-in counts for each enrollment to calculate days served
      const enriched = await Promise.all((data || []).map(async (row) => {
        let daysServed = 0
        if (row.consequence_start && row.student?.id) {
          let countQuery = supabase
            .from('daily_behavior_tracking')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', row.student.id)
            .gte('tracking_date', row.consequence_start)
          if (row.consequence_end) {
            countQuery = countQuery.lte('tracking_date', row.consequence_end)
          }
          const { count } = await countQuery
          daysServed = count || 0
        }

        const totalAssigned = row.consequence_days || 0
        const daysRemaining = totalAssigned > 0 ? Math.max(0, totalAssigned - daysServed) : null
        const daysElapsed = daysServed
        const daysTotal = totalAssigned

        return { ...row, daysRemaining, daysElapsed, daysTotal, daysServed }
      }))

      const filtered = scope.spedOnly
        ? enriched.filter(r => isSpedStudent(r.student))
        : enriched
      filtered.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
      setEnrollments(filtered)
    } catch (err) {
      console.error('Error fetching active DAEP enrollments:', err)
    } finally {
      setLoading(false)
    }
  }, [districtId, scopeLoading, scope])

  useEffect(() => {
    if (!districtId || scopeLoading) return
    fetchEnrollments()
  }, [fetchEnrollments, districtId, scopeLoading])

  return { enrollments, loading, refetch: fetchEnrollments }
}

/**
 * Pending DAEP placements (submitted / under_review / compliance_hold).
 */
export function usePendingDaepEnrollments() {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()
  const { scope, loading: scopeLoading } = useAccessScope()

  useEffect(() => {
    if (!districtId || scopeLoading) return

    const fetchPending = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('incidents')
          .select(`
            id, incident_date, consequence_days, status,
            student:students(id, first_name, last_name, middle_name, grade_level, student_id_number,
              is_sped, is_504, is_ell, is_homeless, is_foster_care),
            offense:offense_codes(id, code, title),
            compliance:compliance_checklists!fk_incidents_compliance(id, status, placement_blocked)
          `)
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .in('status', ['submitted', 'under_review', 'compliance_hold'])
          .order('incident_date', { ascending: false })

        query = applyCampusScope(query, scope)
        const { data, error } = await query

        if (error) throw error
        const filtered = scope.spedOnly
          ? (data || []).filter(r => isSpedStudent(r.student))
          : (data || [])
        setEnrollments(filtered)
      } catch (err) {
        console.error('Error fetching pending DAEP enrollments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPending()
  }, [districtId, scopeLoading, scope])

  return { enrollments, loading }
}

/**
 * Sub-population breakdowns for all DAEP incidents this school year.
 */
export function useDaepSubPopulations() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()
  const { scope, loading: scopeLoading } = useAccessScope()

  useEffect(() => {
    if (!districtId || scopeLoading) return

    const fetchData = async () => {
      setLoading(true)
      const schoolYearStart = getSchoolYearStart().toISOString()

      try {
        let query = supabase
          .from('incidents')
          .select(`
            id,
            student:students(id, race, gender, is_sped, is_504, is_ell, grade_level, is_homeless, is_foster_care)
          `)
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .gte('incident_date', schoolYearStart)

        query = applyCampusScope(query, scope)
        const { data: incidents, error } = await query

        if (error) throw error
        const filteredIncidents = scope.spedOnly
          ? (incidents || []).filter(i => isSpedStudent(i.student))
          : (incidents || [])
        if (!filteredIncidents.length) {
          setData({
            byRace: [], byGender: [], bySped: [], byGrade: [],
            homeless: 0, fosterCare: 0, total: 0,
          })
          setLoading(false)
          return
        }

        // Group by Race/Ethnicity
        const raceGroups = {}
        filteredIncidents.forEach(i => {
          const key = i.student?.race || 'Unknown'
          raceGroups[key] = (raceGroups[key] || 0) + 1
        })
        const byRace = Object.entries(raceGroups)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)

        // Group by Gender
        const genderGroups = {}
        filteredIncidents.forEach(i => {
          const key = i.student?.gender || 'Unknown'
          genderGroups[key] = (genderGroups[key] || 0) + 1
        })
        const byGender = Object.entries(genderGroups)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)

        // Group by SPED/504/Gen Ed
        const spedCounts = { SPED: 0, '504': 0, 'Gen Ed': 0 }
        filteredIncidents.forEach(i => {
          if (i.student?.is_sped) spedCounts.SPED++
          else if (i.student?.is_504) spedCounts['504']++
          else spedCounts['Gen Ed']++
        })
        const bySped = Object.entries(spedCounts).map(([name, value]) => ({ name, value }))

        // Group by Grade Level
        const gradeGroups = {}
        filteredIncidents.forEach(i => {
          const grade = i.student?.grade_level
          const key = grade === -1 ? 'Pre-K' : grade === 0 ? 'K' : grade != null ? `${grade}` : 'Unknown'
          gradeGroups[key] = (gradeGroups[key] || 0) + 1
        })
        const byGrade = Object.entries(gradeGroups)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => {
            const numA = a.name === 'Pre-K' ? -1 : a.name === 'K' ? 0 : parseInt(a.name) || 99
            const numB = b.name === 'Pre-K' ? -1 : b.name === 'K' ? 0 : parseInt(b.name) || 99
            return numA - numB
          })

        // Count homeless & foster care
        const homeless = filteredIncidents.filter(i => i.student?.is_homeless).length
        const fosterCare = filteredIncidents.filter(i => i.student?.is_foster_care).length

        setData({
          byRace, byGender, bySped, byGrade,
          homeless, fosterCare,
          total: filteredIncidents.length,
        })
      } catch (err) {
        console.error('Error fetching DAEP sub-populations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [districtId, scopeLoading, scope])

  return { data, loading }
}

/**
 * Approved DAEP placements with scheduling status (approved but not yet active).
 */
export function useApprovedDaepPlacements() {
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()
  const { scope, loading: scopeLoading } = useAccessScope()

  useEffect(() => {
    if (!districtId || scopeLoading) return

    const fetchApproved = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('incidents')
          .select(`
            id, incident_date, consequence_days, status,
            student:students(id, first_name, last_name, middle_name, grade_level, student_id_number,
              is_sped, is_504, is_ell, is_homeless, is_foster_care),
            offense:offense_codes(id, code, title),
            scheduling:daep_placement_scheduling(id, ard_required, ard_status, orientation_status)
          `)
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .eq('status', 'approved')
          .order('incident_date', { ascending: false })

        query = applyCampusScope(query, scope)
        const { data, error } = await query

        if (error) throw error
        const filtered = scope.spedOnly
          ? (data || []).filter(r => isSpedStudent(r.student))
          : (data || [])
        setPlacements(filtered)
      } catch (err) {
        console.error('Error fetching approved DAEP placements:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchApproved()
  }, [districtId, scopeLoading, scope])

  return { placements, loading }
}

/**
 * Scheduled orientations (orientation_status = 'scheduled', date >= today).
 */
export function useScheduledOrientations() {
  const [orientations, setOrientations] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  useEffect(() => {
    if (!districtId) return

    const fetchOrientations = async () => {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      try {
        const { data, error } = await supabase
          .from('daep_placement_scheduling')
          .select(`
            id, orientation_scheduled_date, orientation_status,
            student:students(id, first_name, last_name, middle_name, student_id_number, grade_level)
          `)
          .eq('district_id', districtId)
          .eq('orientation_status', 'scheduled')
          .gte('orientation_scheduled_date', today)
          .order('orientation_scheduled_date', { ascending: true })

        if (error) throw error
        setOrientations(data || [])
      } catch (err) {
        console.error('Error fetching scheduled orientations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrientations()
  }, [districtId])

  return { orientations, loading }
}

/**
 * Pending approval chains (in_progress) with incident/student/offense data and step details.
 */
export function usePendingApprovals() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  useEffect(() => {
    if (!districtId) return

    const fetchApprovals = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('daep_approval_chains')
          .select(`
            id, chain_status, current_step, created_at,
            incident:incidents!fk_incidents_approval_chain(
              id, incident_date, status,
              student:students(id, first_name, last_name, middle_name, student_id_number),
              offense:offense_codes(id, code, title)
            ),
            steps:daep_approval_steps(id, step_role, step_order, status)
          `)
          .eq('district_id', districtId)
          .eq('chain_status', 'in_progress')
          .order('created_at', { ascending: false })

        if (error) throw error
        setApprovals(data || [])
      } catch (err) {
        console.error('Error fetching pending approvals:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchApprovals()
  }, [districtId])

  return { approvals, loading }
}

/**
 * Orientation schedule — all orientations with filtering.
 */
export function useOrientationSchedule(showPast = false) {
  const [orientations, setOrientations] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  const fetchOrientations = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    try {
      let query = supabase
        .from('daep_placement_scheduling')
        .select(`
          id, orientation_scheduled_date, orientation_scheduled_time, orientation_status,
          orientation_completed_date, orientation_form_data,
          student:students(id, first_name, last_name, middle_name, student_id_number, grade_level, campus_id),
          incident:incidents(id, campus_id, campus:campuses!campus_id(id, name))
        `)
        .eq('district_id', districtId)
        .order('orientation_scheduled_date', { ascending: true })

      if (!showPast) {
        // Show pending, all scheduled (including past for missed detection), and completed (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
        query = query.or(`orientation_status.in.(pending,scheduled),and(orientation_status.eq.completed,orientation_completed_date.gte.${thirtyDaysAgoStr})`)
      }

      const { data, error } = await query
      if (error) throw error
      setOrientations(data || [])
    } catch (err) {
      console.error('Error fetching orientation schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [districtId, showPast])

  useEffect(() => {
    fetchOrientations()
  }, [fetchOrientations])

  return { orientations, loading, refetch: fetchOrientations }
}

/**
 * Actions for updating DAEP placement days (consequence_days, consequence_end, days_absent).
 */
export function useDaepDaysActions() {
  const [loading, setLoading] = useState(false)

  const updateDaepDays = useCallback(async (incidentId, updates) => {
    setLoading(true)
    try {
      const payload = {}
      if (updates.consequence_days != null) payload.consequence_days = updates.consequence_days
      if (updates.consequence_end != null) payload.consequence_end = updates.consequence_end
      if (updates.days_absent != null) payload.days_absent = updates.days_absent

      const { error } = await supabase
        .from('incidents')
        .update(payload)
        .eq('id', incidentId)

      if (error) throw error
      return { success: true }
    } catch (err) {
      console.error('Error updating DAEP days:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateDaepDays, loading }
}
