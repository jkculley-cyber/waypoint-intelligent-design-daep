import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getSchoolYearStart } from '../lib/utils'

/**
 * Fetch summary statistics for the analytics dashboard
 */
export function useAnalyticsSummary() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  useEffect(() => {
    if (!districtId) return

    const fetchStats = async () => {
      setLoading(true)
      const schoolYearStart = getSchoolYearStart().toISOString()

      try {
        // Total incidents this school year
        const { count: totalIncidents } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .gte('incident_date', schoolYearStart)

        // Active incidents
        const { count: activeIncidents } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .in('status', ['submitted', 'under_review', 'approved', 'active'])

        // DAEP placements this year
        const { count: daepPlacements } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .gte('incident_date', schoolYearStart)

        // Compliance holds
        const { count: complianceHolds } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('status', 'compliance_hold')

        // Active alerts
        const { count: activeAlerts } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .in('status', ['active', 'acknowledged', 'in_progress'])

        // Active transition plans
        const { count: activePlans } = await supabase
          .from('transition_plans')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('status', 'active')

        // Total students with incidents
        const { data: studentCounts } = await supabase
          .from('incidents')
          .select('student_id')
          .eq('district_id', districtId)
          .gte('incident_date', schoolYearStart)

        const uniqueStudents = new Set(studentCounts?.map(i => i.student_id) || [])

        setStats({
          totalIncidents: totalIncidents || 0,
          activeIncidents: activeIncidents || 0,
          daepPlacements: daepPlacements || 0,
          complianceHolds: complianceHolds || 0,
          activeAlerts: activeAlerts || 0,
          activePlans: activePlans || 0,
          uniqueStudents: uniqueStudents.size,
        })
      } catch (err) {
        console.error('Error fetching analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [districtId])

  return { stats, loading }
}

/**
 * Fetch incident data grouped by demographic for disproportionality analysis
 */
export function useDisproportionalityData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  useEffect(() => {
    if (!districtId) return

    const fetchData = async () => {
      setLoading(true)
      const schoolYearStart = getSchoolYearStart().toISOString()

      try {
        // Get all incidents with student demographics
        const { data: incidents } = await supabase
          .from('incidents')
          .select(`
            id, consequence_type,
            students (id, race, gender, is_sped, is_504, is_ell, grade_level)
          `)
          .eq('district_id', districtId)
          .gte('incident_date', schoolYearStart)

        if (!incidents) {
          setData({ byRace: [], byGender: [], bySped: [], byEll: [], byConsequence: [] })
          setLoading(false)
          return
        }

        // Get total student population for comparison
        const { data: allStudents } = await supabase
          .from('students')
          .select('id, race, gender, is_sped, is_504, is_ell')
          .eq('district_id', districtId)
          .eq('is_active', true)

        const totalStudents = allStudents?.length || 1

        // Group by race
        const byRace = groupBy(incidents, (i) => i.students?.race || 'Unknown')
        const racePopulation = groupBy(allStudents || [], (s) => s.race || 'Unknown')

        // Group by gender
        const byGender = groupBy(incidents, (i) => i.students?.gender || 'Unknown')
        const genderPopulation = groupBy(allStudents || [], (s) => s.gender || 'Unknown')

        // Group by SPED status
        const bySpedIncidents = {
          SPED: incidents.filter((i) => i.students?.is_sped).length,
          '504': incidents.filter((i) => i.students?.is_504 && !i.students?.is_sped).length,
          'Gen Ed': incidents.filter((i) => !i.students?.is_sped && !i.students?.is_504).length,
        }
        const bySpedPopulation = {
          SPED: (allStudents || []).filter((s) => s.is_sped).length,
          '504': (allStudents || []).filter((s) => s.is_504 && !s.is_sped).length,
          'Gen Ed': (allStudents || []).filter((s) => !s.is_sped && !s.is_504).length,
        }

        // Group by ELL
        const byEllIncidents = {
          ELL: incidents.filter((i) => i.students?.is_ell).length,
          'Non-ELL': incidents.filter((i) => !i.students?.is_ell).length,
        }
        const byEllPopulation = {
          ELL: (allStudents || []).filter((s) => s.is_ell).length,
          'Non-ELL': (allStudents || []).filter((s) => !s.is_ell).length,
        }

        // Group by consequence type
        const byConsequence = groupBy(incidents, (i) => i.consequence_type || 'unassigned')

        setData({
          byRace: buildDisproportionalityData(byRace, racePopulation, totalStudents),
          byGender: buildDisproportionalityData(byGender, genderPopulation, totalStudents),
          bySped: buildDisproportionalityFromCounts(bySpedIncidents, bySpedPopulation, totalStudents),
          byEll: buildDisproportionalityFromCounts(byEllIncidents, byEllPopulation, totalStudents),
          byConsequence: Object.entries(byConsequence).map(([key, arr]) => ({
            name: key,
            count: arr.length,
          })),
          totalIncidents: incidents.length,
          totalStudents,
        })
      } catch (err) {
        console.error('Error fetching disproportionality data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [districtId])

  return { data, loading }
}

/**
 * Fetch incidents over time (monthly trend)
 */
export function useIncidentTrends() {
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  useEffect(() => {
    if (!districtId) return

    const fetchTrends = async () => {
      setLoading(true)
      const schoolYearStart = getSchoolYearStart().toISOString()

      try {
        const { data: incidents } = await supabase
          .from('incidents')
          .select('id, incident_date, consequence_type')
          .eq('district_id', districtId)
          .gte('incident_date', schoolYearStart)
          .order('incident_date')

        if (!incidents?.length) {
          setTrends([])
          setLoading(false)
          return
        }

        // Group by month
        const monthly = {}
        incidents.forEach((inc) => {
          const date = new Date(inc.incident_date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!monthly[monthKey]) {
            monthly[monthKey] = { month: monthKey, total: 0, iss: 0, oss: 0, daep: 0, other: 0 }
          }
          monthly[monthKey].total++
          if (inc.consequence_type === 'iss') monthly[monthKey].iss++
          else if (inc.consequence_type === 'oss') monthly[monthKey].oss++
          else if (inc.consequence_type === 'daep') monthly[monthKey].daep++
          else monthly[monthKey].other++
        })

        // Convert to sorted array with readable month names
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const sorted = Object.values(monthly)
          .sort((a, b) => a.month.localeCompare(b.month))
          .map((m) => ({
            ...m,
            label: months[parseInt(m.month.split('-')[1]) - 1] + ' ' + m.month.split('-')[0].slice(2),
          }))

        setTrends(sorted)
      } catch (err) {
        console.error('Error fetching trends:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTrends()
  }, [districtId])

  return { trends, loading }
}

/**
 * Fetch recidivism data — students returning to DAEP/discipline
 */
export function useRecidivismData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  useEffect(() => {
    if (!districtId) return

    const fetchRecidivism = async () => {
      setLoading(true)
      const schoolYearStart = getSchoolYearStart().toISOString()

      try {
        // Get all DAEP placements this year
        const { data: daepIncidents } = await supabase
          .from('incidents')
          .select('id, student_id, incident_date, status')
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .gte('incident_date', schoolYearStart)
          .order('student_id')
          .order('incident_date')

        if (!daepIncidents?.length) {
          setData({ rate: 0, totalPlacements: 0, repeatStudents: 0, uniqueStudents: 0, details: [] })
          setLoading(false)
          return
        }

        // Count placements per student
        const byStudent = {}
        daepIncidents.forEach((inc) => {
          if (!byStudent[inc.student_id]) byStudent[inc.student_id] = []
          byStudent[inc.student_id].push(inc)
        })

        const uniqueStudents = Object.keys(byStudent).length
        const repeatStudents = Object.values(byStudent).filter((arr) => arr.length > 1).length
        const rate = uniqueStudents > 0 ? Math.round((repeatStudents / uniqueStudents) * 100) : 0

        // Get all incidents this year for broader recidivism
        const { data: allIncidents } = await supabase
          .from('incidents')
          .select('id, student_id, consequence_type')
          .eq('district_id', districtId)
          .gte('incident_date', schoolYearStart)

        const allByStudent = {}
        allIncidents?.forEach((inc) => {
          if (!allByStudent[inc.student_id]) allByStudent[inc.student_id] = 0
          allByStudent[inc.student_id]++
        })

        const repeatOffenders = Object.values(allByStudent).filter((count) => count > 1).length
        const totalUniqueStudents = Object.keys(allByStudent).length

        setData({
          daepRate: rate,
          totalDaepPlacements: daepIncidents.length,
          daepRepeatStudents: repeatStudents,
          daepUniqueStudents: uniqueStudents,
          overallRepeatRate: totalUniqueStudents > 0
            ? Math.round((repeatOffenders / totalUniqueStudents) * 100) : 0,
          repeatOffenders,
          totalUniqueStudents,
          // Distribution of incident counts
          distribution: buildDistribution(allByStudent),
        })
      } catch (err) {
        console.error('Error fetching recidivism data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecidivism()
  }, [districtId])

  return { data, loading }
}

/**
 * Fetch intervention effectiveness data
 */
export function useInterventionEffectiveness() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const { districtId } = useAuth()

  useEffect(() => {
    if (!districtId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: studentInterventions } = await supabase
          .from('student_interventions')
          .select(`
            id, status, effectiveness_rating, start_date, end_date,
            interventions (id, name, category, tier)
          `)
          .eq('district_id', districtId)

        if (!studentInterventions?.length) {
          setData([])
          setLoading(false)
          return
        }

        // Group by intervention
        const byIntervention = {}
        studentInterventions.forEach((si) => {
          const name = si.interventions?.name || 'Unknown'
          if (!byIntervention[name]) {
            byIntervention[name] = {
              name,
              category: si.interventions?.category,
              tier: si.interventions?.tier,
              total: 0,
              active: 0,
              completed: 0,
              effective: 0,
              ineffective: 0,
            }
          }
          byIntervention[name].total++
          if (si.status === 'active') byIntervention[name].active++
          if (si.status === 'completed') byIntervention[name].completed++
          if (si.effectiveness_rating === 'highly_effective' || si.effectiveness_rating === 'effective') {
            byIntervention[name].effective++
          }
          if (si.effectiveness_rating === 'ineffective') {
            byIntervention[name].ineffective++
          }
        })

        const sorted = Object.values(byIntervention)
          .map((item) => ({
            ...item,
            effectivenessRate: item.total > 0
              ? Math.round((item.effective / item.total) * 100) : null,
          }))
          .sort((a, b) => b.total - a.total)

        setData(sorted)
      } catch (err) {
        console.error('Error fetching intervention effectiveness:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [districtId])

  return { data, loading }
}

/**
 * Generate PEIMS-formatted CSV data
 */
export function usePeimsExport() {
  const { districtId } = useAuth()

  const generateExport = useCallback(async () => {
    if (!districtId) return null
    const schoolYearStart = getSchoolYearStart().toISOString()

    const { data: incidents } = await supabase
      .from('incidents')
      .select(`
        id, incident_date, incident_time, location, consequence_type, consequence_days,
        consequence_start, consequence_end, status, peims_action_code,
        students (student_id_number, first_name, last_name, grade_level, race, gender,
          is_sped, is_504, is_ell, date_of_birth, campus_id),
        offense_codes (code, name, category, severity, tec_reference,
          is_mandatory_daep, is_mandatory_expulsion),
        campuses:students(campus_id)
      `)
      .eq('district_id', districtId)
      .gte('incident_date', schoolYearStart)
      .in('status', ['approved', 'active', 'completed'])
      .order('incident_date')

    if (!incidents?.length) return null

    // Build CSV rows matching TEA PEIMS Discipline data format
    const headers = [
      'STUDENT-ID',
      'STUDENT-NAME',
      'GRADE-LEVEL',
      'INCIDENT-DATE',
      'INCIDENT-TIME',
      'LOCATION',
      'OFFENSE-CODE',
      'OFFENSE-DESCRIPTION',
      'TEC-REFERENCE',
      'SEVERITY',
      'CONSEQUENCE-TYPE',
      'CONSEQUENCE-DAYS',
      'CONSEQUENCE-START',
      'CONSEQUENCE-END',
      'PEIMS-ACTION-CODE',
      'RACE',
      'GENDER',
      'SPED',
      '504',
      'ELL',
      'MANDATORY-DAEP',
      'MANDATORY-EXPULSION',
      'STATUS',
    ]

    const rows = incidents.map((inc) => {
      const s = inc.students
      const o = inc.offense_codes
      return [
        s?.student_id_number || '',
        s ? `${s.last_name}, ${s.first_name}` : '',
        s?.grade_level ?? '',
        inc.incident_date || '',
        inc.incident_time || '',
        inc.location || '',
        o?.code || '',
        o?.name || '',
        o?.tec_reference || '',
        o?.severity || '',
        inc.consequence_type || '',
        inc.consequence_days || '',
        inc.consequence_start || '',
        inc.consequence_end || '',
        inc.peims_action_code || '',
        s?.race || '',
        s?.gender || '',
        s?.is_sped ? 'Y' : 'N',
        s?.is_504 ? 'Y' : 'N',
        s?.is_ell ? 'Y' : 'N',
        o?.is_mandatory_daep ? 'Y' : 'N',
        o?.is_mandatory_expulsion ? 'Y' : 'N',
        inc.status || '',
      ]
    })

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell)
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str
        }).join(',')
      ),
    ].join('\n')

    return {
      csv: csvContent,
      filename: `PEIMS_Discipline_Export_${new Date().toISOString().split('T')[0]}.csv`,
      recordCount: rows.length,
    }
  }, [districtId])

  return { generateExport }
}

// ---- Helpers ----

function groupBy(arr, keyFn) {
  const result = {}
  arr.forEach((item) => {
    const key = keyFn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  })
  return result
}

function buildDisproportionalityData(incidentGroups, populationGroups, totalPopulation) {
  return Object.keys({ ...incidentGroups, ...populationGroups }).map((key) => {
    const incidentCount = incidentGroups[key]?.length || 0
    const populationCount = populationGroups[key]?.length || 0
    const populationPct = totalPopulation > 0 ? (populationCount / totalPopulation) * 100 : 0
    const totalIncidents = Object.values(incidentGroups).reduce((sum, arr) => sum + arr.length, 0)
    const incidentPct = totalIncidents > 0 ? (incidentCount / totalIncidents) * 100 : 0
    const riskRatio = populationPct > 0 ? incidentPct / populationPct : 0

    return {
      name: key,
      incidents: incidentCount,
      population: populationCount,
      incidentPct: Math.round(incidentPct * 10) / 10,
      populationPct: Math.round(populationPct * 10) / 10,
      riskRatio: Math.round(riskRatio * 100) / 100,
    }
  }).sort((a, b) => b.incidents - a.incidents)
}

function buildDisproportionalityFromCounts(incidentCounts, populationCounts, totalPopulation) {
  const totalIncidents = Object.values(incidentCounts).reduce((sum, c) => sum + c, 0)
  return Object.keys({ ...incidentCounts, ...populationCounts }).map((key) => {
    const incidentCount = incidentCounts[key] || 0
    const populationCount = populationCounts[key] || 0
    const populationPct = totalPopulation > 0 ? (populationCount / totalPopulation) * 100 : 0
    const incidentPct = totalIncidents > 0 ? (incidentCount / totalIncidents) * 100 : 0
    const riskRatio = populationPct > 0 ? incidentPct / populationPct : 0

    return {
      name: key,
      incidents: incidentCount,
      population: populationCount,
      incidentPct: Math.round(incidentPct * 10) / 10,
      populationPct: Math.round(populationPct * 10) / 10,
      riskRatio: Math.round(riskRatio * 100) / 100,
    }
  })
}

function buildDistribution(byStudent) {
  const dist = { '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 }
  Object.values(byStudent).forEach((count) => {
    if (count === 1) dist['1']++
    else if (count === 2) dist['2']++
    else if (count === 3) dist['3']++
    else if (count === 4) dist['4']++
    else dist['5+']++
  })
  return Object.entries(dist).map(([key, value]) => ({
    name: `${key} incident${key === '1' ? '' : 's'}`,
    count: value,
  }))
}
