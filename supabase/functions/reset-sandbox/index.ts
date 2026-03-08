// Supabase Edge Function: reset-sandbox
// Wipes all transactional data for Explorer ISD and reseeds a rich dataset.
//
// POST { confirm: true } with service role bearer token
// Returns { success: true, seeded_at: ISO } or { error: "..." }
//
// Deploy: supabase functions deploy reset-sandbox
// Secret: supabase secrets set SERVICE_ROLE_KEY=<service-role-key>

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')     || 'https://kvxecksvkimcgwhxxyhw.supabase.co'

const D      = '22222222-2222-2222-2222-222222222222'
const HS     = 'bbbb0001-0001-0001-0001-000000000001'
const MS     = 'bbbb0001-0001-0001-0001-000000000002'
const EL     = 'bbbb0001-0001-0001-0001-000000000003'
const DAEP_C = 'bbbb0001-0001-0001-0001-000000000004'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

async function getAdminId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('district_id', D)
    .eq('role', 'admin')
    .limit(1)
    .single()
  if (error || !data) throw new Error(`Admin lookup: ${error?.message}`)
  return data.id
}

async function wipe(supabase: ReturnType<typeof createClient>, adminId: string) {
  // Get incident IDs
  const { data: incRows } = await supabase.from('incidents').select('id').eq('district_id', D)
  const incidentIds = (incRows || []).map((r: { id: string }) => r.id)

  // Get transition plan IDs
  const { data: tpRows } = await supabase.from('transition_plans').select('id').eq('district_id', D)
  const tpIds = (tpRows || []).map((r: { id: string }) => r.id)

  if (tpIds.length) {
    await supabase.from('transition_plan_reviews').delete().in('plan_id', tpIds)
  }
  await supabase.from('transition_plans').delete().eq('district_id', D)
  await supabase.from('alerts').delete().eq('district_id', D)
  await supabase.from('daily_behavior_tracking').delete().eq('district_id', D)

  if (incidentIds.length) {
    await supabase.from('incidents').update({ compliance_checklist_id: null }).in('id', incidentIds)
    await supabase.from('incident_separations').delete().in('incident_id', incidentIds)
  }

  await supabase.from('compliance_checklists').delete().eq('district_id', D)
  await supabase.from('incidents').delete().eq('district_id', D)
  await supabase.from('students').delete().eq('district_id', D)

  for (const t of ['navigator_supports', 'navigator_placements', 'navigator_referrals']) {
    await supabase.from(t).delete().eq('district_id', D)
  }
  for (const t of [
    'meridian_cap_findings', 'meridian_dyslexia_screenings', 'meridian_folder_readiness',
    'meridian_monitoring_logs', 'meridian_accommodation_plans', 'meridian_iep_goals',
    'meridian_service_logs', 'meridian_timeline_events', 'meridian_students',
  ]) {
    await supabase.from(t).delete().eq('district_id', D)
  }
}

async function reseed(supabase: ReturnType<typeof createClient>, adminId: string) {
  // ── Students ─────────────────────────────────────────────────────────────
  const studentDefs = [
    { student_id_number: 'EX-10001', first_name: 'Marcus',    last_name: 'Rivera',     grade_level: '10', campus_id: HS,   date_of_birth: '2008-03-15', special_ed_status: false, section_504: false },
    { student_id_number: 'EX-10002', first_name: 'Aaliyah',   last_name: 'Thompson',   grade_level: '9',  campus_id: HS,   date_of_birth: '2009-07-22', special_ed_status: true,  section_504: false },
    { student_id_number: 'EX-10003', first_name: 'DeShawn',   last_name: 'Williams',   grade_level: '11', campus_id: HS,   date_of_birth: '2007-11-03', special_ed_status: false, section_504: false },
    { student_id_number: 'EX-10004', first_name: 'Sofia',     last_name: 'Gutierrez',  grade_level: '10', campus_id: HS,   date_of_birth: '2008-05-18', special_ed_status: false, section_504: true  },
    { student_id_number: 'EX-10005', first_name: 'Jaylen',    last_name: 'Brooks',     grade_level: '12', campus_id: HS,   date_of_birth: '2006-09-09', special_ed_status: false, section_504: false },
    { student_id_number: 'EX-20001', first_name: 'Imani',     last_name: 'Jackson',    grade_level: '7',  campus_id: MS,   date_of_birth: '2011-02-14', special_ed_status: true,  section_504: false },
    { student_id_number: 'EX-20002', first_name: 'Carlos',    last_name: 'Mendoza',    grade_level: '8',  campus_id: MS,   date_of_birth: '2010-06-30', special_ed_status: false, section_504: false },
    { student_id_number: 'EX-20003', first_name: 'Zoe',       last_name: 'Patterson',  grade_level: '6',  campus_id: MS,   date_of_birth: '2012-01-25', special_ed_status: false, section_504: true  },
    { student_id_number: 'EX-20004', first_name: 'Tyrese',    last_name: 'Coleman',    grade_level: '7',  campus_id: MS,   date_of_birth: '2011-08-07', special_ed_status: true,  section_504: false },
    { student_id_number: 'EX-20005', first_name: 'Valentina', last_name: 'Cruz',       grade_level: '8',  campus_id: MS,   date_of_birth: '2010-04-19', special_ed_status: false, section_504: false },
    { student_id_number: 'EX-30001', first_name: 'Isaiah',    last_name: 'Foster',     grade_level: '4',  campus_id: EL,   date_of_birth: '2014-12-01', special_ed_status: true,  section_504: false },
    { student_id_number: 'EX-30002', first_name: 'Nia',       last_name: 'Harris',     grade_level: '3',  campus_id: EL,   date_of_birth: '2015-03-27', special_ed_status: false, section_504: false },
    { student_id_number: 'EX-30003', first_name: 'Elijah',    last_name: 'Moore',      grade_level: '5',  campus_id: EL,   date_of_birth: '2013-09-13', special_ed_status: false, section_504: true  },
    { student_id_number: 'EX-40001', first_name: 'Destiny',   last_name: 'Washington', grade_level: '9',  campus_id: HS,   date_of_birth: '2009-11-05', special_ed_status: true,  section_504: false },
    { student_id_number: 'EX-40002', first_name: 'Jordan',    last_name: 'Lee',        grade_level: '10', campus_id: HS,   date_of_birth: '2008-07-31', special_ed_status: false, section_504: false },
  ]
  const { data: insertedStudents, error: stuErr } = await supabase
    .from('students')
    .insert(studentDefs.map(s => ({ ...s, district_id: D })))
    .select('id, student_id_number, special_ed_status, section_504, campus_id')
  if (stuErr) throw new Error(`Students: ${stuErr.message}`)

  const byNum: Record<string, typeof insertedStudents[0]> = {}
  insertedStudents!.forEach((s: typeof insertedStudents[0]) => { byNum[s.student_id_number] = s })

  // ── Offense code lookup ──────────────────────────────────────────────────
  const { data: offenseRows } = await supabase
    .from('offense_codes').select('id').eq('district_id', D).limit(5)
  const off = (n: number) => offenseRows?.[n]?.id || offenseRows?.[0]?.id

  // ── Incidents ─────────────────────────────────────────────────────────────
  const incidentDefs = [
    { num: 'EX-10002', d: 45, days: 30, status: 'active',    ps: 43, pe: 13, off: 0 },
    { num: 'EX-20001', d: 20, days: 15, status: 'active',    ps: 18, pe: 3,  off: 3 },
    { num: 'EX-40001', d: 10, days: 20, status: 'pending',   ps: -1, pe: -1, off: 4 },
    { num: 'EX-20004', d: 5,  days: 10, status: 'pending',   ps: -1, pe: -1, off: 0 },
    { num: 'EX-10004', d: 30, days: 10, status: 'active',    ps: 28, pe: 18, off: 3 },
    { num: 'EX-20003', d: 15, days: 30, status: 'active',    ps: 13, pe: -17,off: 2 },
    { num: 'EX-30003', d: 7,  days: 5,  status: 'pending',   ps: -1, pe: -1, off: 3 },
    { num: 'EX-10001', d: 60, days: 30, status: 'completed', ps: 58, pe: 28, off: 0 },
    { num: 'EX-10003', d: 40, days: 45, status: 'active',    ps: 38, pe: -5, off: 1 },
    { num: 'EX-10005', d: 25, days: 20, status: 'active',    ps: 23, pe: 3,  off: 2 },
    { num: 'EX-20002', d: 12, days: 10, status: 'active',    ps: 10, pe: 0,  off: 0 },
    { num: 'EX-20005', d: 3,  days: 15, status: 'pending',   ps: -1, pe: -1, off: 4 },
    { num: 'EX-40002', d: 55, days: 30, status: 'completed', ps: 53, pe: 23, off: 0 },
  ]
  const incRows = incidentDefs.map(i => {
    const s = byNum[i.num]
    return {
      district_id:    D,
      campus_id:      s.campus_id,
      student_id:     s.id,
      offense_code_id: off(i.off),
      incident_date:  daysAgo(i.d),
      days_daep:      i.days,
      status:         i.status,
      placement_start: i.ps >= 0 ? daysAgo(i.ps) : null,
      placement_end:   i.pe >= 0 ? daysAgo(i.pe) : null,
      daep_campus_id:  DAEP_C,
      reported_by:     adminId,
    }
  }).filter(r => r.student_id)

  const { data: insertedInc, error: incErr } = await supabase
    .from('incidents').insert(incRows).select('id, student_id, status')
  if (incErr) throw new Error(`Incidents: ${incErr.message}`)

  // ── Compliance checklists — patch auto-created ones ───────────────────────
  const { data: checklists } = await supabase
    .from('compliance_checklists').select('id').eq('district_id', D)
  if (checklists && checklists.length >= 1) {
    await supabase.from('compliance_checklists').update({
      manifestation_date: daysAgo(43),
      manifestation_outcome: 'no_relationship',
      manifestation_complete: true,
      parent_notified: true,
      parent_notification_date: daysAgo(44),
    }).eq('id', checklists[0].id)
  }

  // ── Transition plans ──────────────────────────────────────────────────────
  const activeInc = (insertedInc || []).filter((i: { status: string }) => i.status === 'active').slice(0, 3)
  if (activeInc.length) {
    await supabase.from('transition_plans').insert(
      activeInc.map((inc: { id: string; student_id: string }, idx: number) => ({
        district_id:      D,
        incident_id:      inc.id,
        student_id:       inc.student_id,
        created_by:       adminId,
        academic_goals:   'Maintain grade-level work via campus packets and teacher check-ins.',
        behavioral_goals: 'Practice conflict resolution strategies daily with campus counselor.',
        review_30_day:    daysAgo(20 - idx * 5),
        review_60_day:    daysAgo(-10 + idx * 3),
        review_90_day:    daysAgo(-40 + idx * 3),
      }))
    )
  }

  // ── Behavior tracking ─────────────────────────────────────────────────────
  const trackRows = activeInc.flatMap((inc: { id: string; student_id: string }) =>
    Array.from({ length: 10 }, (_, i) => ({
      district_id:   D,
      incident_id:   inc.id,
      student_id:    inc.student_id,
      tracking_date: daysAgo(i + 1),
      behavior_score: Math.floor(Math.random() * 3) + 3,
      attendance:    true,
      recorded_by:   adminId,
    }))
  )
  if (trackRows.length) await supabase.from('daily_behavior_tracking').insert(trackRows)

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alertRows = [
    {
      district_id:  D, campus_id: HS,
      student_id:   byNum['EX-10002']?.id,
      trigger_type: 'sped_manifestation_due', severity: 'red',
      message:      'Manifestation determination overdue — SPED student in DAEP for 10+ days.',
      resolved:     false,
    },
    {
      district_id:  D, campus_id: HS,
      student_id:   byNum['EX-40001']?.id,
      trigger_type: 'sped_manifestation_due', severity: 'red',
      message:      'ARD meeting required within 10 days. 3 days remaining.',
      resolved:     false,
    },
    {
      district_id:  D, campus_id: MS,
      student_id:   byNum['EX-20002']?.id,
      trigger_type: 'placement_ending', severity: 'yellow',
      message:      'DAEP placement ends today. Transition plan review required.',
      resolved:     false,
    },
  ].filter(a => a.student_id)
  if (alertRows.length) await supabase.from('alerts').insert(alertRows)

  // ── Navigator referrals ───────────────────────────────────────────────────
  const navRows = [
    { district_id: D, campus_id: HS, student_id: byNum['EX-10001']?.id, referral_type: 'iss', referral_date: daysAgo(70), reported_by: adminId, status: 'closed', reason: 'Chronic tardiness escalating to disruption.' },
    { district_id: D, campus_id: MS, student_id: byNum['EX-20002']?.id, referral_type: 'oss', referral_date: daysAgo(15), reported_by: adminId, status: 'active', reason: 'Physical altercation.' },
    { district_id: D, campus_id: HS, student_id: byNum['EX-10005']?.id, referral_type: 'iss', referral_date: daysAgo(30), reported_by: adminId, status: 'active', reason: 'Drug-related behavior.' },
  ].filter(r => r.student_id)
  if (navRows.length) await supabase.from('navigator_referrals').insert(navRows)

  // ── Meridian students + timeline events ──────────────────────────────────
  const spedStudents = (insertedStudents || []).filter((s: { special_ed_status: boolean }) => s.special_ed_status).slice(0, 4)
  if (spedStudents.length) {
    const { data: ms } = await supabase
      .from('meridian_students')
      .insert(spedStudents.map((s: { id: string; campus_id: string }) => ({
        district_id: D, student_id: s.id, campus_id: s.campus_id,
        disability_category: 'Emotional Disturbance',
        eligibility_date: daysAgo(365),
        next_annual_review: daysAgo(-30),
        case_manager_id: adminId, iep_status: 'active',
      })))
      .select('id')

    if (ms && ms.length) {
      await supabase.from('meridian_timeline_events').insert(
        ms.flatMap((m: { id: string }) => [
          { district_id: D, meridian_student_id: m.id, event_type: 'iep_annual', event_date: daysAgo(365), due_date: daysAgo(335), status: 'completed', notes: 'Annual IEP meeting held.', created_by: adminId },
          { district_id: D, meridian_student_id: m.id, event_type: 'iep_annual', event_date: daysAgo(-30),  due_date: daysAgo(-20),  status: 'upcoming',  notes: 'Annual review due.', created_by: adminId },
        ])
      )
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth check — must present service role key as bearer
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!SERVICE_ROLE_KEY || token !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    const body = await req.json()
    if (!body.confirm) {
      return new Response(JSON.stringify({ error: 'Send { confirm: true } to proceed.' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const adminId = await getAdminId(supabase)
    await wipe(supabase, adminId)
    await reseed(supabase, adminId)

    const seeded_at = new Date().toISOString()
    return new Response(JSON.stringify({ success: true, seeded_at }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('reset-sandbox error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
