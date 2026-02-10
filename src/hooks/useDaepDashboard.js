import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccessScope } from './useAccessScope'
import { applyCampusScope } from '../lib/accessControl'
import { getSchoolYearStart } from '../lib/utils'
import {
  getInstructionalDaysRemaining,
  getInstructionalDaysElapsed,
  getInstructionalDaysTotal,
} from '../lib/instructionalCalendar'

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
        // Active enrollments
        let activeQuery = supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .in('status', ['active', 'approved'])
        activeQuery = applyCampusScope(activeQuery, scope)
        const { count: activeEnrollments } = await activeQuery

        // Pending placements
        let pendingQuery = supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .in('status', ['submitted', 'under_review', 'compliance_hold'])
        pendingQuery = applyCampusScope(pendingQuery, scope)
        const { count: pendingPlacements } = await pendingQuery

        // Completed YTD
        let completedQuery = supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .eq('status', 'completed')
          .gte('incident_date', schoolYearStart)
        completedQuery = applyCampusScope(completedQuery, scope)
        const { count: completedYtd } = await completedQuery

        // Compliance holds
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
        .in('status', ['active', 'approved'])

      query = applyCampusScope(query, scope)
      const { data, error } = await query

      if (error) throw error

      const enriched = (data || []).map(row => {
        const daysRemaining = getInstructionalDaysRemaining(row.consequence_end, districtId)
        const daysElapsed = getInstructionalDaysElapsed(row.consequence_start, districtId)
        const daysTotal = getInstructionalDaysTotal(row.consequence_start, row.consequence_end, districtId)
        return { ...row, daysRemaining, daysElapsed, daysTotal }
      })

      enriched.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
      setEnrollments(enriched)
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
        setEnrollments(data || [])
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
        if (!incidents?.length) {
          setData({
            byRace: [], byGender: [], bySped: [], byGrade: [],
            homeless: 0, fosterCare: 0, total: 0,
          })
          setLoading(false)
          return
        }

        // Group by Race/Ethnicity
        const raceGroups = {}
        incidents.forEach(i => {
          const key = i.student?.race || 'Unknown'
          raceGroups[key] = (raceGroups[key] || 0) + 1
        })
        const byRace = Object.entries(raceGroups)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)

        // Group by Gender
        const genderGroups = {}
        incidents.forEach(i => {
          const key = i.student?.gender || 'Unknown'
          genderGroups[key] = (genderGroups[key] || 0) + 1
        })
        const byGender = Object.entries(genderGroups)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)

        // Group by SPED/504/Gen Ed
        const spedCounts = { SPED: 0, '504': 0, 'Gen Ed': 0 }
        incidents.forEach(i => {
          if (i.student?.is_sped) spedCounts.SPED++
          else if (i.student?.is_504) spedCounts['504']++
          else spedCounts['Gen Ed']++
        })
        const bySped = Object.entries(spedCounts).map(([name, value]) => ({ name, value }))

        // Group by Grade Level
        const gradeGroups = {}
        incidents.forEach(i => {
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
        const homeless = incidents.filter(i => i.student?.is_homeless).length
        const fosterCare = incidents.filter(i => i.student?.is_foster_care).length

        setData({
          byRace, byGender, bySped, byGrade,
          homeless, fosterCare,
          total: incidents.length,
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
