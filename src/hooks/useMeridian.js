import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Generic hook factory
function useQuery(queryFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rev, setRev] = useState(0)
  const refetch = useCallback(() => setRev(r => r + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    queryFn().then(({ data, error }) => {
      if (!cancelled) {
        if (error) setError(error)
        else setData(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, rev])

  return { data, loading, error, refetch }
}

// ── Campuses (shared table, scoped by district) ───────────────────────────────
export function useMeridianCampuses() {
  const { districtId } = useAuth()
  return useQuery(() =>
    supabase.from('campuses').select('*').eq('district_id', districtId).order('name')
  , [districtId])
}

// ── Compliance Deadlines (computed view) ──────────────────────────────────────
export function useDeadlines(filter = null) {
  const { districtId } = useAuth()
  return useQuery(() => {
    let q = supabase
      .from('meridian_compliance_deadlines')
      .select('*')
      .eq('district_id', districtId)
      .order('days_remaining', { ascending: true })

    if (filter === 'overdue')  q = q.lt('days_remaining', 0)
    if (filter === 'critical') q = q.gte('days_remaining', 0).lte('days_remaining', 7)
    if (filter === 'warning')  q = q.gte('days_remaining', 8).lte('days_remaining', 14)

    return q
  }, [districtId, filter])
}

// ── Students ──────────────────────────────────────────────────────────────────
export function useMeridianStudents(campusId = null) {
  const { districtId } = useAuth()
  return useQuery(() => {
    let q = supabase
      .from('meridian_students')
      .select(`
        *,
        campus:campuses(id, name),
        meridian_ieps(id, annual_review_due, annual_review_held, status),
        meridian_plans_504(id, annual_review_due, is_dyslexia_plan, hb3928_reviewed, mdt_composition_verified)
      `)
      .eq('district_id', districtId)
      .order('last_name')

    if (campusId) q = q.eq('campus_id', campusId)
    return q
  }, [districtId, campusId])
}

export function useMeridianStudent(studentId) {
  const { districtId } = useAuth()
  return useQuery(() =>
    supabase
      .from('meridian_students')
      .select(`
        *,
        campus:campuses(id, name),
        meridian_referrals(*),
        meridian_ieps(*, case_manager:profiles(full_name, email)),
        meridian_plans_504(*, case_manager:profiles(full_name, email))
      `)
      .eq('district_id', districtId)
      .eq('id', studentId)
      .single()
  , [districtId, studentId])
}

// ── Folder Readiness (computed view) ─────────────────────────────────────────
export function useFolderReadiness(campusId = null) {
  const { districtId } = useAuth()
  return useQuery(() => {
    let q = supabase
      .from('meridian_student_folder_readiness')
      .select('*')
      .eq('district_id', districtId)

    if (campusId) q = q.eq('campus_id', campusId)
    return q
  }, [districtId, campusId])
}

export function useCampusReadinessScores() {
  const { districtId } = useAuth()
  return useQuery(async () => {
    const { data, error } = await supabase
      .from('meridian_student_folder_readiness')
      .select('campus_id, campus_name, iep_readiness_pct, plan_504_readiness_pct')
      .eq('district_id', districtId)

    if (error) return { data: null, error }

    const grouped = {}
    for (const row of data) {
      if (!grouped[row.campus_id]) {
        grouped[row.campus_id] = { campus_id: row.campus_id, campus_name: row.campus_name, scores: [], count: 0 }
      }
      const score = row.iep_readiness_pct ?? row.plan_504_readiness_pct ?? null
      if (score !== null) grouped[row.campus_id].scores.push(score)
      grouped[row.campus_id].count++
    }

    const result = Object.values(grouped).map(g => ({
      campus_id: g.campus_id,
      campus_name: g.campus_name,
      readiness: g.scores.length > 0 ? Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length) : 0,
      spedCount: g.count,
    }))

    return { data: result, error: null }
  }, [districtId])
}

// ── Dyslexia / HB 3928 ───────────────────────────────────────────────────────
export function useDyslexiaStudents() {
  const { districtId } = useAuth()
  return useQuery(() =>
    supabase
      .from('meridian_students')
      .select(`
        *,
        campus:campuses(name),
        meridian_plans_504(id, is_dyslexia_plan, hb3928_reviewed, mdt_composition_verified, progress_report_required),
        meridian_plan_504_progress_reports(id, grading_period, due_date, status)
      `)
      .eq('district_id', districtId)
      .eq('dyslexia_identified', true)
      .order('last_name')
  , [districtId])
}

// ── CAP Findings ──────────────────────────────────────────────────────────────
export function useCAPs() {
  const { districtId } = useAuth()
  return useQuery(() =>
    supabase
      .from('meridian_cap_findings')
      .select('*, meridian_cap_tasks(*)')
      .eq('district_id', districtId)
      .order('issued_date', { ascending: false })
  , [districtId])
}

// ── Integration Sources ───────────────────────────────────────────────────────
export function useIntegrationSources() {
  const { districtId } = useAuth()
  return useQuery(() =>
    supabase
      .from('meridian_integration_sources')
      .select('*')
      .eq('district_id', districtId)
      .order('source_name')
  , [districtId])
}

export function useImportLogs() {
  const { districtId } = useAuth()
  return useQuery(() =>
    supabase
      .from('meridian_import_logs')
      .select('*')
      .eq('district_id', districtId)
      .order('started_at', { ascending: false })
      .limit(20)
  , [districtId])
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export function useDashboardStats() {
  const { districtId } = useAuth()
  return useQuery(async () => {
    const [deadlines, dyslexia, caps] = await Promise.all([
      supabase.from('meridian_compliance_deadlines').select('status, days_remaining').eq('district_id', districtId),
      supabase.from('meridian_students').select('id').eq('district_id', districtId).eq('dyslexia_identified', true).eq('hb3928_review_status', 'pending'),
      supabase.from('meridian_cap_findings').select('id, status').eq('district_id', districtId).neq('status', 'closed'),
    ])

    const overdueCount    = deadlines.data?.filter(d => d.status === 'overdue').length ?? 0
    const criticalCount   = deadlines.data?.filter(d => d.status === 'critical').length ?? 0
    const dyslexiaPending = dyslexia.data?.length ?? 0
    const activeCaps      = caps.data?.length ?? 0

    return {
      data: { overdueCount, criticalCount, dyslexiaPending, activeCaps },
      error: deadlines.error || dyslexia.error || caps.error,
    }
  }, [districtId])
}

// ── Waypoint-linked students ──────────────────────────────────────────────────
export function useWaypointLinked() {
  const { districtId } = useAuth()
  return useQuery(() =>
    supabase
      .from('meridian_students')
      .select(`
        *,
        campus:campuses(name),
        meridian_ieps(id, status, annual_review_due, annual_review_held),
        meridian_plans_504(id, status)
      `)
      .eq('district_id', districtId)
      .not('waypoint_student_id', 'is', null)
      .order('last_name')
  , [districtId])
}

// ── Mutations (async functions, not hooks) ────────────────────────────────────

export async function scheduleARDMeeting({ referralId, ardDueDate, evalCompletedDate }) {
  const update = { ard_due_date: ardDueDate }
  if (evalCompletedDate) update.eval_completed_date = evalCompletedDate
  const { error } = await supabase.from('meridian_referrals').update(update).eq('id', referralId)
  return { error }
}

export async function linkToWaypoint({ meridianStudentId, waypointStudentId }) {
  const { error } = await supabase
    .from('meridian_students')
    .update({ waypoint_student_id: waypointStudentId })
    .eq('id', meridianStudentId)
  return { error }
}

export async function markHB3928Reviewed({ planId, studentId }) {
  const [a, b] = await Promise.all([
    supabase.from('meridian_plans_504')
      .update({ hb3928_reviewed: true })
      .eq('id', planId),
    supabase.from('meridian_students')
      .update({ hb3928_review_status: 'complete' })
      .eq('id', studentId),
  ])
  return { error: a.error || b.error }
}

export async function toggleCAPTask({ taskId, currentStatus }) {
  const newStatus = currentStatus === 'complete' ? 'pending' : 'complete'
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase.from('meridian_cap_tasks')
    .update({ status: newStatus, completed_date: newStatus === 'complete' ? today : null })
    .eq('id', taskId)
  return { error }
}

export async function createCAPFinding({ districtId, campusId, findingNumber, description, legalCitation, systemicDue, childDue, tasks }) {
  const { data, error } = await supabase.from('meridian_cap_findings').insert({
    district_id: districtId,
    campus_id: campusId || null,
    finding_number: findingNumber,
    description,
    legal_citation: legalCitation || null,
    issued_date: new Date().toISOString().split('T')[0],
    systemic_correction_due: systemicDue || null,
    child_correction_due: childDue || null,
    status: 'open',
  }).select().single()
  if (error || !data) return { error: error || new Error('Failed to create finding') }
  if (tasks?.length) {
    const { error: taskError } = await supabase.from('meridian_cap_tasks').insert(
      tasks.filter(t => t.trim()).map(t => ({
        finding_id: data.id,
        district_id: districtId,
        task_label: t.trim(),
        status: 'pending',
      }))
    )
    if (taskError) return { error: taskError }
  }
  return { error: null }
}
