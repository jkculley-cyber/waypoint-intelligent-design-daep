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

    const [referralsThisMonth, activeISS, activeOSS, activeSupports, recentRes, ossStudents, atDaepRes] = await Promise.all([
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

      // Students currently at DAEP (from Waypoint incidents, scoped by home campus)
      supabase
        .from('incidents')
        .select('id, student:students!inner(id, campus_id)', { count: 'exact', head: false })
        .eq('district_id', districtId)
        .eq('consequence_type', 'daep')
        .eq('status', 'active')
        .then(r => {
          if (!isAdmin && campusIds?.length) {
            const filtered = (r.data || []).filter(inc => campusIds.includes(inc.student?.campus_id))
            return { count: filtered.length }
          }
          return { count: r.count || 0 }
        }),

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
      atDaep: atDaepRes.count || 0,
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
      const studentDetailsBySkill = {}
      ;(rows || []).forEach(r => {
        const gap = r.skill_gap
        counts[gap] = (counts[gap] || 0) + 1
        if (!studentDetailsBySkill[gap]) studentDetailsBySkill[gap] = {}
        if (!studentDetailsBySkill[gap][r.student_id]) {
          studentDetailsBySkill[gap][r.student_id] = {
            id: r.student_id,
            first_name: r.students?.first_name,
            last_name: r.students?.last_name,
            grade_level: r.students?.grade_level,
            referral_count: 0,
          }
        }
        studentDetailsBySkill[gap][r.student_id].referral_count++
      })

      const gapData = Object.entries(counts)
        .map(([gap, count]) => {
          const students = Object.values(studentDetailsBySkill[gap] || {}).sort((a, b) => b.referral_count - a.referral_count)
          return {
            gap,
            label: SKILL_GAP_LABELS[gap] || gap,
            count,
            unique_students: students.length,
            interventions: SKILL_INTERVENTIONS[gap] || [],
            students,
          }
        })
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
        .select('campus_id, student_id, students(id, first_name, last_name, grade_level), campuses(id, name)')
        .eq('district_id', districtId)
        .gte('referral_date', d90)

      let studQ = supabase
        .from('students')
        .select('id, grade_level, campus_id')
        .eq('district_id', districtId)
        .eq('is_active', true)

      let campusQ = supabase
        .from('campuses')
        .select('id, name, settings')
        .eq('district_id', districtId)

      if (!isAdmin && campusIds?.length) {
        refQ = refQ.in('campus_id', campusIds)
        studQ = studQ.in('campus_id', campusIds)
        campusQ = campusQ.in('id', campusIds)
      }

      const [refRes, studRes, campusRes] = await Promise.all([refQ, studQ, campusQ])

      if (refRes.error) throw refRes.error

      const referrals = refRes.data || []
      const allStudents = studRes.data || []

      const campusRefs = {}
      const campusNames = {}
      const campusStudents = {}
      referrals.forEach(r => {
        campusRefs[r.campus_id] = (campusRefs[r.campus_id] || 0) + 1
        if (r.campuses) campusNames[r.campus_id] = r.campuses.name
        if (!campusStudents[r.campus_id]) campusStudents[r.campus_id] = {}
        if (!campusStudents[r.campus_id][r.student_id]) {
          campusStudents[r.campus_id][r.student_id] = {
            id: r.student_id,
            first_name: r.students?.first_name,
            last_name: r.students?.last_name,
            grade_level: r.students?.grade_level,
            referral_count: 0,
          }
        }
        campusStudents[r.campus_id][r.student_id].referral_count++
      })

      // Build campus enrollment map — prefer settings.enrollment over student count
      const campusSettings = {}
      ;(campusRes.data || []).forEach(c => { campusSettings[c.id] = c.settings || {} })

      const campusPop = {}
      allStudents.forEach(s => {
        campusPop[s.campus_id] = (campusPop[s.campus_id] || 0) + 1
      })
      // Override with settings.enrollment if set
      Object.entries(campusSettings).forEach(([cid, s]) => {
        if (s.enrollment) campusPop[cid] = s.enrollment
      })

      setCampusData(
        Object.entries(campusRefs)
          .map(([cid, refs]) => ({
            campus_id: cid,
            name: campusNames[cid] || 'Unknown',
            referrals: refs,
            enrollment: campusPop[cid] || 0,
            rate: campusPop[cid] ? +(refs / campusPop[cid] * 100).toFixed(1) : null,
            students: Object.values(campusStudents[cid] || {}).sort((a, b) => b.referral_count - a.referral_count),
          }))
          .sort((a, b) => (b.rate || 0) - (a.rate || 0))
      )

      // Build grade enrollment — prefer settings.enrollment_by_grade over student count
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
      // Override with enrollment_by_grade if any campus has it configured
      const hasGradeEnrollment = Object.values(campusSettings).some(s => s.enrollment_by_grade)
      if (hasGradeEnrollment) {
        Object.keys(gradePop).forEach(k => { gradePop[k] = 0 })
        Object.values(campusSettings).forEach(s => {
          if (s.enrollment_by_grade) {
            Object.entries(s.enrollment_by_grade).forEach(([grade, count]) => {
              gradePop[grade] = (gradePop[grade] || 0) + count
            })
          }
        })
      }

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

// ─── Post-DAEP Return ────────────────────────────────────────────────────────

/**
 * Students returning from DAEP to the viewer's home campus in the last 90 days.
 * Reads from Waypoint tables (incidents + transition_plans) — no Navigator tables involved.
 *
 * Returns students whose DAEP incident is completed, transition plan handoff is
 * pending or accepted, and student.campus_id matches the viewer's campus scope.
 */
export function useDaepReturns() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

      let q = supabase
        .from('incidents')
        .select(`
          id, status, consequence_days, consequence_start, incident_date,
          student:students!inner(id, first_name, last_name, grade_level, campus_id,
            campus:campuses!campus_id(id, name)),
          transition_plans(id, handoff_status, handoff_initiated_at, home_campus_accepted_at,
            post_return_adjustments, behavioral_supports, academic_supports, parent_engagement_plan,
            review_30_date, review_60_date, review_90_date)
        `)
        .eq('district_id', districtId)
        .eq('consequence_type', 'daep')
        .eq('status', 'completed')
        .gte('updated_at', ninetyDaysAgo)

      if (!isAdmin && campusIds?.length) {
        q = q.in('student.campus_id', campusIds)
      }

      const { data, error } = await q
      if (error) throw error

      // Filter to only those with a handoff-initiated plan
      const filtered = (data || []).filter(inc => {
        const plan = inc.transition_plans?.[0]
        return plan && plan.handoff_status
      }).map(inc => {
        const plan = inc.transition_plans[0]
        return {
          ...inc,
          plan,
          handoffAccepted: plan.handoff_status === 'accepted',
          handoffPending: plan.handoff_status === 'pending_home_campus',
        }
      })

      // Sort: pending first, then by handoff date desc
      filtered.sort((a, b) => {
        if (a.handoffPending && !b.handoffPending) return -1
        if (!a.handoffPending && b.handoffPending) return 1
        const dateA = a.plan.handoff_initiated_at || ''
        const dateB = b.plan.handoff_initiated_at || ''
        return dateB.localeCompare(dateA)
      })

      setReturns(filtered)
    } catch (err) {
      console.error('useDaepReturns error:', err)
    } finally {
      setLoading(false)
    }
  }, [districtId, campusIds, isAdmin])

  useEffect(() => { fetch() }, [fetch])
  return { returns, loading, refetch: fetch }
}

/**
 * Create a Navigator support plan seeded from a Waypoint transition plan.
 * Extracts behavioral + academic supports from the plan and creates
 * navigator_supports records for the returning student.
 */
export function useCreateReturnSupports() {
  const { districtId, user } = useAuth()
  const [loading, setLoading] = useState(false)

  const createFromPlan = useCallback(async (studentId, campusId, plan) => {
    setLoading(true)
    try {
      const supports = []

      // Parse behavioral_supports from the transition plan
      const behavioral = plan.behavioral_supports
      if (behavioral && (typeof behavioral === 'string' ? behavioral.trim() : true)) {
        supports.push({
          district_id: districtId,
          campus_id: campusId,
          student_id: studentId,
          support_type: 'behavior_contract',
          assigned_by: user.id,
          status: 'active',
          notes: `[Post-DAEP] ${typeof behavioral === 'string' ? behavioral : JSON.stringify(behavioral)}${plan.post_return_adjustments ? '\n\nAdjustments: ' + plan.post_return_adjustments : ''}`,
        })
      }

      // Parse academic_supports
      const academic = plan.academic_supports
      if (academic && (typeof academic === 'string' ? academic.trim() : true)) {
        supports.push({
          district_id: districtId,
          campus_id: campusId,
          student_id: studentId,
          support_type: 'mentoring',
          assigned_by: user.id,
          status: 'active',
          notes: `[Post-DAEP Academic] ${typeof academic === 'string' ? academic : JSON.stringify(academic)}`,
        })
      }

      // If no specific supports but there are post-return adjustments, create a general one
      if (supports.length === 0 && plan.post_return_adjustments) {
        supports.push({
          district_id: districtId,
          campus_id: campusId,
          student_id: studentId,
          support_type: 'other',
          assigned_by: user.id,
          status: 'active',
          notes: `[Post-DAEP Return] ${plan.post_return_adjustments}`,
        })
      }

      if (supports.length === 0) {
        return { success: true, count: 0 }
      }

      const { error } = await supabase
        .from('navigator_supports')
        .insert(supports)
      if (error) throw error
      return { success: true, count: supports.length }
    } catch (err) {
      console.error('createFromPlan error:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [districtId, user?.id])

  return { createFromPlan, loading }
}

/**
 * DAEP Risk Score — identifies students at elevated risk of DAEP referral.
 * Factors: ISS/OSS count (rolling 180 days), repeat offenses, failed supports.
 * Returns students sorted by risk score descending.
 */
export function useDaepRiskStudents() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    try {
      const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0]

      // 1. All ISS/OSS placements in rolling 180 days
      let placementQ = supabase
        .from('navigator_placements')
        .select('student_id, placement_type, start_date, students(id, first_name, last_name, grade_level, campus_id, is_sped, is_504)')
        .eq('district_id', districtId)
        .gte('start_date', sixMonthsAgo)
      if (!isAdmin && campusIds?.length) placementQ = placementQ.in('campus_id', campusIds)
      const { data: placements } = await placementQ

      // 2. Failed/discontinued supports in same window
      let supportQ = supabase
        .from('navigator_supports')
        .select('student_id, status, support_type')
        .eq('district_id', districtId)
        .eq('status', 'discontinued')
        .gte('start_date', sixMonthsAgo)
      if (!isAdmin && campusIds?.length) supportQ = supportQ.in('campus_id', campusIds)
      const { data: failedSupports } = await supportQ

      // 3. Aggregate per student
      const byStudent = {}
      ;(placements || []).forEach(p => {
        const sid = p.student_id
        if (!byStudent[sid]) {
          byStudent[sid] = {
            student_id: sid,
            student: p.students,
            issCount: 0,
            ossCount: 0,
            totalPlacements: 0,
            failedSupports: 0,
            riskScore: 0,
          }
        }
        byStudent[sid].totalPlacements++
        if (p.placement_type === 'iss') byStudent[sid].issCount++
        if (p.placement_type === 'oss') byStudent[sid].ossCount++
      })

      ;(failedSupports || []).forEach(s => {
        if (byStudent[s.student_id]) byStudent[s.student_id].failedSupports++
      })

      // 3b. Check for prior DAEP history (completed DAEP incidents)
      const studentIds = Object.keys(byStudent)
      let priorDaepIds = new Set()
      if (studentIds.length > 0) {
        const { data: daepInc } = await supabase
          .from('incidents')
          .select('student_id')
          .eq('district_id', districtId)
          .eq('consequence_type', 'daep')
          .in('status', ['completed', 'active'])
          .in('student_id', studentIds)
        ;(daepInc || []).forEach(d => priorDaepIds.add(d.student_id))
      }

      // 4. Compute risk score (0-100)
      //    OSS weighted 3x, ISS 1x, failed supports 2x each
      //    Prior DAEP adds +30
      //    Thresholds: 50+ = elevated, 70+ = high, 85+ = critical
      Object.values(byStudent).forEach(s => {
        const daepBoost = priorDaepIds.has(s.student_id) ? 30 : 0
        const raw = (s.issCount * 10) + (s.ossCount * 25) + (s.failedSupports * 15) + daepBoost
        s.riskScore = Math.min(100, raw)
        s.priorDaep = priorDaepIds.has(s.student_id)
      })

      // 5. Filter to elevated+ and sort
      const atRisk = Object.values(byStudent)
        .filter(s => s.riskScore >= 40)
        .sort((a, b) => b.riskScore - a.riskScore)

      setStudents(atRisk)
    } catch (err) {
      console.error('useDaepRiskStudents error:', err)
    } finally {
      setLoading(false)
    }
  }, [districtId, campusIds, isAdmin])

  useEffect(() => { fetch() }, [fetch])
  return { students, loading, refetch: fetch }
}

/**
 * Returns DAEP status for a single student — used on Navigator student detail page.
 * - atDaep: true if currently in an active DAEP placement
 * - priorDaep: array of completed DAEP incidents (dates, days served)
 */
export function useStudentDaepStatus(studentId) {
  const { districtId } = useAuth()
  const [status, setStatus] = useState({ atDaep: false, priorDaep: [], loading: true })

  useEffect(() => {
    if (!studentId || !districtId) { setStatus({ atDaep: false, priorDaep: [], loading: false }); return }

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('incidents')
        .select('id, status, consequence_days, consequence_start, incident_date, updated_at')
        .eq('district_id', districtId)
        .eq('student_id', studentId)
        .eq('consequence_type', 'daep')
        .in('status', ['active', 'approved', 'completed'])
        .order('incident_date', { ascending: false })

      const incidents = data || []
      const active = incidents.find(i => i.status === 'active' || i.status === 'approved')
      const completed = incidents.filter(i => i.status === 'completed')

      setStatus({
        atDaep: !!active,
        activeDaepIncident: active || null,
        priorDaep: completed.map(i => ({
          id: i.id,
          date: i.incident_date,
          days: i.consequence_days,
          completedAt: i.updated_at,
        })),
        loading: false,
      })
    }
    fetchStatus()
  }, [studentId, districtId])

  return status
}

// ─── Student Monitors (Dashboard Alerts) ─────────────────────────────────────

const MONITOR_TYPE_LABELS = {
  new_referral: 'New Referral Watch',
  review_due: 'Review Due',
  support_ending: 'Support Ending Soon',
  reentry_check: 'Re-Entry Check',
  weekly_check: 'Weekly Check-In',
  custom: 'Custom Reminder',
}
export { MONITOR_TYPE_LABELS }

export function useStudentMonitors() {
  const { districtId, campusIds, isAdmin } = useAuth()
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMonitors = useCallback(async () => {
    if (!districtId) return
    setLoading(true)
    try {
      let q = supabase
        .from('navigator_student_monitors')
        .select('*, students(id, first_name, last_name, grade_level, campus_id)')
        .eq('district_id', districtId)
        .eq('is_active', true)
        .is('dismissed_at', null)
        .order('alert_date', { ascending: true, nullsFirst: false })

      if (!isAdmin && campusIds?.length) q = q.in('campus_id', campusIds)

      const { data, error } = await q
      if (error) throw error
      setMonitors(data || [])
    } catch (e) {
      console.error('Monitors fetch error:', e.message)
      setMonitors([])
    } finally {
      setLoading(false)
    }
  }, [districtId, isAdmin, campusIds])

  useEffect(() => { fetchMonitors() }, [fetchMonitors])

  const createMonitor = async (monitor) => {
    const { error } = await supabase.from('navigator_student_monitors').insert(monitor)
    if (error) return { error: error.message }
    fetchMonitors()
    return { error: null }
  }

  const dismissMonitor = async (id) => {
    await supabase.from('navigator_student_monitors').update({ dismissed_at: new Date().toISOString() }).eq('id', id)
    fetchMonitors()
  }

  const deactivateMonitor = async (id) => {
    await supabase.from('navigator_student_monitors').update({ is_active: false }).eq('id', id)
    fetchMonitors()
  }

  return { monitors, loading, refetch: fetchMonitors, createMonitor, dismissMonitor, deactivateMonitor }
}
