import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Referrals ─────────────────────────────────────────────────────────────────

export function useNavigatorReferrals(filters = {}) {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('navigator_referrals')
        .select(`
          *,
          students(id, first_name, last_name, grade_level, is_sped, is_504),
          campuses(id, name),
          reporter:profiles!navigator_referrals_reported_by_fkey(id, full_name),
          reviewer:profiles!navigator_referrals_reviewed_by_fkey(id, full_name),
          offense_codes(id, code, description, category)
        `)
        .eq('district_id', districtId)
        .order('referral_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)
      if (filters.status) q = q.eq('status', filters.status)
      if (filters.campus_id) q = q.eq('campus_id', filters.campus_id)
      if (filters.date_from) q = q.gte('referral_date', filters.date_from)
      if (filters.date_to) q = q.lte('referral_date', filters.date_to)

      const { data, error: err } = await q
      if (err) throw err
      setReferrals(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds, filters.status, filters.campus_id, filters.date_from, filters.date_to])

  useEffect(() => { fetch() }, [fetch])

  return { referrals, loading, error, refetch: fetch }
}

// ─── Placements ────────────────────────────────────────────────────────────────

export function useNavigatorPlacements(filters = {}) {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('navigator_placements')
        .select(`
          *,
          students(id, first_name, last_name, grade_level, is_sped, is_504),
          campuses(id, name),
          assigner:profiles!navigator_placements_assigned_by_fkey(id, full_name),
          notifier:profiles!navigator_placements_parent_notified_by_fkey(id, full_name),
          navigator_referrals(id, referral_date, description)
        `)
        .eq('district_id', districtId)
        .order('start_date', { ascending: false })

      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)
      if (filters.placement_type) q = q.eq('placement_type', filters.placement_type)
      if (filters.campus_id) q = q.eq('campus_id', filters.campus_id)
      if (filters.active_only) q = q.is('end_date', null).lte('start_date', new Date().toISOString())
      if (filters.date_from) q = q.gte('start_date', filters.date_from)
      if (filters.date_to) q = q.lte('start_date', filters.date_to)

      const { data, error: err } = await q
      if (err) throw err
      setPlacements(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds, filters.placement_type, filters.campus_id, filters.active_only, filters.date_from, filters.date_to])

  useEffect(() => { fetch() }, [fetch])

  return { placements, loading, error, refetch: fetch }
}

// ─── Supports ──────────────────────────────────────────────────────────────────

export function useNavigatorSupports(studentId = null) {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [supports, setSupports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('navigator_supports')
        .select(`
          *,
          students(id, first_name, last_name, grade_level),
          campuses(id, name),
          assigner:profiles!navigator_supports_assigned_by_fkey(id, full_name),
          assignee:profiles!navigator_supports_assigned_to_fkey(id, full_name)
        `)
        .eq('district_id', districtId)
        .order('start_date', { ascending: false })

      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)
      if (studentId) q = q.eq('student_id', studentId)

      const { data, error: err } = await q
      if (err) throw err
      setSupports(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds, studentId])

  useEffect(() => { fetch() }, [fetch])

  return { supports, loading, error, refetch: fetch }
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────────

export function useNavigatorDashboardStats() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentReferrals, setRecentReferrals] = useState([])
  const [escalationAlerts, setEscalationAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Helper to apply campus scoping to a query builder
    const scopeCampus = (q) => {
      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)
      return q
    }

    const [referralsThisMonth, activeISS, activeOSS, activeSupports, recentRes, ossStudents] = await Promise.all([
      scopeCampus(
        supabase
          .from('navigator_referrals')
          .select('id', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .gte('referral_date', monthStart)
      ),

      scopeCampus(
        supabase
          .from('navigator_placements')
          .select('id', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('placement_type', 'iss')
          .is('end_date', null)
      ),

      scopeCampus(
        supabase
          .from('navigator_placements')
          .select('id', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('placement_type', 'oss')
          .is('end_date', null)
      ),

      scopeCampus(
        supabase
          .from('navigator_supports')
          .select('id', { count: 'exact', head: true })
          .eq('district_id', districtId)
          .eq('status', 'active')
      ),

      scopeCampus(
        supabase
          .from('navigator_referrals')
          .select(`
            id, referral_date, description, status,
            students(first_name, last_name),
            campuses(name),
            offense_codes(code, description)
          `)
          .eq('district_id', districtId)
          .order('created_at', { ascending: false })
          .limit(10)
      ),

      // Students with 3+ OSS in rolling 90 days — escalation alert
      scopeCampus(
        supabase
          .from('navigator_placements')
          .select('student_id, students(first_name, last_name)')
          .eq('district_id', districtId)
          .eq('placement_type', 'oss')
          .gte('start_date', ninetyDaysAgo)
      ),
    ])

    // Count OSS per student for escalation
    const ossCounts = {}
    const ossStudentNames = {}
    ;(ossStudents.data || []).forEach(p => {
      const sid = p.student_id
      ossCounts[sid] = (ossCounts[sid] || 0) + 1
      if (p.students) ossStudentNames[sid] = p.students
    })
    const escalations = Object.entries(ossCounts)
      .filter(([, count]) => count >= 3)
      .map(([sid, count]) => ({ student_id: sid, oss_count: count, student: ossStudentNames[sid] }))

    setStats({
      referralsThisMonth: referralsThisMonth.count || 0,
      activeISS: activeISS.count || 0,
      activeOSS: activeOSS.count || 0,
      activeSupports: activeSupports.count || 0,
    })
    setRecentReferrals(recentRes.data || [])
    setEscalationAlerts(escalations)
    setLoading(false)
  }, [districtId, isAdmin, campusIds])

  useEffect(() => { fetch() }, [fetch])

  return { stats, recentReferrals, escalationAlerts, loading, refetch: fetch }
}

// ─── Student History ───────────────────────────────────────────────────────────

export function useNavigatorStudentHistory(studentId) {
  const { districtId } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [placements, setPlacements] = useState([])
  const [supports, setSupports] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!districtId || !studentId) return
    setLoading(true)

    const [studentRes, referralRes, placementRes, supportRes] = await Promise.all([
      supabase
        .from('students')
        .select('*, campuses(name)')
        .eq('id', studentId)
        .single(),

      supabase
        .from('navigator_referrals')
        .select(`*, offense_codes(code, description), reporter:profiles!navigator_referrals_reported_by_fkey(full_name)`)
        .eq('student_id', studentId)
        .eq('district_id', districtId)
        .order('referral_date', { ascending: false }),

      supabase
        .from('navigator_placements')
        .select(`*, assigner:profiles!navigator_placements_assigned_by_fkey(full_name)`)
        .eq('student_id', studentId)
        .eq('district_id', districtId)
        .order('start_date', { ascending: false }),

      supabase
        .from('navigator_supports')
        .select(`*, assigner:profiles!navigator_supports_assigned_by_fkey(full_name), assignee:profiles!navigator_supports_assigned_to_fkey(full_name)`)
        .eq('student_id', studentId)
        .eq('district_id', districtId)
        .order('start_date', { ascending: false }),
    ])

    setStudent(studentRes.data)
    setReferrals(referralRes.data || [])
    setPlacements(placementRes.data || [])
    setSupports(supportRes.data || [])
    setLoading(false)
  }, [districtId, studentId])

  useEffect(() => { fetch() }, [fetch])

  // Risk score uses the same weighted algorithm as the Escalation Engine
  const activeSupports = supports.filter(s => s.status === 'active')
  const { score: riskScore, triggers: riskTriggers } = computeRiskScore(referrals, placements, activeSupports.length)
  const studentRiskLevel = riskLevel(riskScore)

  return { student, referrals, placements, supports, riskScore, riskTriggers, riskLevel: studentRiskLevel, loading, refetch: fetch }
}

// ─── School Year Helpers ────────────────────────────────────────────────────────

export function currentSchoolYear() {
  const now = new Date()
  const month = now.getMonth() // 0-indexed
  const y = now.getFullYear()
  // Aug (7) – Dec (11) = start of year; Jan (0) – Jul (6) = end of year
  if (month >= 7) {
    return `${y}-${String(y + 1).slice(-2)}`
  }
  return `${y - 1}-${String(y).slice(-2)}`
}

export function getSchoolYearBounds(schoolYear) {
  // '2025-26' → { start: '2025-08-01', end: '2026-07-31' }
  const [startY] = schoolYear.split('-')
  const endY = parseInt(startY) + 1
  return { start: `${startY}-08-01`, end: `${endY}-07-31` }
}

// ─── Goals ─────────────────────────────────────────────────────────────────────

export function useNavigatorGoals(schoolYear) {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('navigator_campus_goals')
        .select(`*, campuses(id, name, tea_campus_id)`)
        .eq('district_id', districtId)
        .eq('school_year', schoolYear)
        .order('created_at', { ascending: true })

      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)

      const { data, error: err } = await q
      if (err) throw err
      setGoals(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds, schoolYear])

  useEffect(() => { fetch() }, [fetch])

  return { goals, loading, error, refetch: fetch }
}

export async function saveNavigatorGoal(goalData) {
  const { error } = await supabase
    .from('navigator_campus_goals')
    .upsert(goalData, { onConflict: 'campus_id,school_year' })
  return { error }
}

// ─── Year-Over-Year Data ────────────────────────────────────────────────────────

export function useNavigatorYOYData(schoolYear) {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [currentYear, setCurrentYear] = useState([])
  const [priorYear, setPriorYear] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadYOYData() {
    setLoading(true)

    const { start: curStart, end: curEnd } = getSchoolYearBounds(schoolYear)
    // Prior year: same bounds shifted back 1 year
    const [startY] = schoolYear.split('-')
    const priorSY = `${parseInt(startY) - 1}-${startY.slice(-2)}`
    const { start: priorStart, end: priorEnd } = getSchoolYearBounds(priorSY)

    // Helper to apply campus scoping
    const scopeCampus = (q) => {
      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)
      return q
    }

    const [curRes, priorRes] = await Promise.all([
      scopeCampus(
        supabase
          .from('navigator_placements')
          .select('placement_type, start_date')
          .eq('district_id', districtId)
          .gte('start_date', curStart)
          .lte('start_date', curEnd)
      ),
      scopeCampus(
        supabase
          .from('navigator_placements')
          .select('placement_type, start_date')
          .eq('district_id', districtId)
          .gte('start_date', priorStart)
          .lte('start_date', priorEnd)
      ),
    ])

    setCurrentYear(aggregateByMonth(curRes.data || [], curStart))
    setPriorYear(aggregateByMonth(priorRes.data || [], priorStart))
    setLoading(false)
  }

  useEffect(() => {
    if (!districtId) return
    loadYOYData()
  }, [districtId, isAdmin, campusIds, schoolYear])

  return { currentYear, priorYear, loading }
}

// ─── Escalation Risk Engine ───────────────────────────────────────────────────

// Weighted risk score — pure, exported for use in student-level views
export function computeRiskScore(referrals, placements, activeSupportCount) {
  const now = new Date()
  const d14 = new Date(now - 14 * 86400000)
  const d30 = new Date(now - 30 * 86400000)
  const d60 = new Date(now - 60 * 86400000)

  let score = 0
  const triggers = []

  const refs14 = referrals.filter(r => new Date(r.referral_date) >= d14)
  const refs30 = referrals.filter(r => new Date(r.referral_date) >= d30)
  const refs60 = referrals.filter(r => new Date(r.referral_date) >= d60)

  if (refs14.length >= 1) { score += 30; triggers.push('Referral ≤14d') }
  if (refs14.length >= 2) { score += 15; triggers.push('2+ refs in 14d') }
  if (refs30.length >= 2) { score += 15; triggers.push('Freq. referrals') }
  if (refs60.length >= 5) { score += 10; triggers.push('5+ in 60d') }

  const oss30 = placements.filter(p => p.placement_type === 'oss' && new Date(p.start_date) >= d30)
  const iss30 = placements.filter(p => p.placement_type === 'iss' && new Date(p.start_date) >= d30)
  const daepPrior = referrals.filter(r => r.outcome === 'escalated_to_daep')

  if (oss30.length >= 1) { score += 25; triggers.push('OSS ≤30d') }
  if (oss30.length >= 2) { score += 10; triggers.push('Multiple OSS') }
  if (iss30.length >= 1) { score += 10; triggers.push('ISS ≤30d') }
  if (daepPrior.length >= 1) { score += 20; triggers.push('Prior DAEP escalation') }

  score -= activeSupportCount * 12

  return { score: Math.max(0, Math.min(100, score)), triggers }
}

export function riskLevel(score) {
  if (score >= 70) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

export function useEscalationRisk() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)
    try {
      const d90 = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

      let refQ = supabase
        .from('navigator_referrals')
        .select('id, student_id, referral_date, outcome, students(id, first_name, last_name, grade_level), campuses(id, name)')
        .eq('district_id', districtId)
        .gte('referral_date', d90)

      let placQ = supabase
        .from('navigator_placements')
        .select('id, student_id, placement_type, start_date')
        .eq('district_id', districtId)
        .gte('start_date', d90)

      let supQ = supabase
        .from('navigator_supports')
        .select('id, student_id')
        .eq('district_id', districtId)
        .eq('status', 'active')

      if (!isAdmin && campusIds?.length) {
        refQ = refQ.in('campus_id', campusIds)
        placQ = placQ.in('campus_id', campusIds)
        supQ = supQ.in('campus_id', campusIds)
      }

      const [refRes, placRes, supRes] = await Promise.all([refQ, placQ, supQ])

      if (refRes.error) throw refRes.error
      if (placRes.error) throw placRes.error
      if (supRes.error) throw supRes.error

      const studentMap = {}

      ;(refRes.data || []).forEach(r => {
        const sid = r.student_id
        if (!studentMap[sid]) {
          studentMap[sid] = { student_id: sid, student: r.students, campus: r.campuses, referrals: [], placements: [], activeSupports: 0 }
        }
        studentMap[sid].referrals.push(r)
      })

      ;(placRes.data || []).forEach(p => {
        const sid = p.student_id
        if (!studentMap[sid]) {
          studentMap[sid] = { student_id: sid, student: null, campus: null, referrals: [], placements: [], activeSupports: 0 }
        }
        studentMap[sid].placements.push(p)
      })

      ;(supRes.data || []).forEach(s => {
        if (studentMap[s.student_id]) studentMap[s.student_id].activeSupports++
      })

      const result = Object.values(studentMap)
        .map(s => {
          const { score, triggers } = computeRiskScore(s.referrals, s.placements, s.activeSupports)
          return { ...s, risk_score: score, risk_level: riskLevel(score), triggers }
        })
        .filter(s => s.risk_score > 0)
        .sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 }
          if (order[a.risk_level] !== order[b.risk_level]) return order[a.risk_level] - order[b.risk_level]
          return b.risk_score - a.risk_score
        })

      setStudents(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds])

  useEffect(() => { fetch() }, [fetch])

  return { students, loading, error, refetch: fetch }
}

// ─── Skill Gap Data ───────────────────────────────────────────────────────────

export const SKILL_GAP_LABELS = {
  emotional_regulation: 'Emotional Regulation',
  executive_functioning: 'Executive Functioning',
  peer_conflict_resolution: 'Peer Conflict Resolution',
  academic_frustration_tolerance: 'Academic Frustration Tolerance',
  impulse_control: 'Impulse Control',
  adult_communication: 'Adult Communication',
}

const SKILL_INTERVENTIONS = {
  emotional_regulation: ['CICO', 'Counseling Referral', 'Mindfulness Protocol'],
  executive_functioning: ['Behavior Contract', 'Academic Support', 'CICO'],
  peer_conflict_resolution: ['Peer Mediation', 'Counseling Referral', 'Social Skills Group'],
  academic_frustration_tolerance: ['Academic Support', 'Behavior Contract', 'Counseling Referral'],
  impulse_control: ['CICO', 'Behavior Contract', 'Counseling Referral'],
  adult_communication: ['Social Skills Group', 'Counseling Referral', 'Parent Conference'],
}

export function useSkillGapData() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('navigator_referrals')
        .select('skill_gap, student_id, students(id, first_name, last_name, grade_level), campuses(name)')
        .eq('district_id', districtId)
        .not('skill_gap', 'is', null)

      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)

      const { data: rows, error: err } = await q
      if (err) throw err

      const counts = {}
      const studentsBySkill = {}
      ;(rows || []).forEach(r => {
        const gap = r.skill_gap
        counts[gap] = (counts[gap] || 0) + 1
        if (!studentsBySkill[gap]) studentsBySkill[gap] = new Set()
        studentsBySkill[gap].add(r.student_id)
      })

      const gapData = Object.entries(counts)
        .map(([gap, count]) => ({
          gap,
          label: SKILL_GAP_LABELS[gap] || gap,
          count,
          unique_students: studentsBySkill[gap]?.size || 0,
          interventions: SKILL_INTERVENTIONS[gap] || [],
        }))
        .sort((a, b) => b.count - a.count)

      setData(gapData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ─── Intervention Effectiveness ───────────────────────────────────────────────

export function useInterventionEffectiveness() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [supports, setSupports] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('navigator_supports')
        .select(`
          *,
          students(id, first_name, last_name, grade_level),
          campuses(id, name),
          assigner:profiles!navigator_supports_assigned_by_fkey(full_name)
        `)
        .eq('district_id', districtId)
        .eq('status', 'completed')
        .not('incidents_before', 'is', null)
        .not('incidents_after', 'is', null)
        .order('end_date', { ascending: false })

      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)

      const { data: rows, error: err } = await q
      if (err) throw err
      const data = rows || []

      if (data.length > 0) {
        const totalBefore = data.reduce((s, r) => s + (r.incidents_before || 0), 0)
        const totalAfter = data.reduce((s, r) => s + (r.incidents_after || 0), 0)
        const improved = data.filter(r => (r.incidents_after || 0) < (r.incidents_before || 0)).length

        const byType = {}
        data.forEach(r => {
          const t = r.support_type
          if (!byType[t]) byType[t] = { type: t, count: 0, before: 0, after: 0 }
          byType[t].count++
          byType[t].before += r.incidents_before || 0
          byType[t].after += r.incidents_after || 0
        })

        setMetrics({
          totalTracked: data.length,
          avgReduction: totalBefore > 0 ? Math.round((totalBefore - totalAfter) / totalBefore * 100) : 0,
          improved,
          improvedPct: Math.round(improved / data.length * 100),
          byType: Object.values(byType).sort((a, b) => b.count - a.count),
        })
      } else {
        setMetrics(null)
      }

      setSupports(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds])

  useEffect(() => { fetch() }, [fetch])

  return { supports, metrics, loading, error, refetch: fetch }
}

// ─── Disproportionality ───────────────────────────────────────────────────────

export function useDisproportionality() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [campusData, setCampusData] = useState([])
  const [gradeData, setGradeData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    setError(null)
    try {
      const d90 = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

      let refQ = supabase
        .from('navigator_referrals')
        .select('campus_id, student_id, students(grade_level), campuses(id, name)')
        .eq('district_id', districtId)
        .gte('referral_date', d90)

      let studQ = supabase
        .from('students')
        .select('id, grade_level, campus_id')
        .eq('district_id', districtId)
        .eq('status', 'active')

      if (!isAdmin && campusIds?.length) {
        refQ = refQ.in('campus_id', campusIds)
        studQ = studQ.in('campus_id', campusIds)
      }

      const [refRes, studRes] = await Promise.all([refQ, studQ])

      if (refRes.error) throw refRes.error

      const referrals = refRes.data || []
      const allStudents = studRes.data || []

      const campusRefs = {}
      const campusNames = {}
      referrals.forEach(r => {
        campusRefs[r.campus_id] = (campusRefs[r.campus_id] || 0) + 1
        if (r.campuses) campusNames[r.campus_id] = r.campuses.name
      })

      const campusPop = {}
      allStudents.forEach(s => {
        campusPop[s.campus_id] = (campusPop[s.campus_id] || 0) + 1
      })

      setCampusData(
        Object.entries(campusRefs)
          .map(([cid, refs]) => ({
            campus_id: cid,
            name: campusNames[cid] || 'Unknown',
            referrals: refs,
            enrollment: campusPop[cid] || 0,
            rate: campusPop[cid] ? +(refs / campusPop[cid] * 100).toFixed(1) : null,
          }))
          .sort((a, b) => (b.rate || 0) - (a.rate || 0))
      )

      const gradeRefs = {}
      const gradePop = {}
      referrals.forEach(r => {
        const g = r.students?.grade_level ?? 'Unknown'
        gradeRefs[g] = (gradeRefs[g] || 0) + 1
      })
      allStudents.forEach(s => {
        const g = s.grade_level ?? 'Unknown'
        gradePop[g] = (gradePop[g] || 0) + 1
      })

      setGradeData(
        Object.entries(gradeRefs)
          .map(([g, refs]) => ({
            grade: g,
            label: isNaN(parseInt(g)) ? g : `Grade ${g}`,
            referrals: refs,
            enrollment: gradePop[g] || 0,
            rate: gradePop[g] ? +(refs / gradePop[g] * 100).toFixed(1) : null,
          }))
          .sort((a, b) => {
            const an = parseInt(a.grade), bn = parseInt(b.grade)
            return isNaN(an) || isNaN(bn) ? 0 : an - bn
          })
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds])

  useEffect(() => { fetch() }, [fetch])

  return { campusData, gradeData, loading, error, refetch: fetch }
}

// ─── Pilot Summary ────────────────────────────────────────────────────────────

export function useNavigatorPilotSummary(schoolYear) {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!districtId || !schoolYear) return
    setLoading(true)
    setError(null)
    try {
      const { start, end } = getSchoolYearBounds(schoolYear)

      // Helper to apply campus scoping
      const scopeCampus = (q) => {
        if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)
        return q
      }

      const [refRes, placRes, supRes] = await Promise.all([
        scopeCampus(
          supabase
            .from('navigator_referrals')
            .select('id, student_id, status, outcome, skill_gap')
            .eq('district_id', districtId)
            .gte('referral_date', start)
            .lte('referral_date', end)
        ),

        scopeCampus(
          supabase
            .from('navigator_placements')
            .select('id, student_id, placement_type, days')
            .eq('district_id', districtId)
            .gte('start_date', start)
            .lte('start_date', end)
        ),

        scopeCampus(
          supabase
            .from('navigator_supports')
            .select('id, student_id, support_type, status, incidents_before, incidents_after')
            .eq('district_id', districtId)
            .gte('start_date', start)
            .lte('start_date', end)
        ),
      ])

      if (refRes.error) throw refRes.error

      const referrals = refRes.data || []
      const placements = placRes.data || []
      const supports = supRes.data || []

      const escalated = referrals.filter(r => r.outcome === 'escalated_to_daep').length
      const diverted = referrals.filter(r => r.outcome && r.outcome !== 'escalated_to_daep' && r.outcome !== 'no_action').length
      const issCount = placements.filter(p => p.placement_type === 'iss').length
      const ossCount = placements.filter(p => p.placement_type === 'oss').length
      const totalDaysRemoved = placements.reduce((s, p) => s + (p.days || 0), 0)

      const effectivenessRows = supports.filter(s => s.incidents_before != null && s.incidents_after != null && s.incidents_before > 0)
      const avgReduction = effectivenessRows.length > 0
        ? Math.round(effectivenessRows.reduce((sum, s) => sum + (s.incidents_before - s.incidents_after) / s.incidents_before, 0) / effectivenessRows.length * 100)
        : null

      const gapCounts = {}
      referrals.filter(r => r.skill_gap).forEach(r => {
        gapCounts[r.skill_gap] = (gapCounts[r.skill_gap] || 0) + 1
      })
      const topGaps = Object.entries(gapCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([gap, count]) => ({ gap, label: SKILL_GAP_LABELS[gap] || gap, count }))

      setSummary({
        schoolYear,
        totalReferrals: referrals.length,
        uniqueStudents: new Set(referrals.map(r => r.student_id)).size,
        escalated,
        diverted,
        issCount,
        ossCount,
        totalDaysRemoved,
        activeSupports: supports.filter(s => s.status === 'active').length,
        completedSupports: supports.filter(s => s.status === 'completed').length,
        avgReduction,
        topGaps,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds, schoolYear])

  useEffect(() => { fetch() }, [fetch])

  return { summary, loading, error, refetch: fetch }
}

// ─── YOY ─────────────────────────────────────────────────────────────────────

// Groups placements by month offset from school year start (Aug = 0)
const MONTH_LABELS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

function aggregateByMonth(placements, startDate) {
  const yearStart = new Date(startDate)
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    label: MONTH_LABELS[i],
    iss: 0,
    oss: 0,
    total: 0,
  }))

  for (const p of placements) {
    const d = new Date(p.start_date)
    // Month offset from Aug 1 of start year
    const monthOffset =
      (d.getFullYear() - yearStart.getFullYear()) * 12 +
      (d.getMonth() - yearStart.getMonth())
    if (monthOffset >= 0 && monthOffset < 12) {
      if (p.placement_type === 'iss') months[monthOffset].iss++
      else if (p.placement_type === 'oss') months[monthOffset].oss++
      months[monthOffset].total++
    }
  }

  return months
}
