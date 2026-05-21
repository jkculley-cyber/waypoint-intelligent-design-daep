// Seed a Navigator-only campus demo district ("Lincoln High School")
// This creates a campus-as-district — a single campus provisioned as its own
// district with only ["navigator"] enabled. Demonstrates the campus-level
// purchase model for standalone Navigator sales AND serves as the public
// marketing-site sandbox for the Navigator demo funnel.
//
// Re-runnable: cleans + reseeds Lincoln HS on every invocation. Safe to use as
// the periodic reset path (no separate reset_navigator_sandbox.mjs needed).
//
// Creates:
//   - District: "Lincoln High School" (single-campus district, is_sandbox=true)
//   - Campus: Lincoln High School
//   - Auth user: explore-navigator@clearpathedgroup.com / Explore2026! (role: admin)
//   - 10 students (diverse demographics, SPED/504/EB flags)
//   - Navigator referrals, placements, supports, goals
//
// Usage:
//   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
//   node supabase/seed_navigator_campus_demo.mjs

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

// Fixed UUIDs for reproducibility.
// District UUID 33333333-... — distinct from Explorer ISD (22222222-...) which
// hosts the Waypoint sandbox. One product per sandbox district.
const DISTRICT_ID = '33333333-3333-3333-3333-333333333333'
const CAMPUS_ID   = 'cccc0001-0001-0001-0001-000000000001'

const ADMIN_EMAIL = 'explore-navigator@clearpathedgroup.com'
const ADMIN_PASS  = 'Explore2026!'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function daysAgoISO(n) {
  return new Date(Date.now() - n * 86400000).toISOString()
}

// Anon client only used as fallback to recover an existing user's UUID via
// signInWithPassword when supabase.auth.admin.listUsers() is unavailable
// (Supabase returns a 500 "Database error finding users" once the user pool
// crosses a threshold). Service-role client cannot signInWithPassword.
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const anonClient = ANON_KEY
  ? createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

async function createAuthUser(email, password, fullName, role) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, district_id: DISTRICT_ID },
  })
  if (!error) {
    console.log(`  ✓ Auth user ${email} created (${data.user.id})`)
    return data.user.id
  }

  // Already exists — recover UUID by signing in with the known password.
  if (error.message?.toLowerCase().includes('already') && anonClient) {
    const { data: signIn, error: siErr } = await anonClient.auth.signInWithPassword({ email, password })
    if (siErr) throw new Error(`Auth user ${email} exists but sign-in failed: ${siErr.message}`)
    console.log(`  ↻ Auth user ${email} already exists (${signIn.user.id})`)
    return signIn.user.id
  }

  throw new Error(`Auth create failed for ${email}: ${error.message}`)
}

async function run() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  NAVIGATOR CAMPUS DEMO — Lincoln High School')
  console.log('═══════════════════════════════════════════════════\n')

  // ─── 0. Clean previous demo data ────────────────────────────────────────────
  console.log('Cleaning previous Lincoln HS demo data...')
  // Delete in reverse-FK order — deepest children first
  const cleanByDistrict = [
    'navigator_campus_goals', 'navigator_supports', 'navigator_placements',
    'navigator_referrals', 'daily_behavior_tracking', 'student_interventions',
    'transition_plan_reviews', 'transition_plans', 'compliance_checklists',
    'incident_separations', 'alerts', 'notification_log', 'audit_log',
    'orientation_form_data', 'orientation_checkins', 'orientation_config',
    'meridian_secondary_transitions', 'meridian_rda_determination', 'meridian_rda_indicators',
    'meridian_cap_findings', 'meridian_ard_referrals', 'meridian_ieps',
    'meridian_504_plans', 'meridian_students',
    'import_history', 'import_errors', 'student_guardians',
    'offense_codes', 'discipline_matrix', 'contracts', 'interventions',
  ]
  for (const t of cleanByDistrict) {
    const { error } = await supabase.from(t).delete().eq('district_id', DISTRICT_ID)
    if (error && !error.message.includes('does not exist')) console.warn(`  ⚠ ${t}: ${error.message}`)
  }
  // Null out incident FK refs before deleting
  await supabase.from('incidents').update({ compliance_checklist_id: null, transition_plan_id: null }).eq('district_id', DISTRICT_ID)
  await supabase.from('incidents').delete().eq('district_id', DISTRICT_ID)
  // profile_campus_assignments uses campus_id, not district_id
  await supabase.from('profile_campus_assignments').delete().eq('campus_id', CAMPUS_ID)
  await supabase.from('students').delete().eq('district_id', DISTRICT_ID)
  await supabase.from('profiles').delete().eq('district_id', DISTRICT_ID)
  await supabase.from('campuses').delete().eq('district_id', DISTRICT_ID)
  const { error: delDistErr } = await supabase.from('districts').delete().eq('id', DISTRICT_ID)
  if (delDistErr) console.warn(`  ⚠ districts: ${delDistErr.message}`)

  // Clean legacy auth users (ap@lincoln-hs.demo + counselor@lincoln-hs.demo were
  // the original creds; consolidated to a single explore-navigator admin so the
  // sandbox cred-set matches the marketing-page display). Also clean the new
  // admin so re-runs are idempotent.
  const legacyEmails = ['ap@lincoln-hs.demo', 'counselor@lincoln-hs.demo']
  const { data: allUsers } = await supabase.auth.admin.listUsers()
  for (const email of [...legacyEmails, ADMIN_EMAIL]) {
    const u = allUsers?.users?.find(x => x.email === email)
    if (u) {
      // Delete profile first (FK), then auth user
      await supabase.from('profiles').delete().eq('id', u.id)
      await supabase.auth.admin.deleteUser(u.id)
      console.log(`  ✓ Deleted auth user ${email}`)
    }
  }
  console.log('  ✓ Cleaned\n')

  // ─── 1. Create district (campus-as-district) ───────────────────────────────
  console.log('Creating district (campus-as-district)...')
  const { error: dErr } = await supabase.from('districts').insert({
    id: DISTRICT_ID,
    name: 'Lincoln High School',
    tea_district_id: 'LHS-DEMO',
    state: 'TX',
    settings: {
      is_sandbox: true,
      subscription_tier: 'professional',
      products: ['navigator'],
    },
  })
  if (dErr) throw new Error(`District insert failed: ${dErr.message}`)
  console.log('  ✓ Lincoln High School — Navigator only, professional tier\n')

  // ─── 2. Create campus ──────────────────────────────────────────────────────
  console.log('Creating campus...')
  const { error: cErr } = await supabase.from('campuses').insert({
    id: CAMPUS_ID,
    district_id: DISTRICT_ID,
    name: 'Lincoln High School',
    tea_campus_id: 'LHS-001',
    campus_type: 'high',
  })
  if (cErr) throw new Error(`Campus insert failed: ${cErr.message}`)
  console.log('  ✓ Lincoln High School campus\n')

  // ─── 3. Create auth user + profile ─────────────────────────────────────────
  // Single admin user. Role = admin so the sandbox visitor sees full Navigator
  // surface area (referral creation, placement, reports). Same cred displayed
  // on clearpath-site/navigator.html and in the welcome_navigator_demo email.
  console.log('Creating auth user...')
  const adminUserId = await createAuthUser(ADMIN_EMAIL, ADMIN_PASS, 'Lincoln HS Admin', 'admin')
  console.log()

  console.log('Creating profile...')
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: adminUserId,
    district_id: DISTRICT_ID,
    full_name: 'Lincoln HS Admin',
    role: 'admin',
    email: ADMIN_EMAIL,
  }, { onConflict: 'id' })
  if (profErr) throw new Error(`Profile upsert failed: ${profErr.message}`)
  console.log('  ✓ Lincoln HS Admin profile\n')

  // Campus assignment
  console.log('Assigning admin to campus...')
  const { error: caErr } = await supabase.from('profile_campus_assignments').upsert({
    profile_id: adminUserId,
    campus_id: CAMPUS_ID,
  }, { onConflict: 'profile_id,campus_id' })
  if (caErr) console.warn(`  ⚠ Campus assignment: ${caErr.message}`)
  console.log('  ✓ Admin assigned to Lincoln HS\n')

  // Existing rows below use AP and COUNSELOR as reported_by / reviewed_by /
  // assigned_by — point both at the single admin so transactional data still
  // populates without splitting historical roles.
  const AP = adminUserId
  const COUNSELOR = adminUserId

  // ─── 4. Create students ─────────────────────────────────────────────────────
  console.log('Creating students...')
  // race values are canonical codes per migration 070 CHECK constraint
  // (`black`, `hispanic`, `white`, `asian`, etc.) — natural-language labels
  // get coerced to not_specified, which silently breaks Disproportionality.
  const studentDefs = [
    { num: 'LHS-001', first: 'Marcus', last: 'Thompson', grade: 11, gender: 'M', race: 'black' },
    { num: 'LHS-002', first: 'Sofia', last: 'Ramirez', grade: 10, gender: 'F', race: 'hispanic', is_504: true },
    { num: 'LHS-003', first: 'Jaylen', last: 'Carter', grade: 12, gender: 'M', race: 'black', is_sped: true, sped_status: 'active' },
    { num: 'LHS-004', first: 'Emma', last: 'Mitchell', grade: 9, gender: 'F', race: 'white' },
    { num: 'LHS-005', first: 'Diego', last: 'Flores', grade: 10, gender: 'M', race: 'hispanic' },
    { num: 'LHS-006', first: 'Aisha', last: 'Williams', grade: 11, gender: 'F', race: 'black', is_sped: true, sped_status: 'active' },
    { num: 'LHS-007', first: 'Ethan', last: 'Nguyen', grade: 9, gender: 'M', race: 'asian' },
    { num: 'LHS-008', first: 'Destiny', last: 'Jackson', grade: 12, gender: 'F', race: 'black', is_ell: true },
    { num: 'LHS-009', first: 'Tyler', last: 'Brooks', grade: 10, gender: 'M', race: 'white' },
    { num: 'LHS-010', first: 'Valentina', last: 'Cruz', grade: 11, gender: 'F', race: 'hispanic' },
  ]

  const S = {} // student_id_number → { id, ... }
  for (const s of studentDefs) {
    const row = {
      district_id: DISTRICT_ID,
      campus_id: CAMPUS_ID,
      student_id_number: s.num,
      first_name: s.first,
      last_name: s.last,
      grade_level: s.grade,
      gender: s.gender,
      race_ethnicity: s.race,
    }
    if (s.is_sped) { row.is_sped = true; row.sped_eligibility = s.sped_status }
    if (s.is_504) row.is_504 = true
    if (s.is_ell) row.is_ell = true

    const { data, error } = await supabase
      .from('students')
      .upsert(row, { onConflict: 'district_id,student_id_number' })
      .select('id, student_id_number')
    if (error) throw new Error(`Student insert failed (${s.num}): ${error.message}`)
    // Fetch the student to get the id
    const { data: fetched } = await supabase
      .from('students')
      .select('id, student_id_number')
      .eq('district_id', DISTRICT_ID)
      .eq('student_id_number', s.num)
      .limit(1)
      .single()
    S[s.num] = fetched
  }
  console.log(`  ✓ ${studentDefs.length} students created\n`)

  // ─── 5. Referrals ──────────────────────────────────────────────────────────
  console.log('Creating referrals...')

  const insertRef = async (r) => {
    const { data: [row], error } = await supabase
      .from('navigator_referrals')
      .insert(r)
      .select('id')
    if (error) throw new Error(`Referral insert failed: ${error.message}`)
    return row.id
  }

  const refIds = {}

  // ── Marcus Thompson (LHS-001) — HIGH RISK: 3 referrals in 14 days ──
  refIds.marcus1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-001'].id, reported_by: AP,
    referral_date: daysAgo(13),
    location: 'Hallway', description: 'Verbal altercation with another student during passing period. Refused to comply with staff directions to separate.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: daysAgoISO(12),
    outcome: 'oss',
    skill_gap: 'impulse_control',
    skill_gap_notes: 'Pattern of reacting immediately in peer conflicts without considering consequences.',
  })
  refIds.marcus2 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-001'].id, reported_by: AP,
    referral_date: daysAgo(6),
    location: 'Classroom', description: 'Threw materials and made verbal threats toward classmate during group work.',
    status: 'reviewed', reviewed_by: COUNSELOR, reviewed_at: daysAgoISO(5),
    outcome: 'conference',
    skill_gap: 'impulse_control',
  })
  refIds.marcus3 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-001'].id, reported_by: AP,
    referral_date: daysAgo(2),
    location: 'Cafeteria', description: 'Physical altercation during lunch — third incident this month.',
    status: 'pending',
    skill_gap: 'emotional_regulation',
  })
  console.log('  ✓ Marcus Thompson — 3 referrals (13d, 6d, 2d) → HIGH RISK')

  // ── Jaylen Carter (LHS-003) — HIGH RISK: SPED + 2 referrals + OSS ──
  refIds.jaylen1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-003'].id, reported_by: AP,
    referral_date: daysAgo(20),
    location: 'Classroom', description: 'Emotional outburst during test — overturned desk, refused all redirection. IEP behavior plan not followed by sub.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: daysAgoISO(19),
    outcome: 'oss',
    skill_gap: 'emotional_regulation',
    skill_gap_notes: 'IEP-identified ED classification. Substitute did not implement de-escalation protocol from BIP.',
    admin_notes: 'SPED coordinator notified. MDR review may be needed if further placements.',
  })
  refIds.jaylen2 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-003'].id, reported_by: COUNSELOR,
    referral_date: daysAgo(5),
    location: 'Commons', description: 'Verbal confrontation with staff member. Student reports frustration with schedule change not communicated.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: daysAgoISO(4),
    outcome: 'support_assigned',
    skill_gap: 'adult_communication',
  })
  console.log('  ✓ Jaylen Carter (SPED) — 2 referrals, OSS → HIGH RISK')

  // ── Diego Flores (LHS-005) — MEDIUM: 2 referrals ──
  refIds.diego1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-005'].id, reported_by: AP,
    referral_date: daysAgo(18),
    location: 'Classroom', description: 'Phone out after multiple redirections. Argumentative when asked to comply.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: daysAgoISO(17),
    outcome: 'iss',
    skill_gap: 'executive_functioning',
    skill_gap_notes: 'Difficulty with device management and following multi-step directions.',
  })
  refIds.diego2 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-005'].id, reported_by: AP,
    referral_date: daysAgo(4),
    location: 'Hallway', description: 'Left class without permission. Found in hallway on phone.',
    status: 'pending',
    skill_gap: 'executive_functioning',
  })
  console.log('  ✓ Diego Flores — 2 referrals → MEDIUM RISK')

  // ── Aisha Williams (LHS-006) — MEDIUM: SPED + referral + ISS ──
  refIds.aisha1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-006'].id, reported_by: COUNSELOR,
    referral_date: daysAgo(15),
    location: 'Library', description: 'Confrontation with peer over seating. Raised voice, threw book. SPED student with emotional disturbance classification.',
    status: 'reviewed', reviewed_by: AP, reviewed_at: daysAgoISO(14),
    outcome: 'iss',
    skill_gap: 'peer_conflict_resolution',
    skill_gap_notes: 'Escalates quickly in peer conflicts. IEP calls for peer mediation and cool-down space.',
  })
  console.log('  ✓ Aisha Williams (SPED) — 1 referral, ISS → MEDIUM RISK')

  // ── Sofia Ramirez (LHS-002) — MEDIUM: 504 + referral ──
  refIds.sofia1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-002'].id, reported_by: AP,
    referral_date: daysAgo(10),
    location: 'Classroom', description: 'Repeated task avoidance and defiance during in-class assignment. 504 accommodations (extended time) were in place.',
    status: 'reviewed', reviewed_by: COUNSELOR, reviewed_at: daysAgoISO(9),
    outcome: 'support_assigned',
    skill_gap: 'academic_frustration_tolerance',
  })
  console.log('  ✓ Sofia Ramirez (504) — 1 referral, support assigned → MEDIUM RISK')

  // ── Emma Mitchell (LHS-004) — LOW: single old referral ──
  refIds.emma1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-004'].id, reported_by: AP,
    referral_date: daysAgo(35),
    location: 'Classroom', description: 'Excessive talking and off-task behavior. First referral this year.',
    status: 'closed', reviewed_by: AP, reviewed_at: daysAgoISO(34),
    outcome: 'conference',
    skill_gap: 'executive_functioning',
  })
  console.log('  ✓ Emma Mitchell — 1 old referral (closed) → LOW RISK')

  // ── Valentina Cruz (LHS-010) — LOW: support helping ──
  refIds.val1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-010'].id, reported_by: AP,
    referral_date: daysAgo(28),
    location: 'Classroom', description: 'Emotional dysregulation during group presentation. Walked out of class crying.',
    status: 'reviewed', reviewed_by: COUNSELOR, reviewed_at: daysAgoISO(27),
    outcome: 'support_assigned',
    skill_gap: 'emotional_regulation',
  })
  console.log('  ✓ Valentina Cruz — 1 referral, counseling working → LOW RISK')

  // ── Destiny Jackson (LHS-008) — referral + EB flag ──
  refIds.destiny1 = await insertRef({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-008'].id, reported_by: AP,
    referral_date: daysAgo(9),
    location: 'Hallway', description: 'Verbal altercation during class transition. EB student — language barrier contributed to miscommunication.',
    status: 'reviewed', reviewed_by: COUNSELOR, reviewed_at: daysAgoISO(8),
    outcome: 'conference',
    skill_gap: 'adult_communication',
    admin_notes: 'ESL coordinator consulted. Communication supports recommended.',
  })
  console.log('  ✓ Destiny Jackson (EB) — 1 referral, conference → LOW/MEDIUM')

  console.log(`  Total: 12 referrals across 8 students\n`)

  // ─── 6. Placements ─────────────────────────────────────────────────────────
  console.log('Creating ISS/OSS placements...')

  const insertPlacement = async (p) => {
    const { error } = await supabase.from('navigator_placements').insert(p)
    if (error) throw new Error(`Placement insert failed: ${error.message}`)
  }

  // Marcus — OSS 3 days (completed)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-001'].id, referral_id: refIds.marcus1,
    placement_type: 'oss', start_date: daysAgo(12), end_date: daysAgo(10), days: 3,
    assigned_by: AP, reason: 'Verbal altercation / refusal to comply',
    reentry_plan: 'Parent conference + behavior contract.',
    parent_notified: true, parent_notified_method: 'phone_call', parent_notified_by: AP,
  })
  console.log('  ✓ Marcus — OSS 3 days (completed)')

  // Marcus — ACTIVE OSS (pending — third incident)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-001'].id, referral_id: refIds.marcus3,
    placement_type: 'oss', start_date: daysAgo(1), end_date: null, days: 3,
    assigned_by: AP, reason: 'Third physical altercation this month',
    reentry_plan: 'Re-entry conference required. Behavior contract review.',
    parent_notified: true, parent_notified_method: 'phone_call', parent_notified_by: AP,
  })
  console.log('  ✓ Marcus — OSS 3 days (ACTIVE)')

  // Jaylen — OSS 3 days (completed, SPED)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-003'].id, referral_id: refIds.jaylen1,
    placement_type: 'oss', start_date: daysAgo(19), end_date: daysAgo(17), days: 3,
    assigned_by: AP, reason: 'Emotional outburst — desk overturned',
    reentry_plan: 'SPED coordinator meeting. BIP review with case manager.',
    parent_notified: true, parent_notified_method: 'phone_call', parent_notified_by: AP,
  })
  console.log('  ✓ Jaylen — OSS 3 days (completed, SPED)')

  // Diego — ISS 2 days (completed)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-005'].id, referral_id: refIds.diego1,
    placement_type: 'iss', start_date: daysAgo(16), end_date: daysAgo(15), days: 2,
    assigned_by: AP, reason: 'Phone policy violation after repeated redirections',
    parent_notified: true, parent_notified_method: 'phone_call', parent_notified_by: AP,
  })
  console.log('  ✓ Diego — ISS 2 days (completed)')

  // Aisha — ISS 1 day (completed, SPED)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-006'].id, referral_id: refIds.aisha1,
    placement_type: 'iss', start_date: daysAgo(14), end_date: daysAgo(14), days: 1,
    assigned_by: AP, reason: 'Peer confrontation — cool-down ISS',
    reentry_plan: 'Peer mediation session required.',
    parent_notified: true, parent_notified_method: 'phone_call', parent_notified_by: COUNSELOR,
  })
  console.log('  ✓ Aisha — ISS 1 day (completed, SPED)')

  // Diego — ACTIVE ISS (second incident)
  await insertPlacement({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-005'].id, referral_id: refIds.diego2,
    placement_type: 'iss', start_date: daysAgo(0), end_date: null, days: 2,
    assigned_by: AP, reason: 'Left class without permission — second referral this month',
    parent_notified: true, parent_notified_method: 'phone_call', parent_notified_by: AP,
  })
  console.log('  ✓ Diego — ISS 2 days (ACTIVE)')

  console.log('  Total: 6 current year placements (4 completed + 2 active)\n')

  // Prior year placements for YOY comparison
  console.log('Creating prior year placements (2024-25)...')
  const priorStudents = ['LHS-001','LHS-003','LHS-005','LHS-006','LHS-009','LHS-008']
  const priorYear = [
    { student: 'LHS-001', type: 'oss', start: '2024-09-09', end: '2024-09-11', days: 3 },
    { student: 'LHS-003', type: 'iss', start: '2024-09-23', end: '2024-09-23', days: 1 },
    { student: 'LHS-005', type: 'iss', start: '2024-10-07', end: '2024-10-08', days: 2 },
    { student: 'LHS-006', type: 'oss', start: '2024-10-21', end: '2024-10-23', days: 3 },
    { student: 'LHS-009', type: 'iss', start: '2024-11-04', end: '2024-11-05', days: 2 },
    { student: 'LHS-001', type: 'iss', start: '2024-11-18', end: '2024-11-19', days: 2 },
    { student: 'LHS-008', type: 'oss', start: '2024-12-02', end: '2024-12-04', days: 3 },
    { student: 'LHS-003', type: 'oss', start: '2025-01-13', end: '2025-01-15', days: 3 },
    { student: 'LHS-005', type: 'oss', start: '2025-02-03', end: '2025-02-05', days: 3 },
    { student: 'LHS-009', type: 'iss', start: '2025-02-24', end: '2025-02-25', days: 2 },
    { student: 'LHS-006', type: 'iss', start: '2025-03-10', end: '2025-03-11', days: 2 },
    { student: 'LHS-001', type: 'oss', start: '2025-03-24', end: '2025-03-26', days: 3 },
    { student: 'LHS-008', type: 'iss', start: '2025-04-07', end: '2025-04-08', days: 2 },
    { student: 'LHS-003', type: 'iss', start: '2025-04-28', end: '2025-04-29', days: 2 },
    { student: 'LHS-005', type: 'iss', start: '2025-05-12', end: '2025-05-13', days: 2 },
  ]
  for (const p of priorYear) {
    await insertPlacement({
      district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
      student_id: S[p.student].id,
      placement_type: p.type,
      start_date: p.start, end_date: p.end, days: p.days,
      assigned_by: AP, reason: 'Prior year — historical record',
      parent_notified: true, parent_notified_method: 'phone_call', parent_notified_by: AP,
    })
  }
  console.log(`  ✓ ${priorYear.length} prior year placements (Sep 2024–May 2025)\n`)

  // ─── 7. Supports ──────────────────────────────────────────────────────────
  console.log('Creating supports...')

  const insertSupport = async (s) => {
    const { error } = await supabase.from('navigator_supports').insert(s)
    if (error) throw new Error(`Support insert failed: ${error.message}`)
  }

  // Marcus — CICO (active)
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-001'].id, support_type: 'cico',
    assigned_by: COUNSELOR, assigned_to: COUNSELOR,
    start_date: daysAgo(5), status: 'active',
    notes: 'Morning and afternoon check-ins. Goal: reduce reactive behaviors before next incident triggers escalation.',
  })
  console.log('  ✓ Marcus — CICO (active)')

  // Jaylen — Behavior Contract (active, SPED-aligned)
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-003'].id, support_type: 'behavior_contract',
    assigned_by: COUNSELOR, assigned_to: AP,
    start_date: daysAgo(15), status: 'active',
    notes: 'Aligned with IEP BIP. Weekly check-in with case manager. Cool-down pass to counselor office.',
  })
  console.log('  ✓ Jaylen — Behavior Contract (active, IEP-aligned)')

  // Sofia — Counseling (active, 504)
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-002'].id, support_type: 'counseling_referral',
    assigned_by: COUNSELOR, assigned_to: COUNSELOR,
    start_date: daysAgo(8), status: 'active',
    notes: 'Weekly sessions addressing academic frustration and self-advocacy. 504 accommodations reviewed with teachers.',
  })
  console.log('  ✓ Sofia — Counseling (active, 504)')

  // Valentina — Counseling (completed with effectiveness data)
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-010'].id, support_type: 'counseling_referral',
    assigned_by: COUNSELOR, assigned_to: COUNSELOR,
    start_date: daysAgo(26), end_date: daysAgo(5), status: 'completed',
    notes: 'Weekly counseling for emotional regulation. Significant progress — developed coping strategies for presentation anxiety.',
    incidents_before: 4,
    incidents_after: 0,
    outcome_notes: 'No new referrals since intervention began. Student self-reports improved coping. Teacher confirms engagement up.',
  })
  console.log('  ✓ Valentina — Counseling (completed, 4→0 incidents)')

  // Emma — Parent Contact (completed with effectiveness data)
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-004'].id, support_type: 'parent_contact',
    assigned_by: AP, assigned_to: AP,
    start_date: daysAgo(33), end_date: daysAgo(30), status: 'completed',
    notes: 'Phone conference with parent. Parent agreed to daily behavior check-in at home.',
    incidents_before: 2,
    incidents_after: 0,
    outcome_notes: 'No further referrals. Parent reports consistent follow-through at home.',
  })
  console.log('  ✓ Emma — Parent Contact (completed, 2→0 incidents)')

  // Destiny — Mentoring (active, EB student)
  await insertSupport({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    student_id: S['LHS-008'].id, support_type: 'mentoring',
    assigned_by: COUNSELOR, assigned_to: COUNSELOR,
    start_date: daysAgo(7), status: 'active',
    notes: 'Weekly mentoring with bilingual counselor. Focus on communication strategies and conflict de-escalation.',
  })
  console.log('  ✓ Destiny — Mentoring (active, EB student)')

  console.log('  Total: 6 supports (4 active, 2 completed with data)\n')

  // ─── 8. Campus Goals ───────────────────────────────────────────────────────
  console.log('Creating campus goals (2025-26)...')
  const { error: gErr } = await supabase.from('navigator_campus_goals').insert({
    district_id: DISTRICT_ID, campus_id: CAMPUS_ID,
    school_year: '2025-26',
    iss_baseline: 12, oss_baseline: 8,
    iss_reduction_pct: 20.0, oss_reduction_pct: 25.0,
    created_by: AP,
  })
  if (gErr) throw new Error(`Goal insert failed: ${gErr.message}`)
  console.log('  ✓ ISS baseline 12 (target -20%), OSS baseline 8 (target -25%)\n')

  // ─── 9. Copy discipline matrix from Lone Star ISD ──────────────────────────
  console.log('Copying discipline matrix from Lone Star ISD...')
  const LONE_STAR_ID = '11111111-1111-1111-1111-111111111111'
  await supabase.from('discipline_matrix').delete().eq('district_id', DISTRICT_ID)
  const { data: matrixEntries } = await supabase.from('discipline_matrix').select('*').eq('district_id', LONE_STAR_ID)
  if (matrixEntries?.length) {
    const copies = matrixEntries.map(e => { const { id, ...rest } = e; return { ...rest, district_id: DISTRICT_ID } })
    await supabase.from('discipline_matrix').insert(copies)
    console.log(`  ✓ ${copies.length} matrix entries copied (consequence scales, proactive/restorative options)\n`)
  } else {
    console.log('  ⚠ No matrix entries found in Lone Star ISD to copy\n')
  }

  // ─── 10. Verify ───────────────────────────────────────────────────────────
  console.log('Verifying...')
  const [refRes, placRes, supRes, goalRes, studRes] = await Promise.all([
    supabase.from('navigator_referrals').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
    supabase.from('navigator_placements').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
    supabase.from('navigator_supports').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
    supabase.from('navigator_campus_goals').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('district_id', DISTRICT_ID),
  ])

  console.log(`  Students:      ${studRes.count}  (10 expected)`)
  console.log(`  Referrals:     ${refRes.count}  (12 expected)`)
  console.log(`  Placements:    ${placRes.count}  (21 expected — 4 completed + 2 active + 15 prior year)`)
  console.log(`  Supports:      ${supRes.count}   (6 expected)`)
  console.log(`  Campus Goals:  ${goalRes.count}   (1 expected)`)

  console.log('')
  console.log('═══════════════════════════════════════════════════')
  console.log('  LINCOLN HIGH SCHOOL — NAVIGATOR CAMPUS DEMO')
  console.log('═══════════════════════════════════════════════════')
  console.log('')
  console.log('  LOGIN CREDENTIALS:')
  console.log('  ─────────────────')
  console.log(`  Admin:      ${ADMIN_EMAIL} / ${ADMIN_PASS}`)
  console.log('')
  console.log('  RISK LEVELS:')
  console.log('  ────────────')
  console.log('  🔴 HIGH:   Marcus Thompson   (3 refs ≤14d, active OSS)')
  console.log('  🔴 HIGH:   Jaylen Carter     (SPED, 2 refs, OSS)')
  console.log('  🟡 MEDIUM: Diego Flores      (2 refs, active ISS)')
  console.log('  🟡 MEDIUM: Aisha Williams    (SPED, ISS)')
  console.log('  🟡 MEDIUM: Sofia Ramirez     (504, support assigned)')
  console.log('  🟡 MEDIUM: Destiny Jackson   (EB, conference)')
  console.log('  🟢 LOW:    Emma Mitchell     (1 old ref, resolved)')
  console.log('  🟢 LOW:    Valentina Cruz    (support working, 4→0)')
  console.log('')
  console.log('  ACTIVE PLACEMENTS:')
  console.log('  • Marcus  — OSS 3 days (started yesterday)')
  console.log('  • Diego   — ISS 2 days (started today)')
  console.log('')
  console.log('  INTERVENTION EFFECTIVENESS:')
  console.log('  • Valentina — Counseling:    4 → 0 incidents (−100%)')
  console.log('  • Emma      — Parent Contact: 2 → 0 incidents (−100%)')
  console.log('')
  console.log('  DISPROPORTIONALITY FLAGS:')
  console.log('  • 4 of 8 referred students are Black (50%) — check campus demo %')
  console.log('  • 2 SPED students with placements — watch for MDR triggers')
  console.log('')
  console.log('  This is a Navigator-only district (no Waypoint/Meridian).')
  console.log('  The sidebar will show only Navigator pages.')
  console.log('')
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
