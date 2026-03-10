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

const D  = '22222222-2222-2222-2222-222222222222'
const HS = 'bbbb0001-0001-0001-0001-000000000001'
const MS = 'bbbb0001-0001-0001-0001-000000000002'
const EL = 'bbbb0001-0001-0001-0001-000000000003'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

type Supabase = ReturnType<typeof createClient>

async function getAdminId(sb: Supabase): Promise<string> {
  const { data, error } = await sb
    .from('profiles').select('id').eq('district_id', D).eq('role', 'admin').limit(1).single()
  if (error || !data) throw new Error(`Admin lookup: ${error?.message}`)
  return data.id
}

async function wipe(sb: Supabase) {
  const { data: tpRows } = await sb.from('transition_plans').select('id').eq('district_id', D)
  const tpIds = (tpRows || []).map((r: { id: string }) => r.id)
  if (tpIds.length) {
    await sb.from('transition_plan_reviews').delete().in('plan_id', tpIds)
    await sb.from('reentry_checkins').delete().in('plan_id', tpIds)
    await sb.from('reentry_checklists').delete().in('plan_id', tpIds)
  }

  await sb.from('transition_plans').delete().eq('district_id', D)
  await sb.from('alerts').delete().eq('district_id', D)
  await sb.from('daily_behavior_tracking').delete().eq('district_id', D)

  const { data: incRows } = await sb.from('incidents').select('id').eq('district_id', D)
  const incIds = (incRows || []).map((r: { id: string }) => r.id)
  if (incIds.length) {
    await sb.from('incidents').update({ compliance_checklist_id: null }).in('id', incIds)
    await sb.from('incident_separations').delete().in('incident_id', incIds)
  }

  await sb.from('compliance_checklists').delete().eq('district_id', D)
  await sb.from('incidents').delete().eq('district_id', D)
  await sb.from('offense_codes').delete().eq('district_id', D)
  await sb.from('students').delete().eq('district_id', D)

  for (const t of ['navigator_supports', 'navigator_placements', 'navigator_referrals'] as const) {
    await sb.from(t).delete().eq('district_id', D)
  }
  for (const t of ['meridian_cap_findings', 'meridian_students'] as const) {
    await sb.from(t).delete().eq('district_id', D)
  }
}

async function reseed(sb: Supabase, adminId: string) {
  const now = new Date()

  // ── Offense codes ─────────────────────────────────────────────────────────
  const { data: insertedCodes, error: codeErr } = await sb.from('offense_codes').insert([
    { district_id: D, code: 'F001', category: 'violence',   title: 'Physical Altercation / Fighting',      severity: 'serious',  is_mandatory_daep: false, is_discretionary_daep: true  },
    { district_id: D, code: 'F002', category: 'weapons',    title: 'Weapon Possession on Campus',           severity: 'severe',   is_mandatory_daep: true,  is_discretionary_daep: false },
    { district_id: D, code: 'F003', category: 'drugs',      title: 'Controlled Substance / Drug Use',       severity: 'severe',   is_mandatory_daep: true,  is_discretionary_daep: false },
    { district_id: D, code: 'F004', category: 'conduct',    title: 'Insubordination / Persistent Defiance', severity: 'moderate', is_mandatory_daep: false, is_discretionary_daep: true  },
    { district_id: D, code: 'F005', category: 'harassment', title: 'Harassment / Bullying',                 severity: 'serious',  is_mandatory_daep: false, is_discretionary_daep: true  },
  ]).select('id, code')
  if (codeErr) throw new Error(`Offense codes: ${codeErr.message}`)
  const c: Record<string, string> = {}
  insertedCodes!.forEach((x: { id: string; code: string }) => { c[x.code] = x.id })

  // ── Students — insert as non-SPED to avoid trigger conflict ───────────────
  // trg_check_sped_compliance (BEFORE INSERT) reads student.is_sped at trigger
  // time and tries to INSERT into compliance_checklists with incident_id=NEW.id
  // before the incident exists → FK violation. Insert all as false, patch after.
  const studentMeta: Record<string, { is_sped: boolean; is_504: boolean }> = {
    'EX-10001': { is_sped: false, is_504: false },
    'EX-10002': { is_sped: true,  is_504: false },
    'EX-10003': { is_sped: false, is_504: false },
    'EX-10004': { is_sped: false, is_504: true  },
    'EX-10005': { is_sped: false, is_504: false },
    'EX-20001': { is_sped: true,  is_504: false },
    'EX-20002': { is_sped: false, is_504: false },
    'EX-20003': { is_sped: false, is_504: true  },
    'EX-20004': { is_sped: true,  is_504: false },
    'EX-20005': { is_sped: false, is_504: false },
    'EX-30001': { is_sped: true,  is_504: false },
    'EX-30002': { is_sped: false, is_504: false },
    'EX-30003': { is_sped: false, is_504: true  },
    'EX-40001': { is_sped: true,  is_504: false },
    'EX-40002': { is_sped: false, is_504: false },
  }

  const { data: insertedStudents, error: stuErr } = await sb.from('students').insert([
    { district_id: D, campus_id: HS, student_id_number: 'EX-10001', first_name: 'Marcus',    last_name: 'Rivera',    grade_level: 10, date_of_birth: '2008-03-15', is_sped: false, is_504: false },
    { district_id: D, campus_id: HS, student_id_number: 'EX-10002', first_name: 'Aaliyah',   last_name: 'Thompson',  grade_level:  9, date_of_birth: '2009-07-22', is_sped: false, is_504: false },
    { district_id: D, campus_id: HS, student_id_number: 'EX-10003', first_name: 'DeShawn',   last_name: 'Williams',  grade_level: 11, date_of_birth: '2007-11-03', is_sped: false, is_504: false },
    { district_id: D, campus_id: HS, student_id_number: 'EX-10004', first_name: 'Sofia',     last_name: 'Gutierrez', grade_level: 10, date_of_birth: '2008-05-18', is_sped: false, is_504: false },
    { district_id: D, campus_id: HS, student_id_number: 'EX-10005', first_name: 'Jaylen',    last_name: 'Brooks',    grade_level: 12, date_of_birth: '2006-09-09', is_sped: false, is_504: false },
    { district_id: D, campus_id: MS, student_id_number: 'EX-20001', first_name: 'Imani',     last_name: 'Jackson',   grade_level:  7, date_of_birth: '2011-02-14', is_sped: false, is_504: false },
    { district_id: D, campus_id: MS, student_id_number: 'EX-20002', first_name: 'Carlos',    last_name: 'Mendoza',   grade_level:  8, date_of_birth: '2010-06-30', is_sped: false, is_504: false },
    { district_id: D, campus_id: MS, student_id_number: 'EX-20003', first_name: 'Zoe',       last_name: 'Patterson', grade_level:  6, date_of_birth: '2012-01-25', is_sped: false, is_504: false },
    { district_id: D, campus_id: MS, student_id_number: 'EX-20004', first_name: 'Tyrese',    last_name: 'Coleman',   grade_level:  7, date_of_birth: '2011-08-07', is_sped: false, is_504: false },
    { district_id: D, campus_id: MS, student_id_number: 'EX-20005', first_name: 'Valentina', last_name: 'Cruz',      grade_level:  8, date_of_birth: '2010-04-19', is_sped: false, is_504: false },
    { district_id: D, campus_id: EL, student_id_number: 'EX-30001', first_name: 'Isaiah',    last_name: 'Foster',    grade_level:  4, date_of_birth: '2014-12-01', is_sped: false, is_504: false },
    { district_id: D, campus_id: EL, student_id_number: 'EX-30002', first_name: 'Nia',       last_name: 'Harris',    grade_level:  3, date_of_birth: '2015-03-27', is_sped: false, is_504: false },
    { district_id: D, campus_id: EL, student_id_number: 'EX-30003', first_name: 'Elijah',    last_name: 'Moore',     grade_level:  5, date_of_birth: '2013-09-13', is_sped: false, is_504: false },
    { district_id: D, campus_id: HS, student_id_number: 'EX-40001', first_name: 'Destiny',   last_name: 'Washington',grade_level:  9, date_of_birth: '2009-11-05', is_sped: false, is_504: false },
    { district_id: D, campus_id: HS, student_id_number: 'EX-40002', first_name: 'Jordan',    last_name: 'Lee',       grade_level: 10, date_of_birth: '2008-07-31', is_sped: false, is_504: false },
  ]).select('id, student_id_number, campus_id, first_name, last_name')
  if (stuErr) throw new Error(`Students: ${stuErr.message}`)

  const s: Record<string, typeof insertedStudents[0] & { is_sped: boolean; is_504: boolean }> = {}
  insertedStudents!.forEach((x: typeof insertedStudents[0]) => {
    s[x.student_id_number] = { ...x, ...studentMeta[x.student_id_number] }
  })

  // ── Incidents ─────────────────────────────────────────────────────────────
  interface IncDef {
    student: typeof s[string]; code: string; days: number
    status: string; cs: number; ce: number; desc: string
  }
  const incidentDefs: IncDef[] = [
    { student: s['EX-10002'], code: 'F001', days: 30, status: 'active',       cs: 45, ce: 15, desc: 'Physical altercation in hallway. SPED student — manifestation determination required within 10 school days.' },
    { student: s['EX-20001'], code: 'F004', days: 15, status: 'active',       cs: 20, ce:  5, desc: 'Repeated defiance of campus authority. IEP team meeting required. ARD must occur by Day 10.' },
    { student: s['EX-40001'], code: 'F005', days: 20, status: 'under_review', cs: -1, ce: -1, desc: 'Peer harassment incident. Manifestation review pending — ARD within 10 school days of placement.' },
    { student: s['EX-20004'], code: 'F001', days: 10, status: 'under_review', cs: -1, ce: -1, desc: 'Physical altercation. SPED student — compliance checklist auto-generated by Waypoint.' },
    { student: s['EX-10004'], code: 'F004', days: 10, status: 'active',       cs: 30, ce: 20, desc: '504 student. Insubordination. Manifestation determination held — no causal relationship found.' },
    { student: s['EX-20003'], code: 'F003', days: 30, status: 'active',       cs: 15, ce:-15, desc: '504 student. Controlled substance on campus. Extended removal — 504 meeting documented.' },
    { student: s['EX-30003'], code: 'F004', days:  5, status: 'under_review', cs: -1, ce: -1, desc: '504 accommodation review required before placement can proceed.' },
    { student: s['EX-10001'], code: 'F001', days: 30, status: 'completed',    cs: 60, ce: 30, desc: 'Completed 30-day DAEP placement. Student returned to Explorer High School.' },
    { student: s['EX-10003'], code: 'F002', days: 45, status: 'active',       cs: 40, ce: -5, desc: 'Weapon possession on campus. Mandatory 45-day DAEP placement per TEC §37.007.' },
    { student: s['EX-10005'], code: 'F003', days: 20, status: 'active',       cs: 25, ce:  5, desc: 'Controlled substance on campus. 20-day DAEP consequence assigned.' },
    { student: s['EX-20002'], code: 'F001', days: 10, status: 'active',       cs: 12, ce:  2, desc: 'Physical altercation. 10-day DAEP — placement ends in 2 days. Transition review required.' },
    { student: s['EX-20005'], code: 'F005', days: 15, status: 'under_review', cs: -1, ce: -1, desc: 'Harassment incident. Pending administrator review and parent notification.' },
    { student: s['EX-40002'], code: 'F001', days: 30, status: 'completed',    cs: 55, ce: 25, desc: 'Completed DAEP placement. Second incident this school year — repeat offender alert active.' },
  ].filter(r => r.student)

  const incRows = incidentDefs.map(r => ({
    district_id:      D,
    campus_id:        r.student.campus_id,
    student_id:       r.student.id,
    offense_code_id:  c[r.code],
    incident_date:    daysAgo(r.cs > 0 ? r.cs + 2 : 7),
    description:      r.desc,
    consequence_type: 'daep',
    consequence_days: r.days,
    consequence_start: r.cs > 0 ? daysAgo(r.cs) : null,
    consequence_end:   r.ce > 0 ? daysAgo(r.ce) : (r.ce < 0 ? daysAgo(r.ce) : null),
    status:           r.status,
    reported_by:      adminId,
    notes:            r.desc,
  }))

  const { data: insertedInc, error: incErr } = await sb
    .from('incidents').insert(incRows).select('id, student_id, status, campus_id')
  if (incErr) throw new Error(`Incidents: ${incErr.message}`)

  // ── Patch SPED/504 status back on students ────────────────────────────────
  const spedIds = insertedStudents!
    .filter((x: { student_id_number: string }) => studentMeta[x.student_id_number]?.is_sped)
    .map((x: { id: string }) => x.id)
  const s504Ids = insertedStudents!
    .filter((x: { student_id_number: string }) => studentMeta[x.student_id_number]?.is_504)
    .map((x: { id: string }) => x.id)
  if (spedIds.length)  await sb.from('students').update({ is_sped: true }).in('id', spedIds)
  if (s504Ids.length) await sb.from('students').update({ is_504: true }).in('id', s504Ids)

  // ── Compliance checklists (manual) ────────────────────────────────────────
  const spedIncidents = (insertedInc || [])
    .filter((i: { student_id: string }) => spedIds.includes(i.student_id))
  if (spedIncidents.length) {
    const clRows = spedIncidents.map((inc: { id: string; student_id: string }, idx: number) => ({
      district_id:       D,
      incident_id:       inc.id,
      student_id:        inc.student_id,
      status:            idx === 0 ? 'completed' : 'incomplete',
      placement_blocked: idx !== 0,
      ...(idx === 0 ? {
        parent_notified:             new Date(now.getTime() - 44 * 86400000).toISOString(),
        ard_committee_notified:      new Date(now.getTime() - 43 * 86400000).toISOString(),
        ard_committee_met:           new Date(now.getTime() - 42 * 86400000).toISOString(),
        manifestation_determination: new Date(now.getTime() - 42 * 86400000).toISOString(),
        manifestation_result:        'not_manifestation',
      } : {}),
    }))
    const { error: clErr } = await sb.from('compliance_checklists').insert(clRows)
    if (!clErr) {
      await sb.from('incidents')
        .update({ sped_compliance_required: true, compliance_cleared: false })
        .in('id', spedIncidents.map((i: { id: string }) => i.id))
    }
  }

  // ── Transition plans ──────────────────────────────────────────────────────
  const activeInc = (insertedInc || [])
    .filter((i: { status: string }) => i.status === 'active').slice(0, 3)
  if (activeInc.length) {
    await sb.from('transition_plans').insert(
      activeInc.map((inc: { id: string; student_id: string }, idx: number) => ({
        district_id:      D,
        incident_id:      inc.id,
        student_id:       inc.student_id,
        plan_type:        'daep_entry',
        offense_category: 'fighting',
        start_date:       daysAgo(30 - idx * 8),
        end_date:         daysAgo(-(30 - idx * 8)),
        review_30_date:   daysAgo(30 - idx * 8 - 30),
        review_60_date:   daysAgo(30 - idx * 8 - 60),
        review_90_date:   daysAgo(30 - idx * 8 - 90),
        status:           'active',
        created_by:       adminId,
        notes:            'Maintain grade-level work via campus packets. Practice conflict resolution daily.',
      }))
    )
  }

  // ── Behavior tracking ─────────────────────────────────────────────────────
  const seen = new Set<string>()
  const trackRows = activeInc.flatMap((inc: { student_id: string; campus_id: string }) =>
    Array.from({ length: 10 }, (_, i) => {
      const key = `${inc.student_id}-${daysAgo(i + 1)}`
      if (seen.has(key)) return null
      seen.add(key)
      return {
        district_id:   D,
        campus_id:     inc.campus_id,
        student_id:    inc.student_id,
        tracking_date: daysAgo(i + 1),
        checked_in:    true,
        daily_total:   parseFloat((3 + Math.random() * 2).toFixed(1)),
        daily_goal:    4.0,
        goal_met:      Math.random() > 0.35,
      }
    }).filter(Boolean)
  )
  if (trackRows.length) await sb.from('daily_behavior_tracking').insert(trackRows)

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alertRows = [
    {
      district_id: D, campus_id: HS, student_id: s['EX-10002']?.id,
      alert_level: 'red', trigger_type: 'sped_manifestation_due', status: 'active',
      trigger_description: 'Manifestation determination overdue — Aaliyah Thompson has been in DAEP for 12 days. Federal 10-day ARD deadline has passed.',
    },
    {
      district_id: D, campus_id: HS, student_id: s['EX-40001']?.id,
      alert_level: 'red', trigger_type: 'sped_manifestation_due', status: 'active',
      trigger_description: 'Manifestation determination required — Destiny Washington placed 5 days ago. ARD meeting must occur by Day 10.',
    },
    {
      district_id: D, campus_id: MS, student_id: s['EX-20002']?.id,
      alert_level: 'yellow', trigger_type: 'placement_ending', status: 'active',
      trigger_description: 'DAEP placement ends in 2 days for Carlos Mendoza. Transition plan review required before return to home campus.',
    },
    {
      district_id: D, campus_id: HS, student_id: s['EX-40002']?.id,
      alert_level: 'yellow', trigger_type: 'repeat_offender', status: 'resolved',
      trigger_description: 'Second DAEP placement this school year for Jordan Lee. Consider behavior intervention plan.',
    },
  ].filter(a => a.student_id)
  if (alertRows.length) await sb.from('alerts').insert(alertRows)

  // ── Navigator referrals ───────────────────────────────────────────────────
  const navRows = [
    { district_id: D, campus_id: HS, student_id: s['EX-10001']?.id, reported_by: adminId, referral_date: daysAgo(70), description: 'Chronic tardiness escalating to classroom disruption.',  status: 'closed',   outcome: 'iss' },
    { district_id: D, campus_id: MS, student_id: s['EX-20002']?.id, reported_by: adminId, referral_date: daysAgo(15), description: 'Physical altercation. Out-of-school suspension assigned.', status: 'reviewed', outcome: 'oss' },
    { district_id: D, campus_id: HS, student_id: s['EX-10005']?.id, reported_by: adminId, referral_date: daysAgo(30), description: 'Drug-related behavior. Pending referral to DAEP.',        status: 'pending',  outcome: null  },
  ].filter(r => r.student_id)
  if (navRows.length) await sb.from('navigator_referrals').insert(navRows)

  // ── Meridian SPED students ────────────────────────────────────────────────
  const spedStudents = insertedStudents!
    .filter((x: { id: string }) => spedIds.includes(x.id))
    .slice(0, 4)
  if (spedStudents.length) {
    await sb.from('meridian_students').insert(
      spedStudents.map((x: { id: string; campus_id: string; first_name: string; last_name: string }) => ({
        district_id:        D,
        campus_id:          x.campus_id,
        first_name:         x.first_name,
        last_name:          x.last_name,
        sped_status:        'eligible',
        primary_disability: 'Emotional Disturbance',
        plan_type:          'IEP',
        waypoint_student_id: x.id,
      }))
    )
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
    await wipe(supabase)
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
