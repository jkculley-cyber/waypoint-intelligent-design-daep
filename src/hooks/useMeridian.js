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

// ── Secondary Transition (SPPI-13) + RDA ─────────────────────────────────────

function currentSchoolYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 7 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

export function useSPPI13Students() {
  const { districtId } = useAuth()
  return useQuery(() =>
    supabase
      .from('meridian_students')
      .select(`
        id, first_name, last_name, grade, campus_id,
        sped_status,
        campus:campuses(id, name),
        meridian_ieps(id, status),
        meridian_secondary_transitions(
          id, school_year,
          has_postsecondary_goals, postsecondary_goals_date,
          education_goal, employment_goal, independent_living_goal,
          has_transition_assessments, transition_assessments_date, assessment_types,
          has_transition_services, transition_services_date,
          student_participated, student_participation_date,
          agency_invited, agency_participated, agency_name, agency_invitation_date,
          notes, updated_by, updated_at
        )
      `)
      .eq('district_id', districtId)
      .eq('sped_status', 'eligible')
      .gte('grade', 10)
      .order('last_name')
  , [districtId])
}

export function useRDADetermination() {
  const { districtId } = useAuth()
  const sy = currentSchoolYear()
  return useQuery(() =>
    supabase
      .from('meridian_rda_determination')
      .select('*')
      .eq('district_id', districtId)
      .eq('school_year', sy)
      .maybeSingle()
  , [districtId])
}

export function useRDAIndicators() {
  const { districtId } = useAuth()
  const sy = currentSchoolYear()
  return useQuery(() =>
    supabase
      .from('meridian_rda_indicators')
      .select('*')
      .eq('district_id', districtId)
      .eq('school_year', sy)
  , [districtId])
}

// Campus-level RDA breakdown — auto-derived from existing Meridian data
export function useCampusRDABreakdown() {
  const { districtId } = useAuth()
  const sy = currentSchoolYear()

  return useQuery(async () => {
    const [campusesRes, deadlinesRes, transitionsRes, folderRes, referralsRes, studentsRes] =
      await Promise.all([
        supabase.from('campuses').select('id, name').eq('district_id', districtId).order('name'),
        supabase.from('meridian_compliance_deadlines').select('campus_id, status').eq('district_id', districtId),
        supabase.from('meridian_secondary_transitions')
          .select('student_id, school_year, has_postsecondary_goals, has_transition_assessments, has_transition_services, student_participated, agency_invited, student:meridian_students(campus_id)')
          .eq('district_id', districtId)
          .eq('school_year', sy),
        supabase.from('meridian_student_folder_readiness').select('campus_id, iep_readiness_pct, plan_504_readiness_pct').eq('district_id', districtId),
        supabase.from('meridian_referrals').select('campus_id, ard_due_date, ard_held_date').eq('district_id', districtId).not('ard_due_date', 'is', null),
        supabase.from('meridian_students').select('campus_id').eq('district_id', districtId).eq('sped_status', 'eligible'),
      ])

    const err = campusesRes.error || deadlinesRes.error || transitionsRes.error || folderRes.error || referralsRes.error || studentsRes.error
    if (err) return { data: null, error: err }

    const campusMap = {}
    for (const c of (campusesRes.data ?? [])) {
      campusMap[c.id] = {
        campus_id: c.id, campus_name: c.name,
        sped_count: 0,
        sppi11_ontime: 0, sppi11_total: 0,
        sppi13_compliant: 0, sppi13_total: 0,
        folder_scores: [],
        ard_ontime: 0, ard_total: 0,
      }
    }

    for (const s of (studentsRes.data ?? [])) {
      if (campusMap[s.campus_id]) campusMap[s.campus_id].sped_count++
    }

    for (const d of (deadlinesRes.data ?? [])) {
      if (campusMap[d.campus_id]) {
        campusMap[d.campus_id].sppi11_total++
        if (d.status !== 'overdue') campusMap[d.campus_id].sppi11_ontime++
      }
    }

    for (const t of (transitionsRes.data ?? [])) {
      const cid = t.student?.campus_id
      if (cid && campusMap[cid]) {
        campusMap[cid].sppi13_total++
        if (t.has_postsecondary_goals && t.has_transition_assessments &&
            t.has_transition_services && t.student_participated && t.agency_invited) {
          campusMap[cid].sppi13_compliant++
        }
      }
    }

    for (const f of (folderRes.data ?? [])) {
      if (campusMap[f.campus_id]) {
        const score = f.iep_readiness_pct ?? f.plan_504_readiness_pct
        if (score !== null && score !== undefined) campusMap[f.campus_id].folder_scores.push(score)
      }
    }

    for (const r of (referralsRes.data ?? [])) {
      if (campusMap[r.campus_id]) {
        campusMap[r.campus_id].ard_total++
        if (r.ard_held_date && r.ard_held_date <= r.ard_due_date) {
          campusMap[r.campus_id].ard_ontime++
        }
      }
    }

    const rows = Object.values(campusMap).map(c => ({
      campus_id:    c.campus_id,
      campus_name:  c.campus_name,
      sped_count:   c.sped_count,
      sppi11_pct:   c.sppi11_total > 0 ? Math.round(c.sppi11_ontime / c.sppi11_total * 100) : null,
      sppi13_pct:   c.sppi13_total > 0 ? Math.round(c.sppi13_compliant / c.sppi13_total * 100) : null,
      folder_pct:   c.folder_scores.length > 0 ? Math.round(c.folder_scores.reduce((a, b) => a + b, 0) / c.folder_scores.length) : null,
      ard_pct:      c.ard_total > 0 ? Math.round(c.ard_ontime / c.ard_total * 100) : null,
    }))

    // Compute district-wide totals from raw counters
    const totals = Object.values(campusMap).reduce(
      (acc, c) => {
        acc.sped_count   += c.sped_count
        acc.sppi11_ontime += c.sppi11_ontime;  acc.sppi11_total += c.sppi11_total
        acc.sppi13_compliant += c.sppi13_compliant; acc.sppi13_total += c.sppi13_total
        acc.folder_scores.push(...c.folder_scores)
        acc.ard_ontime += c.ard_ontime;  acc.ard_total += c.ard_total
        return acc
      },
      { sped_count: 0, sppi11_ontime: 0, sppi11_total: 0, sppi13_compliant: 0, sppi13_total: 0, folder_scores: [], ard_ontime: 0, ard_total: 0 }
    )

    const districtRow = {
      campus_id:   'district',
      campus_name: 'District Total',
      sped_count:  totals.sped_count,
      sppi11_pct:  totals.sppi11_total > 0 ? Math.round(totals.sppi11_ontime / totals.sppi11_total * 100) : null,
      sppi13_pct:  totals.sppi13_total > 0 ? Math.round(totals.sppi13_compliant / totals.sppi13_total * 100) : null,
      folder_pct:  totals.folder_scores.length > 0 ? Math.round(totals.folder_scores.reduce((a, b) => a + b, 0) / totals.folder_scores.length) : null,
      ard_pct:     totals.ard_total > 0 ? Math.round(totals.ard_ontime / totals.ard_total * 100) : null,
    }

    return { data: [districtRow, ...rows], error: null }
  }, [districtId])
}

export async function upsertTransitionPlan(data) {
  const { error } = await supabase
    .from('meridian_secondary_transitions')
    .upsert(data, { onConflict: 'district_id,student_id,school_year' })
  return { error }
}

export async function upsertRDADetermination(data) {
  const cadenceMap = { dl2: 90, dl3: 60, dl4: 30 }
  const payload = {
    ...data,
    checkin_cadence_days: cadenceMap[data.determination_level] ?? null,
  }
  const { error } = await supabase
    .from('meridian_rda_determination')
    .upsert(payload, { onConflict: 'district_id,school_year' })
  return { error }
}

export async function upsertRDAIndicator(data) {
  const { error } = await supabase
    .from('meridian_rda_indicators')
    .upsert(data, { onConflict: 'district_id,school_year,sppi_number' })
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
