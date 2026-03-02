// Seed Navigator demo data for Lone Star ISD
// Creates realistic referrals, ISS/OSS placements, and proactive supports
// across existing Lone Star ISD students — showcasing all Navigator Intelligence pages.
//
// Prerequisites:
//   - Migrations 001–050 applied
//   - run_seed.mjs already executed (students, district, campuses exist)
//   - seed_approval_flow.mjs already executed (staff profiles exist)
//   - Navigator must already be enabled OR this script enables it
//
// Usage:
//   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
//   node supabase/seed_navigator.mjs
//
// Uses Supabase REST API (no DB password needed).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  console.error('Set it: $env:SUPABASE_SERVICE_ROLE_KEY="your-key"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DISTRICT_ID = '11111111-1111-1111-1111-111111111111'
const HS  = 'aaaa0001-0001-0001-0001-000000000001'
const MS  = 'aaaa0001-0001-0001-0001-000000000002'
const EL  = 'aaaa0001-0001-0001-0001-000000000003'

// Date helpers (relative to today)
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

async function run() {
  console.log('Connecting to Supabase REST API...\n')

  // ─── 0. Enable Navigator for Lone Star ISD ──────────────────────────────────
  console.log('Enabling Navigator for Lone Star ISD...')
  const { data: [distRow], error: distErr } = await supabase
    .from('districts').select('settings').eq('id', DISTRICT_ID).limit(1)
  if (distErr) throw distErr
  const products = distRow.settings?.products || ['waypoint']
  if (!products.includes('navigator')) products.push('navigator')
  const { error: updErr } = await supabase
    .from('districts')
    .update({ settings: { ...distRow.settings, products } })
    .eq('id', DISTRICT_ID)
  if (updErr) throw updErr
  console.log(`  ✓ Products now: ${products.join(', ')}\n`)

  // ─── 1. Look up student IDs ──────────────────────────────────────────────────
  console.log('Looking up student IDs...')
  const studentNums = ['LS-10001','LS-10002','LS-10003','LS-10004','LS-10005',
                       'LS-10006','LS-10007','LS-20001','LS-20002','LS-20003',
                       'LS-20004','LS-20005','LS-20006']
  const { data: studentRows, error: sErr } = await supabase
    .from('students')
    .select('id, student_id_number, first_name, last_name, campus_id')
    .eq('district_id', DISTRICT_ID)
    .in('student_id_number', studentNums)
  if (sErr) throw sErr

  const S = {}
  for (const s of studentRows) S[s.student_id_number] = s
  console.log(`  ✓ Found ${studentRows.length} students\n`)

  // ─── 2. Look up staff profile IDs ────────────────────────────────────────────
  console.log('Looking up staff profiles...')
  const { data: profileRows, error: pErr } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('district_id', DISTRICT_ID)
  if (pErr) throw pErr

  const profileByRole = {}
  for (const p of profileRows) {
    if (!profileByRole[p.role]) profileByRole[p.role] = p
  }
  const ADMIN   = profileByRole['admin']?.id
  const COUNSELOR = profileByRole['counselor']?.id || ADMIN
  const AP      = profileByRole['ap']?.id || ADMIN
  const TEACHER = profileByRole['teacher']?.id || ADMIN

  if (!ADMIN) { console.error('No admin profile found for district'); process.exit(1) }
  console.log(`  ✓ Admin: ${ADMIN}`)
  console.log(`  ✓ Counselor: ${COUNSELOR}`)
  console.log(`  ✓ AP: ${AP}\n`)

  // ─── 3. Clean previous Navigator seed data ───────────────────────────────────
  console.log('Cleaning previous Navigator seed data...')
  await supabase.from('navigator_campus_goals').delete().eq('district_id', DISTRICT_ID)
  await supabase.from('navigator_supports').delete().eq('district_id', DISTRICT_ID)
  await supabase.from('navigator_placements').delete().eq('district_id', DISTRICT_ID)
  await supabase.from('navigator_referrals').delete().eq('district_id', DISTRICT_ID)
  console.log('  ✓ Cleaned\n')

  // ─── 4. Referrals ────────────────────────────────────────────────────────────
  console.log('Creating referrals...')

  const insertRef = async (r) => {
    const { data: [row], error } = await supabase
      .from('navigator_referrals')
      .insert(r)
      .select('id')
    if (error) throw new Error(`Referral insert failed: ${error.message} (student: ${r.student_id})`)
    return row.id
  }

  const referralIds = {}

  // ── Marcus Johnson (LS-10001) — HIGH RISK: 3 referrals in 14 days ──
  referralIds.marcus1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10001'].id, reported_by: TEACHER,
    referral_date: daysAgo(12),
    location: 'Hallway', description: 'Verbal altercation with another student; refused to move to class when directed by staff.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: new Date(Date.now() - 11*86400000).toISOString(),
    outcome: 'oss',
    skill_gap: 'impulse_control',
    skill_gap_notes: 'Student acts before thinking in peer conflict situations. Needs structured strategies for pausing and de-escalating.',
  })
  referralIds.marcus2 = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10001'].id, reported_by: TEACHER,
    referral_date: daysAgo(7),
    location: 'Classroom', description: 'Disruptive behavior during 3rd period — threw materials, made verbal threats toward classmate.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: new Date(Date.now() - 6*86400000).toISOString(),
    outcome: 'conference',
    skill_gap: 'impulse_control',
  })
  referralIds.marcus3 = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10001'].id, reported_by: COUNSELOR,
    referral_date: daysAgo(3),
    location: 'Cafeteria', description: 'Physical altercation during lunch — third behavioral incident this month.',
    status: 'pending',
    skill_gap: 'emotional_regulation',
  })
  console.log('  ✓ Marcus Johnson — 3 referrals (12d, 7d, 3d) → HIGH RISK')

  // ── DeShawn Jackson (LS-20006) — HIGH RISK: OSS + prior escalation ──
  referralIds.deshawn1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20006'].id, reported_by: TEACHER,
    referral_date: daysAgo(25),
    location: 'Classroom', description: 'Repeated classroom disruptions — refused all redirection, escalated to verbal confrontation with teacher.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: new Date(Date.now() - 24*86400000).toISOString(),
    outcome: 'oss',
    skill_gap: 'adult_communication',
    skill_gap_notes: 'Lacks respectful communication strategies when frustrated with authority figures. Frequent escalation to verbal confrontation.',
  })
  referralIds.deshawn2 = await insertRef({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20006'].id, reported_by: COUNSELOR,
    referral_date: daysAgo(8),
    location: 'Hallway', description: 'Aggressive behavior toward peer during passing period. Second incident in 30 days.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: new Date(Date.now() - 7*86400000).toISOString(),
    outcome: 'escalated_to_daep',
    skill_gap: 'impulse_control',
  })
  console.log('  ✓ DeShawn Jackson — 2 referrals, OSS + DAEP escalation → HIGH RISK')

  // ── Jayden Smith (LS-10007) — HIGH RISK: referral + prior DAEP ──
  referralIds.jayden1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10007'].id, reported_by: TEACHER,
    referral_date: daysAgo(10),
    location: 'Classroom', description: 'Found with vaping device during 2nd period. First incident this year.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: new Date(Date.now() - 9*86400000).toISOString(),
    outcome: 'support_assigned',
    skill_gap: 'adult_communication',
    skill_gap_notes: 'Student minimizes impact of behavior on others. Counseling referral to address decision-making and communication with adults.',
  })
  referralIds.jayden_prior = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10007'].id, reported_by: AP,
    referral_date: daysAgo(65),
    location: 'Parking Lot', description: 'Prior semester — on-campus possession. Outcome: DAEP placement.',
    status: 'closed', reviewed_by: AP, reviewed_at: new Date(Date.now() - 64*86400000).toISOString(),
    outcome: 'escalated_to_daep',
    skill_gap: 'adult_communication',
  })
  console.log('  ✓ Jayden Smith — current referral + prior DAEP escalation → HIGH RISK')

  // ── David Nguyen (LS-10005) — MEDIUM RISK: 2 referrals + ISS ──
  referralIds.david1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10005'].id, reported_by: TEACHER,
    referral_date: daysAgo(20),
    location: 'Classroom', description: 'Phone use after multiple redirections; argumentative when asked to put it away.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: new Date(Date.now() - 19*86400000).toISOString(),
    outcome: 'iss',
    skill_gap: 'executive_functioning',
    skill_gap_notes: 'Difficulty managing device use and following multi-step redirection. Benefits from structured routines.',
  })
  referralIds.david2 = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10005'].id, reported_by: TEACHER,
    referral_date: daysAgo(6),
    location: 'Commons', description: 'Left class without permission, found in commons area. Second referral this month.',
    status: 'pending',
    skill_gap: 'executive_functioning',
  })
  console.log('  ✓ David Nguyen — 2 referrals, ISS → MEDIUM RISK')

  // ── Tyler Williams (LS-10003) — MEDIUM: referral + ISS ──
  referralIds.tyler1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10003'].id, reported_by: COUNSELOR,
    referral_date: daysAgo(18),
    location: 'Classroom', description: 'Emotional outburst during standardized testing — walked out of room, upset materials.',
    status: 'reviewed', reviewed_by: COUNSELOR, reviewed_at: new Date(Date.now() - 17*86400000).toISOString(),
    outcome: 'support_assigned',
    admin_notes: 'IEP meeting recommended. SPED coordinator notified.',
    skill_gap: 'emotional_regulation',
    skill_gap_notes: 'IEP-identified emotional regulation deficit. Counselor working on coping strategies for performance anxiety.',
  })
  console.log('  ✓ Tyler Williams (SPED/ED) — 1 referral, support assigned → MEDIUM RISK')

  // ── Aaliyah Brown (LS-10004) — MEDIUM: ISS placement ──
  referralIds.aaliyah1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10004'].id, reported_by: TEACHER,
    referral_date: daysAgo(15),
    location: 'Library', description: 'Confrontation with peer in library — raised voice and threw book.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: new Date(Date.now() - 14*86400000).toISOString(),
    outcome: 'iss',
    skill_gap: 'peer_conflict_resolution',
    skill_gap_notes: 'Escalates quickly in peer conflict. Needs structured mediation strategies and de-escalation skills.',
  })
  console.log('  ✓ Aaliyah Brown — 1 referral, ISS → MEDIUM RISK')

  // ── Carlos Hernandez (LS-20004) — LOW: single closed referral ──
  referralIds.carlos1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20004'].id, reported_by: TEACHER,
    referral_date: daysAgo(40),
    location: 'Classroom', description: 'Excessive talking and off-task behavior during independent work.',
    status: 'closed', reviewed_by: COUNSELOR, reviewed_at: new Date(Date.now() - 39*86400000).toISOString(),
    outcome: 'conference',
    skill_gap: 'executive_functioning',
  })
  console.log('  ✓ Carlos Hernandez — 1 referral (40d ago, closed) → LOW / resolved')

  // ── Isabella Rodriguez (LS-20001) — LOW: 1 referral, support helping ──
  referralIds.isabella1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20001'].id, reported_by: TEACHER,
    referral_date: daysAgo(30),
    location: 'Classroom', description: 'Repeated difficulty managing frustration when assigned challenging work — emotional dysregulation.',
    status: 'reviewed', reviewed_by: COUNSELOR, reviewed_at: new Date(Date.now() - 29*86400000).toISOString(),
    outcome: 'support_assigned',
    skill_gap: 'academic_frustration_tolerance',
    skill_gap_notes: 'Struggles with challenging academic tasks — frustration leads to emotional dysregulation and task avoidance.',
  })
  console.log('  ✓ Isabella Rodriguez — 1 referral, counseling support → LOW RISK\n')

  // ─── 5. Placements (current school year) ─────────────────────────────────────
  console.log('Creating ISS/OSS placements (current year)...')

  const insertPlacement = async (p) => {
    const { error } = await supabase.from('navigator_placements').insert(p)
    if (error) throw new Error(`Placement insert failed: ${error.message}`)
  }

  // Marcus — OSS 3 days (completed)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10001'].id, referral_id: referralIds.marcus1,
    placement_type: 'oss', start_date: daysAgo(11), end_date: daysAgo(9), days: 3,
    assigned_by: AP, reason: 'Verbal altercation / refusal to comply',
    reentry_plan: 'Parent conference completed. Behavior contract in progress.',
    parent_notified: true, parent_notified_at: new Date(Date.now() - 11*86400000).toISOString(),
    parent_notified_by: AP,
  })
  console.log('  ✓ Marcus — OSS 3 days (completed)')

  // DeShawn — OSS 5 days (completed)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20006'].id, referral_id: referralIds.deshawn1,
    placement_type: 'oss', start_date: daysAgo(24), end_date: daysAgo(20), days: 5,
    assigned_by: AP, reason: 'Severe classroom disruption, verbal confrontation with teacher',
    reentry_plan: 'SPED coordinator meeting required on return.',
    parent_notified: true, parent_notified_at: new Date(Date.now() - 24*86400000).toISOString(),
    parent_notified_by: AP,
  })
  console.log('  ✓ DeShawn — OSS 5 days (completed)')

  // David — ISS 2 days (completed)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10005'].id, referral_id: referralIds.david1,
    placement_type: 'iss', start_date: daysAgo(18), end_date: daysAgo(17), days: 2,
    assigned_by: AP, reason: 'Phone policy violation after repeated redirections',
    parent_notified: true, parent_notified_at: new Date(Date.now() - 18*86400000).toISOString(),
    parent_notified_by: AP,
  })
  console.log('  ✓ David — ISS 2 days (completed)')

  // Tyler — ISS 1 day (completed)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10003'].id, referral_id: referralIds.tyler1,
    placement_type: 'iss', start_date: daysAgo(17), end_date: daysAgo(17), days: 1,
    assigned_by: AP, reason: 'Emotional dysregulation; removal to allow de-escalation',
    reentry_plan: 'Check-in with counselor before returning to class.',
    parent_notified: true, parent_notified_at: new Date(Date.now() - 17*86400000).toISOString(),
    parent_notified_by: COUNSELOR,
  })
  console.log('  ✓ Tyler — ISS 1 day (completed)')

  // Aaliyah — ISS 2 days (completed)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10004'].id, referral_id: referralIds.aaliyah1,
    placement_type: 'iss', start_date: daysAgo(13), end_date: daysAgo(12), days: 2,
    assigned_by: AP, reason: 'Peer confrontation — ISS for cooling off period',
    parent_notified: true, parent_notified_at: new Date(Date.now() - 14*86400000).toISOString(),
    parent_notified_by: AP,
  })
  console.log('  ✓ Aaliyah — ISS 2 days (completed)')

  // Jayden — OSS 3 days (completed)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10007'].id, referral_id: referralIds.jayden1,
    placement_type: 'oss', start_date: daysAgo(9), end_date: daysAgo(7), days: 3,
    assigned_by: AP, reason: 'Vaping device possession — 3-day OSS per code of conduct',
    reentry_plan: 'Substance abuse counseling referral required.',
    parent_notified: true, parent_notified_at: new Date(Date.now() - 9*86400000).toISOString(),
    parent_notified_by: AP,
  })
  console.log('  ✓ Jayden — OSS 3 days (completed)')

  // Marcus — ACTIVE OSS (started today, no end date yet — pending)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10001'].id, referral_id: referralIds.marcus3,
    placement_type: 'oss', start_date: daysAgo(1), end_date: null, days: 3,
    assigned_by: AP, reason: 'Third physical altercation this month — 3-day OSS assigned',
    reentry_plan: 'Behavior contract review + parent conference on return.',
    parent_notified: true, parent_notified_at: new Date(Date.now() - 1*86400000).toISOString(),
    parent_notified_by: AP,
  })
  console.log('  ✓ Marcus — OSS 3 days (ACTIVE — no end date)')

  // DeShawn — ACTIVE ISS (started today)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20006'].id, referral_id: referralIds.deshawn2,
    placement_type: 'iss', start_date: daysAgo(0), end_date: null, days: 2,
    assigned_by: AP, reason: 'Aggressive behavior — ISS while DAEP referral is reviewed',
    reentry_plan: 'DAEP review meeting required before return to class.',
    parent_notified: true, parent_notified_at: new Date().toISOString(),
    parent_notified_by: AP,
  })
  console.log('  ✓ DeShawn — ISS 2 days (ACTIVE — no end date)\n')

  // ─── 6. Supports ─────────────────────────────────────────────────────────────
  console.log('Creating proactive supports...')

  const insertSupport = async (s) => {
    const { error } = await supabase.from('navigator_supports').insert(s)
    if (error) throw new Error(`Support insert failed: ${error.message}`)
  }

  // Marcus — CICO (active) — 3 referrals = clearly needs support
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10001'].id, support_type: 'cico',
    assigned_by: COUNSELOR, assigned_to: COUNSELOR,
    start_date: daysAgo(5), status: 'active',
    notes: 'Morning and afternoon check-ins with counselor. Goal: reduce reactive behaviors before 2nd incident review.',
  })
  console.log('  ✓ Marcus — CICO (active, started 5d ago)')

  // Tyler — Behavior Contract (active) — SPED student, emotional regulation
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10003'].id, support_type: 'behavior_contract',
    assigned_by: COUNSELOR, assigned_to: TEACHER,
    start_date: daysAgo(14), status: 'active',
    notes: 'Behavior contract addressing test/performance anxiety triggers. Aligned with IEP goals. Weekly review with case manager.',
  })
  console.log('  ✓ Tyler — Behavior Contract (active, SPED-aligned)')

  // Isabella — Counseling (completed — with effectiveness data)
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20001'].id, support_type: 'counseling_referral',
    assigned_by: COUNSELOR, assigned_to: COUNSELOR,
    start_date: daysAgo(28), end_date: daysAgo(5), status: 'completed',
    notes: 'Weekly counseling sessions for frustration tolerance. Significant improvement observed — no referrals in 30 days post-intervention.',
    incidents_before: 5,
    incidents_after: 1,
    outcome_notes: 'Significant improvement. Student developed coping strategies for academic frustration. No new referrals in final 3 weeks of support.',
  })
  console.log('  ✓ Isabella — Counseling (completed, 5→1 incidents)')

  // Carlos — Parent Contact (completed — with effectiveness data)
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20004'].id, support_type: 'parent_contact',
    assigned_by: TEACHER, assigned_to: TEACHER,
    start_date: daysAgo(38), end_date: daysAgo(35), status: 'completed',
    notes: 'Phone conference with parent regarding classroom behavior. Parent agreed to behavior monitoring at home. No further issues since.',
    incidents_before: 3,
    incidents_after: 1,
    outcome_notes: 'Parent engagement effective. Classroom behavior improved. Parent reports consistent home follow-through.',
  })
  console.log('  ✓ Carlos — Parent Contact (completed, 3→1 incidents)')

  // DeShawn — Mentoring (active) — SPED student, OHI
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: MS,
    student_id: S['LS-20006'].id, support_type: 'mentoring',
    assigned_by: COUNSELOR, assigned_to: COUNSELOR,
    start_date: daysAgo(6), status: 'active',
    notes: 'Bi-weekly mentoring sessions post-OSS reentry. Focus on emotional regulation and self-advocacy with SPED supports in mind.',
  })
  console.log('  ✓ DeShawn — Mentoring (active, post-OSS reentry)')

  // Jayden — Counseling Referral (active) — substance abuse history
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: HS,
    student_id: S['LS-10007'].id, support_type: 'counseling_referral',
    assigned_by: AP, assigned_to: COUNSELOR,
    start_date: daysAgo(7), status: 'active',
    notes: 'Substance abuse counseling referral following vaping incident. Required per reentry plan. Coordinated with SAP program.',
  })
  console.log('  ✓ Jayden — Counseling Referral (active, substance abuse SAP)\n')

  // ─── 7. Campus Goals (Goals & Progress page) ─────────────────────────────────
  console.log('Creating campus goals (2025-26 school year)...')

  const insertGoal = async (g) => {
    const { error } = await supabase.from('navigator_campus_goals').insert(g)
    if (error) throw new Error(`Goal insert failed: ${error.message}`)
  }

  await insertGoal({
    district_id: DISTRICT_ID, campus_id: HS,
    school_year: '2025-26',
    iss_baseline: 8, oss_baseline: 12,
    iss_reduction_pct: 15.0, oss_reduction_pct: 20.0,
    created_by: ADMIN,
  })
  await insertGoal({
    district_id: DISTRICT_ID, campus_id: MS,
    school_year: '2025-26',
    iss_baseline: 5, oss_baseline: 6,
    iss_reduction_pct: 15.0, oss_reduction_pct: 15.0,
    created_by: ADMIN,
  })
  await insertGoal({
    district_id: DISTRICT_ID, campus_id: EL,
    school_year: '2025-26',
    iss_baseline: 2, oss_baseline: 1,
    iss_reduction_pct: 10.0, oss_reduction_pct: 10.0,
    created_by: ADMIN,
  })
  console.log('  ✓ HS: ISS baseline 8 (target -15%), OSS baseline 12 (target -20%)')
  console.log('  ✓ MS: ISS baseline 5 (target -15%), OSS baseline 6 (target -15%)')
  console.log('  ✓ EL: ISS baseline 2 (target -10%), OSS baseline 1 (target -10%)\n')

  // ─── 8. Prior Year Placements (2024-25) — YOY Chart ──────────────────────────
  console.log('Creating prior year placements (2024-25 school year for YOY chart)...')

  const insertPriorPlacement = async (p) => {
    const { error } = await supabase.from('navigator_placements').insert(p)
    if (error) throw new Error(`Prior placement insert failed: ${error.message}`)
  }

  // Prior year: 2024-08-01 to 2025-07-31
  // Spread across HS and MS students; higher counts than current year
  // (showing improvement trend in the YOY comparison chart)
  const priorYear = [
    // Sep 2024 — early year spike
    { campus_id: HS, student_id: S['LS-10001'].id, type: 'oss', start: '2024-09-05', end: '2024-09-07', days: 3 },
    { campus_id: HS, student_id: S['LS-10003'].id, type: 'iss', start: '2024-09-16', end: '2024-09-16', days: 1 },
    { campus_id: MS, student_id: S['LS-20006'].id, type: 'oss', start: '2024-09-23', end: '2024-09-25', days: 3 },
    // Oct 2024
    { campus_id: HS, student_id: S['LS-10005'].id, type: 'iss', start: '2024-10-07', end: '2024-10-08', days: 2 },
    { campus_id: HS, student_id: S['LS-10004'].id, type: 'oss', start: '2024-10-21', end: '2024-10-23', days: 3 },
    { campus_id: MS, student_id: S['LS-20004'].id, type: 'iss', start: '2024-10-29', end: '2024-10-29', days: 1 },
    // Nov 2024
    { campus_id: HS, student_id: S['LS-10007'].id, type: 'oss', start: '2024-11-04', end: '2024-11-06', days: 3 },
    { campus_id: MS, student_id: S['LS-20006'].id, type: 'iss', start: '2024-11-18', end: '2024-11-19', days: 2 },
    // Dec 2024
    { campus_id: HS, student_id: S['LS-10001'].id, type: 'iss', start: '2024-12-02', end: '2024-12-03', days: 2 },
    { campus_id: HS, student_id: S['LS-10003'].id, type: 'oss', start: '2024-12-09', end: '2024-12-11', days: 3 },
    // Jan 2025
    { campus_id: HS, student_id: S['LS-10005'].id, type: 'oss', start: '2025-01-13', end: '2025-01-15', days: 3 },
    { campus_id: MS, student_id: S['LS-20001'].id, type: 'iss', start: '2025-01-27', end: '2025-01-28', days: 2 },
    // Feb 2025
    { campus_id: HS, student_id: S['LS-10004'].id, type: 'iss', start: '2025-02-10', end: '2025-02-11', days: 2 },
    { campus_id: MS, student_id: S['LS-20006'].id, type: 'oss', start: '2025-02-24', end: '2025-02-26', days: 3 },
    // Mar 2025
    { campus_id: HS, student_id: S['LS-10007'].id, type: 'iss', start: '2025-03-03', end: '2025-03-04', days: 2 },
    { campus_id: HS, student_id: S['LS-10001'].id, type: 'oss', start: '2025-03-17', end: '2025-03-19', days: 3 },
    // Apr 2025
    { campus_id: MS, student_id: S['LS-20004'].id, type: 'oss', start: '2025-04-07', end: '2025-04-09', days: 3 },
    { campus_id: HS, student_id: S['LS-10003'].id, type: 'iss', start: '2025-04-22', end: '2025-04-22', days: 1 },
    // May 2025
    { campus_id: HS, student_id: S['LS-10005'].id, type: 'iss', start: '2025-05-05', end: '2025-05-06', days: 2 },
    { campus_id: MS, student_id: S['LS-20006'].id, type: 'iss', start: '2025-05-19', end: '2025-05-19', days: 1 },
  ]

  for (const p of priorYear) {
    await insertPriorPlacement({
      district_id: DISTRICT_ID,
      campus_id: p.campus_id,
      student_id: p.student_id,
      placement_type: p.type,
      start_date: p.start,
      end_date: p.end,
      days: p.days,
      assigned_by: ADMIN,
      reason: 'Prior year removal — historical record for YOY analysis',
      parent_notified: true,
      parent_notified_at: new Date(p.start).toISOString(),
      parent_notified_by: ADMIN,
    })
  }
  console.log(`  ✓ ${priorYear.length} prior year placements seeded (Aug 2024–May 2025)\n`)

  // ─── 9. Verify ───────────────────────────────────────────────────────────────
  console.log('Verifying...')
  const [refRes, placRes, supRes, goalRes] = await Promise.all([
    supabase.from('navigator_referrals').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
    supabase.from('navigator_placements').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
    supabase.from('navigator_supports').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
    supabase.from('navigator_campus_goals').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
  ])

  console.log(`  Referrals:     ${refRes.count}  (13 expected)`)
  console.log(`  Placements:    ${placRes.count}  (28 expected — 6 completed + 2 active + 20 prior year)`)
  console.log(`  Supports:      ${supRes.count}   (6 expected)`)
  console.log(`  Campus Goals:  ${goalRes.count}   (3 expected — HS, MS, EL)`)

  console.log('')
  console.log('══════════════════════════════════════════')
  console.log('  NAVIGATOR DEMO DATA SEEDED')
  console.log('══════════════════════════════════════════')
  console.log('')
  console.log('  ESCALATION ENGINE — Expected Risk Levels:')
  console.log('  🔴 HIGH:   Marcus Johnson   (3 refs ≤14d, OSS)')
  console.log('  🔴 HIGH:   DeShawn Jackson  (OSS + DAEP escalation)')
  console.log('  🔴 HIGH:   Jayden Smith     (referral + prior DAEP)')
  console.log('  🟡 MEDIUM: David Nguyen     (2 refs ≤30d, ISS)')
  console.log('  🟡 MEDIUM: Tyler Williams   (ISS, SPED)')
  console.log('  🟡 MEDIUM: Aaliyah Brown    (ISS)')
  console.log('  🟢 LOW:    Carlos Hernandez (1 ref 40d ago, resolved)')
  console.log('  🟢 LOW:    Isabella Rodriguez (1 ref, support working)')
  console.log('')
  console.log('  SKILL GAP MAP (referrals with skill_gap set):')
  console.log('  • impulse_control             3 (Marcus x2, DeShawn)')
  console.log('  • adult_communication         3 (DeShawn, Jayden x2)')
  console.log('  • executive_functioning       3 (David x2, Carlos)')
  console.log('  • emotional_regulation        2 (Marcus, Tyler)')
  console.log('  • academic_frustration_tolerance  1 (Isabella)')
  console.log('  • peer_conflict_resolution    1 (Aaliyah)')
  console.log('')
  console.log('  INTERVENTION EFFECTIVENESS (completed supports with data):')
  console.log('  • Isabella — Counseling:    5 → 1 incident (−80%)')
  console.log('  • Carlos   — Parent Contact: 3 → 1 incident (−67%)')
  console.log('')
  console.log('  GOALS & PROGRESS (2025-26 baselines):')
  console.log('  • HS: ISS 8 (→6.8 target), OSS 12 (→9.6 target)')
  console.log('  • MS: ISS 5 (→4.3 target), OSS 6 (→5.1 target)')
  console.log('  • EL: ISS 2 (→1.8 target), OSS 1 (→0.9 target)')
  console.log('')
  console.log('  ACTIVE PLACEMENTS (Active ISS / OSS tabs):')
  console.log('  • Marcus  — OSS 3 days (started yesterday, no end date)')
  console.log('  • DeShawn — ISS 2 days (started today, no end date)')
  console.log('')
  console.log('  YOY CHART (prior year placements):')
  console.log('  • 2024-25: 20 placements (Sep–May) for comparison baseline')
  console.log('  • 2025-26: 8 current placements (6 completed + 2 active) — shows improvement trend')
  console.log('')
  console.log('  Navigator is now enabled for Lone Star ISD.')
  console.log('')
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
