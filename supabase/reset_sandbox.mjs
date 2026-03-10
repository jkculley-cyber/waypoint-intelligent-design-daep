// Reset + Reseed Explorer ISD Sandbox
//
// Wipes all transactional data for Explorer ISD and reseeds a rich dataset.
// Does NOT delete district/campuses/admin profile.
//
// REST API only — no DB password required.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=xxx node supabase/reset_sandbox.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const D      = '22222222-2222-2222-2222-222222222222'
const HS     = 'bbbb0001-0001-0001-0001-000000000001'
const MS     = 'bbbb0001-0001-0001-0001-000000000002'
const EL     = 'bbbb0001-0001-0001-0001-000000000003'

const now = new Date()
const daysAgo = (n) => new Date(now - n * 86400000).toISOString().slice(0, 10)

async function getAdminId() {
  const { data, error } = await supabase
    .from('profiles').select('id').eq('district_id', D).eq('role', 'admin').limit(1).single()
  if (error) throw new Error(`Admin lookup: ${error.message}`)
  return data.id
}

// ─── Wipe ────────────────────────────────────────────────────────────────────
async function wipe() {
  console.log('Wiping transactional data...')

  const del = async (table, col = 'district_id') => {
    const { error } = await supabase.from(table).delete().eq(col, D)
    if (error) console.warn(`  Warn deleting ${table}: ${error.message}`)
    else console.log(`  - ${table} cleared`)
  }

  // Get incident IDs to null FK before deleting checklists
  const { data: incRows } = await supabase.from('incidents').select('id').eq('district_id', D)
  const incIds = (incRows || []).map(r => r.id)

  // Transition plan reviews + reentry tables
  const { data: tpRows } = await supabase.from('transition_plans').select('id').eq('district_id', D)
  const tpIds = (tpRows || []).map(r => r.id)
  if (tpIds.length) {
    const { error } = await supabase.from('transition_plan_reviews').delete().in('plan_id', tpIds)
    if (error) console.warn(`  Warn transition_plan_reviews: ${error.message}`)
    else console.log('  - transition_plan_reviews cleared')
    const { error: ciErr } = await supabase.from('reentry_checkins').delete().in('plan_id', tpIds)
    if (ciErr) console.warn(`  Warn reentry_checkins: ${ciErr.message}`)
    else console.log('  - reentry_checkins cleared')
    const { error: clErr } = await supabase.from('reentry_checklists').delete().in('plan_id', tpIds)
    if (clErr) console.warn(`  Warn reentry_checklists: ${clErr.message}`)
    else console.log('  - reentry_checklists cleared')
  }

  await del('transition_plans')
  await del('alerts')
  await del('daily_behavior_tracking')

  if (incIds.length) {
    await supabase.from('incidents').update({ compliance_checklist_id: null }).in('id', incIds)
    const { error } = await supabase.from('incident_separations').delete().in('incident_id', incIds)
    if (error) console.warn(`  Warn incident_separations: ${error.message}`)
    else console.log('  - incident_separations cleared')
  }

  await del('compliance_checklists')
  await del('incidents')
  await del('offense_codes')   // wipe sandbox offense codes too (reseed each time)
  await del('students')

  for (const t of ['navigator_supports', 'navigator_placements', 'navigator_referrals']) {
    await del(t)
  }
  for (const t of ['meridian_cap_findings', 'meridian_students']) {
    const { error } = await supabase.from(t).delete().eq('district_id', D)
    if (error) console.warn(`  Warn ${t}: ${error.message}`)
    else console.log(`  - ${t} cleared`)
  }

  console.log('Wipe complete.\n')
}

// ─── Reseed ──────────────────────────────────────────────────────────────────
async function reseed(adminId) {
  console.log('Reseeding Explorer ISD...')

  // ── Offense codes ────────────────────────────────────────────────────────
  console.log('\nSeeding offense codes...')
  const { data: insertedCodes, error: codeErr } = await supabase
    .from('offense_codes')
    .insert([
      { district_id: D, code: 'F001', category: 'violence',   title: 'Physical Altercation / Fighting',       severity: 'serious',  is_mandatory_daep: false, is_discretionary_daep: true  },
      { district_id: D, code: 'F002', category: 'weapons',    title: 'Weapon Possession on Campus',            severity: 'severe',   is_mandatory_daep: true,  is_discretionary_daep: false },
      { district_id: D, code: 'F003', category: 'drugs',      title: 'Controlled Substance / Drug Use',        severity: 'severe',   is_mandatory_daep: true,  is_discretionary_daep: false },
      { district_id: D, code: 'F004', category: 'conduct',    title: 'Insubordination / Persistent Defiance',  severity: 'moderate', is_mandatory_daep: false, is_discretionary_daep: true  },
      { district_id: D, code: 'F005', category: 'harassment', title: 'Harassment / Bullying',                  severity: 'serious',  is_mandatory_daep: false, is_discretionary_daep: true  },
    ])
    .select('id, code')
  if (codeErr) throw new Error(`Offense codes: ${codeErr.message}`)
  const c = {}
  insertedCodes.forEach(x => { c[x.code] = x.id })
  console.log(`  + ${insertedCodes.length} offense codes seeded`)

  // ── Students ─────────────────────────────────────────────────────────────
  // NOTE: Insert ALL students with is_sped=false, is_504=false first.
  // The trg_check_sped_compliance trigger fires on DAEP incidents and reads
  // student.is_sped at INSERT time. Since it's a BEFORE trigger, it inserts
  // into compliance_checklists with incident_id=NEW.id BEFORE the incident
  // row exists → FK violation. Workaround: insert students as non-SPED,
  // insert incidents (trigger skips checklist), then patch students + create
  // checklists manually.
  console.log('\nInserting students (as non-SPED to avoid trigger conflict)...')

  // Track the intended SPED/504 status separately
  const studentMeta = {
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

  const { data: insertedStudents, error: stuErr } = await supabase
    .from('students')
    .insert([
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
    ])
    .select('id, student_id_number, campus_id')
  if (stuErr) throw new Error(`Students: ${stuErr.message}`)
  console.log(`  + ${insertedStudents.length} students inserted`)

  const s = {}  // student_id_number → student row (with intended meta)
  insertedStudents.forEach(x => {
    s[x.student_id_number] = { ...x, ...studentMeta[x.student_id_number] }
  })

  // ── Incidents ─────────────────────────────────────────────────────────────
  console.log('\nInserting incidents...')
  const incidentRows = [
    // SPED — auto-triggers compliance checklist
    { student: s['EX-10002'], code: 'F001', days: 30, status: 'active',    cs: 45, ce: 15, sped: true,  desc: 'Physical altercation in hallway. SPED student — manifestation determination required within 10 school days of placement.' },
    { student: s['EX-20001'], code: 'F004', days: 15, status: 'active',    cs: 20, ce:  5, sped: true,  desc: 'Repeated defiance of campus authority. IEP team meeting required. ARD must occur by Day 10.' },
    { student: s['EX-40001'], code: 'F005', days: 20, status: 'under_review', cs: -1, ce: -1, sped: true,  desc: 'Peer harassment incident. Manifestation review pending — ARD within 10 school days of placement.' },
    { student: s['EX-20004'], code: 'F001', days: 10, status: 'under_review', cs: -1, ce: -1, sped: true,  desc: 'Physical altercation. SPED student — compliance checklist auto-generated by Waypoint.' },
    // 504
    { student: s['EX-10004'], code: 'F004', days: 10, status: 'active',    cs: 30, ce: 20, sped: false, desc: '504 student. Insubordination. Manifestation determination held — no causal relationship found.' },
    { student: s['EX-20003'], code: 'F003', days: 30, status: 'active',    cs: 15, ce:-15, sped: false, desc: '504 student. Controlled substance on campus. Extended removal — 504 meeting documented.' },
    { student: s['EX-30003'], code: 'F004', days:  5, status: 'under_review', cs: -1, ce: -1, sped: false, desc: '504 accommodation review required before placement can proceed.' },
    // General ed
    { student: s['EX-10001'], code: 'F001', days: 30, status: 'completed', cs: 60, ce: 30, sped: false, desc: 'Completed 30-day DAEP placement. Student returned to Explorer High School.' },
    { student: s['EX-10003'], code: 'F002', days: 45, status: 'active',    cs: 40, ce: -5, sped: false, desc: 'Weapon possession on campus. Mandatory 45-day DAEP placement per TEC §37.007.' },
    { student: s['EX-10005'], code: 'F003', days: 20, status: 'active',    cs: 25, ce:  5, sped: false, desc: 'Controlled substance on campus. 20-day DAEP consequence assigned.' },
    { student: s['EX-20002'], code: 'F001', days: 10, status: 'active',    cs: 12, ce:  2, sped: false, desc: 'Physical altercation. 10-day DAEP — placement ends in 2 days. Transition review required.' },
    { student: s['EX-20005'], code: 'F005', days: 15, status: 'under_review', cs: -1, ce: -1, sped: false, desc: 'Harassment incident. Pending administrator review and parent notification.' },
    { student: s['EX-40002'], code: 'F001', days: 30, status: 'completed', cs: 55, ce: 25, sped: false, desc: 'Completed DAEP placement. Second incident this school year — repeat offender alert active.' },
  ].filter(r => r.student).map(r => ({
    district_id:             D,
    campus_id:               r.student.campus_id,
    student_id:              r.student.id,
    offense_code_id:         c[r.code],
    incident_date:           daysAgo(r.cs > 0 ? r.cs + 2 : 7),
    description:             r.desc,
    consequence_type:        'daep',
    consequence_days:        r.days,
    consequence_start:       r.cs > 0 ? daysAgo(r.cs) : null,
    consequence_end:         r.ce > 0 ? daysAgo(r.ce) : (r.ce < 0 ? daysAgo(r.ce) : null),
    status:                  r.status,
    reported_by:             adminId,
    notes:                   r.desc,
  }))

  const { data: insertedInc, error: incErr } = await supabase
    .from('incidents').insert(incidentRows).select('id, student_id, status, campus_id')
  if (incErr) throw new Error(`Incidents: ${incErr.message}`)
  console.log(`  + ${insertedInc.length} incidents inserted`)

  // ── Patch students back to correct SPED/504 status ────────────────────────
  // Now that incidents are inserted (trigger already ran with is_sped=false),
  // restore actual SPED/504 status on each student.
  console.log('\nPatching student SPED/504 status...')
  const spedPatch  = insertedStudents.filter(x => studentMeta[x.student_id_number]?.is_sped).map(x => x.id)
  const s504Patch  = insertedStudents.filter(x => studentMeta[x.student_id_number]?.is_504).map(x => x.id)
  if (spedPatch.length) {
    const { error } = await supabase.from('students').update({ is_sped: true }).in('id', spedPatch)
    if (error) console.warn(`  Warn patching is_sped: ${error.message}`)
    else console.log(`  + is_sped=true patched on ${spedPatch.length} students`)
  }
  if (s504Patch.length) {
    const { error } = await supabase.from('students').update({ is_504: true }).in('id', s504Patch)
    if (error) console.warn(`  Warn patching is_504: ${error.message}`)
    else console.log(`  + is_504=true patched on ${s504Patch.length} students`)
  }

  // ── Create compliance checklists for SPED incidents ───────────────────────
  // Manual creation (triggers already bypassed above)
  console.log('\nCreating SPED compliance checklists...')
  const spedStudentIds = spedPatch
  const spedIncidents  = insertedInc.filter(i => spedStudentIds.includes(i.student_id))

  if (spedIncidents.length) {
    const clRows = spedIncidents.map((inc, idx) => ({
      district_id:      D,
      incident_id:      inc.id,
      student_id:       inc.student_id,
      status:           idx === 0 ? 'completed' : 'incomplete',
      placement_blocked: idx === 0 ? false : true,
      // First checklist — manifestation complete
      ...(idx === 0 ? {
        parent_notified:             new Date(now - 44 * 86400000).toISOString(),
        ard_committee_notified:      new Date(now - 43 * 86400000).toISOString(),
        ard_committee_met:           new Date(now - 42 * 86400000).toISOString(),
        manifestation_determination: new Date(now - 42 * 86400000).toISOString(),
        manifestation_result:        'not_manifestation',
      } : {}),
    }))
    const { data: cls, error: clErr } = await supabase
      .from('compliance_checklists').insert(clRows).select('id')
    if (clErr) console.warn(`  Warn compliance checklists: ${clErr.message}`)
    else {
      console.log(`  + ${cls.length} compliance checklists created`)
      // Backfill sped_compliance_required on incidents
      await supabase.from('incidents')
        .update({ sped_compliance_required: true, compliance_cleared: false })
        .in('id', spedIncidents.map(i => i.id))
    }
  }

  // ── Transition plans ──────────────────────────────────────────────────────
  console.log('\nInserting transition plans...')
  const activeInc = insertedInc.filter(i => i.status === 'active').slice(0, 3)
  if (activeInc.length) {
    const { data: tps, error: tpErr } = await supabase.from('transition_plans').insert(
      activeInc.map((inc, idx) => ({
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
    ).select('id')
    if (tpErr) console.warn(`  Warn transition plans: ${tpErr.message}`)
    else console.log(`  + ${tps.length} transition plans inserted`)
  }

  // ── Daily behavior tracking ───────────────────────────────────────────────
  console.log('\nInserting behavior tracking...')
  const seen = new Set()
  const trackRows = insertedInc.filter(i => i.status === 'active').slice(0, 4).flatMap(inc =>
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
  const { error: trackErr } = await supabase.from('daily_behavior_tracking').insert(trackRows)
  if (trackErr) console.warn(`  Warn behavior tracking: ${trackErr.message}`)
  else console.log(`  + ${trackRows.length} tracking records inserted`)

  // ── Alerts ────────────────────────────────────────────────────────────────
  console.log('\nInserting alerts...')
  const alertRows = [
    {
      district_id:         D,
      campus_id:           HS,
      student_id:          s['EX-10002']?.id,
      alert_level:         'red',
      trigger_type:        'sped_manifestation_due',
      trigger_description: 'Manifestation determination overdue — Aaliyah Thompson has been in DAEP for 12 days. Federal 10-day ARD deadline has passed.',
      status:              'active',
    },
    {
      district_id:         D,
      campus_id:           HS,
      student_id:          s['EX-40001']?.id,
      alert_level:         'red',
      trigger_type:        'sped_manifestation_due',
      trigger_description: 'Manifestation determination required — Destiny Washington placed 5 days ago. ARD meeting must occur by Day 10.',
      status:              'active',
    },
    {
      district_id:         D,
      campus_id:           MS,
      student_id:          s['EX-20002']?.id,
      alert_level:         'yellow',
      trigger_type:        'placement_ending',
      trigger_description: 'DAEP placement ends in 2 days for Carlos Mendoza. Transition plan review required before return to home campus.',
      status:              'active',
    },
    {
      district_id:         D,
      campus_id:           HS,
      student_id:          s['EX-40002']?.id,
      alert_level:         'yellow',
      trigger_type:        'repeat_offender',
      trigger_description: 'Second DAEP placement this school year for Jordan Lee. Consider behavior intervention plan.',
      status:              'resolved',
    },
  ].filter(a => a.student_id)

  const { error: alertErr } = await supabase.from('alerts').insert(alertRows)
  if (alertErr) console.warn(`  Warn alerts: ${alertErr.message}`)
  else console.log(`  + ${alertRows.length} alerts inserted`)

  // ── Navigator referrals ───────────────────────────────────────────────────
  console.log('\nInserting Navigator referrals...')
  const navRows = [
    { district_id: D, campus_id: HS, student_id: s['EX-10001']?.id, reported_by: adminId, referral_date: daysAgo(70), description: 'Chronic tardiness escalating to classroom disruption.',   status: 'closed',   outcome: 'iss' },
    { district_id: D, campus_id: MS, student_id: s['EX-20002']?.id, reported_by: adminId, referral_date: daysAgo(15), description: 'Physical altercation. Out-of-school suspension assigned.',  status: 'reviewed', outcome: 'oss' },
    { district_id: D, campus_id: HS, student_id: s['EX-10005']?.id, reported_by: adminId, referral_date: daysAgo(30), description: 'Drug-related behavior. Pending referral to DAEP.',         status: 'pending',  outcome: null },
  ].filter(r => r.student_id)

  if (navRows.length) {
    const { error: navErr } = await supabase.from('navigator_referrals').insert(navRows)
    if (navErr) console.warn(`  Warn navigator referrals: ${navErr.message}`)
    else console.log(`  + ${navRows.length} navigator referrals inserted`)
  }

  // ── Meridian SPED students ────────────────────────────────────────────────
  console.log('\nInserting Meridian students...')
  const spedStudents = insertedStudents.filter(x => spedPatch.includes(x.id)).slice(0, 4)
  // Fetch full student rows to get names for meridian_students
  const { data: spedFull } = await supabase
    .from('students').select('id, first_name, last_name, campus_id').in('id', spedPatch.slice(0, 4))
  const { data: ms, error: msErr } = await supabase
    .from('meridian_students')
    .insert((spedFull || spedStudents).map(x => ({
      district_id:         D,
      campus_id:           x.campus_id,
      first_name:          x.first_name || 'Explorer',
      last_name:           x.last_name  || 'Student',
      sped_status:         'eligible',
      primary_disability:  'Emotional Disturbance',
      plan_type:           'IEP',
      waypoint_student_id: x.id,
    })))
    .select('id')
  if (msErr) console.warn(`  Warn meridian_students: ${msErr.message}`)
  else console.log(`  + ${ms.length} meridian students inserted`)

  // ── Re-entry checklists + check-ins ─────────────────────────────────────
  console.log('\nInserting re-entry data...')

  // Find the daep_entry plans we created (first 3 active incidents)
  const { data: sandboxPlans } = await supabase
    .from('transition_plans').select('id, student_id, end_date')
    .eq('district_id', D).eq('status', 'active').order('end_date', { ascending: true })

  if (sandboxPlans && sandboxPlans.length >= 2) {
    // Plan 0: returning soon — partial checklist (4/7)
    const planA = sandboxPlans[0]
    await supabase.from('reentry_checklists').insert({
      plan_id:                    planA.id,
      district_id:                D,
      student_goals_met:          true,
      student_commitment_signed:  true,
      student_completed_at:       new Date(Date.now() - 4 * 86400000).toISOString(),
      parent_plan_acknowledged:   true,
      parent_contact_confirmed:   true,
      parent_completed_at:        new Date(Date.now() - 3 * 86400000).toISOString(),
      counselor_schedule_set:     true,
      counselor_teachers_briefed: false,
      admin_schedule_confirmed:   false,
      return_date:                daysAgo(-3),
      updated_at:                 new Date().toISOString(),
    })
    console.log('  + Partial checklist (4/7) for plan A')

    // Plan 1: already returned — full checklist + check-ins
    const planB = sandboxPlans[1]
    await supabase.from('reentry_checklists').insert({
      plan_id:                    planB.id,
      district_id:                D,
      student_goals_met:          true,
      student_commitment_signed:  true,
      student_completed_at:       new Date(Date.now() - 18 * 86400000).toISOString(),
      parent_plan_acknowledged:   true,
      parent_contact_confirmed:   true,
      parent_completed_at:        new Date(Date.now() - 17 * 86400000).toISOString(),
      counselor_schedule_set:     true,
      counselor_teachers_briefed: true,
      counselor_completed_at:     new Date(Date.now() - 16 * 86400000).toISOString(),
      admin_schedule_confirmed:   true,
      admin_completed_at:         new Date(Date.now() - 16 * 86400000).toISOString(),
      brief_sent_at:              new Date(Date.now() - 16 * 86400000).toISOString(),
      brief_sent_by:              adminId,
      return_date:                daysAgo(14),
      updated_at:                 new Date().toISOString(),
    })

    const checkins = [
      { days: 14, status: 'neutral',    notes: 'First day back. Schedule adjusted, no incidents.' },
      { days: 11, status: 'positive',   notes: 'Strong participation in all classes. Teachers report good attitude.' },
      { days:  8, status: 'concerning', notes: 'Tardy twice, minor tension with peer in hallway. Counselor notified.' },
      { days:  5, status: 'neutral',    notes: 'Tardy issue resolved. Peer conflict de-escalated.' },
      { days:  2, status: 'positive',   notes: 'Excellent week. Student met with counselor, positive self-report.' },
    ]
    await supabase.from('reentry_checkins').insert(
      checkins.map(c => ({
        plan_id:      planB.id,
        student_id:   planB.student_id,
        district_id:  D,
        counselor_id: adminId,
        checkin_date: daysAgo(c.days),
        status:       c.status,
        notes:        c.notes,
      }))
    )
    console.log('  + Full checklist + 5 check-ins for plan B')
  }

  console.log('\n✅ Explorer ISD sandbox reseeded successfully!')
  console.log(`   Students:  ${insertedStudents.length}`)
  console.log(`   Incidents: ${insertedInc.length}`)
  console.log(`   Seeded at: ${new Date().toISOString()}`)
}

async function run() {
  const adminId = await getAdminId()
  console.log(`Admin ID: ${adminId}`)
  await wipe()
  await reseed(adminId)
}

run().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
