// Seed DAEP Approval Flow demo data
// Creates staff accounts for all approval chain roles and
// DAEP incidents at various stages of the 6-step approval process.
//
// Prerequisites:
//   - Migration 016 applied (director_student_affairs role, 6-step chain, scheduling table)
//   - run_seed.mjs already executed (students, offense codes, district exist)
//   - create_campus_staff.mjs already executed (some staff accounts exist)
//
// Usage:
//   $env:SUPABASE_DB_PASSWORD="your-password"
//   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
//   node supabase/seed_approval_flow.mjs

import pg from 'pg';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SERVICE_KEY || !DB_PASSWORD) {
  console.error('Missing required environment variables:');
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="your-key"');
  console.error('  $env:SUPABASE_DB_PASSWORD="your-password"');
  process.exit(1);
}

const DB_HOST = process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co';
const ADMIN_USER_ID = '1f2defa0-8f23-4173-9b55-01380cd0a836';
const DISTRICT_ID = '11111111-1111-1111-1111-111111111111';
const HS = 'aaaa0001-0001-0001-0001-000000000001';
const MS = 'aaaa0001-0001-0001-0001-000000000002';
const PASSWORD = 'Password123!';

const client = new pg.Client({
  host: DB_HOST,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function q(sql, params = []) {
  return client.query(sql, params);
}

// ============================================
// Auth user creation helper
// ============================================
async function createAuthUser(email, fullName, role) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName, role, district_id: DISTRICT_ID },
    }),
  });

  const data = await res.json();
  if (data.id) return data.id;

  // User might already exist
  if (data.msg?.includes('already') || data.message?.includes('already')) {
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });
    const listData = await listRes.json();
    const users = listData.users || listData;
    const existing = users.find(u => u.email === email);
    if (existing) return existing.id;
  }

  throw new Error(`Failed to create/find user ${email}: ${JSON.stringify(data)}`);
}

async function ensureStaffAccount(email, fullName, role, campusId) {
  const userId = await createAuthUser(email, fullName, role);
  await q(
    `INSERT INTO profiles (id, district_id, email, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name`,
    [userId, DISTRICT_ID, email, fullName, role]
  );
  await q(
    `INSERT INTO profile_campus_assignments (profile_id, campus_id, is_primary)
     VALUES ($1, $2, true)
     ON CONFLICT DO NOTHING`,
    [userId, campusId]
  );
  return userId;
}

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!\n');

  // =============================================
  // 1. Create approval-chain role staff accounts
  // =============================================
  console.log('Creating approval chain staff accounts...');

  const cbcId = await ensureStaffAccount(
    'hs-cbc@lonestar-isd.org', 'Derek Thompson', 'cbc', HS
  );
  console.log(`  ✓ CBC:         hs-cbc@lonestar-isd.org (Derek Thompson)`);

  const counselorId = await ensureStaffAccount(
    'hs-counselor@lonestar-isd.org', 'Linda Park', 'counselor', HS
  );
  console.log(`  ✓ Counselor:   hs-counselor@lonestar-isd.org (Linda Park)`);

  // SPED coord already exists at MS (sped-coord@lonestar-isd.org)
  // Create one at HS too
  const spedId = await ensureStaffAccount(
    'hs-sped@lonestar-isd.org', 'Gloria Ramirez', 'sped_coordinator', HS
  );
  console.log(`  ✓ SPED Coord:  hs-sped@lonestar-isd.org (Gloria Ramirez)`);

  const coord504Id = await ensureStaffAccount(
    'hs-504@lonestar-isd.org', 'Brian Foster', 'section_504_coordinator', HS
  );
  console.log(`  ✓ 504 Coord:   hs-504@lonestar-isd.org (Brian Foster)`);

  const sssId = await ensureStaffAccount(
    'sss@lonestar-isd.org', 'Tamara Williams', 'sss', HS
  );
  console.log(`  ✓ SSS:         sss@lonestar-isd.org (Tamara Williams)`);

  const directorId = await ensureStaffAccount(
    'director@lonestar-isd.org', 'Dr. Michael Chambers', 'director_student_affairs', HS
  );
  console.log(`  ✓ Director:    director@lonestar-isd.org (Dr. Michael Chambers)`);

  // MS-based staff for MS scenarios
  const msCbcId = await ensureStaffAccount(
    'ms-cbc@lonestar-isd.org', 'Nicole Adams', 'cbc', MS
  );
  console.log(`  ✓ MS CBC:      ms-cbc@lonestar-isd.org (Nicole Adams)`);

  const msSssId = await ensureStaffAccount(
    'ms-sss@lonestar-isd.org', 'Kevin Harris', 'sss', MS
  );
  console.log(`  ✓ MS SSS:      ms-sss@lonestar-isd.org (Kevin Harris)`);

  console.log('');

  // =============================================
  // 1b. Set default orientation config on district
  // =============================================
  console.log('Setting default orientation config on district...');
  await q(`UPDATE districts SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb WHERE id = $2`, [
    JSON.stringify({ orientation_config: { available_days: [1, 3, 5], time_slots: ["09:00", "13:00"], max_per_slot: 5 }}),
    DISTRICT_ID
  ]);
  console.log('  ✓ Orientation config set (Mon/Wed/Fri, 9:00 AM & 1:00 PM, max 5)\n');

  // =============================================
  // 2. Look up students and offense codes
  // =============================================
  console.log('Looking up students and offense codes...');

  // Students by student_id_number
  const studentLookup = {};
  const studentNumbers = ['LS-10001', 'LS-10002', 'LS-10003', 'LS-10004', 'LS-10005', 'LS-10006', 'LS-20001', 'LS-20004', 'LS-20006'];
  for (const num of studentNumbers) {
    const { rows } = await q('SELECT id, is_sped, is_504 FROM students WHERE student_id_number = $1', [num]);
    studentLookup[num] = rows[0];
  }

  const offenseLookup = {};
  const offenseCodes = ['FIGHT-02', 'DRUG-01', 'DRUG-03', 'BULLY-02', 'DEFY-03', 'HARASS-01'];
  for (const code of offenseCodes) {
    const { rows } = await q('SELECT id FROM offense_codes WHERE code = $1', [code]);
    offenseLookup[code] = rows[0]?.id;
  }
  console.log(`  ✓ ${Object.keys(studentLookup).length} students, ${Object.keys(offenseLookup).length} offense codes\n`);

  // =============================================
  // 3. Clean up previous approval flow seed data
  // =============================================
  console.log('Cleaning up previous approval flow data...');
  // Delete scheduling records first (FK to incidents)
  await q('DELETE FROM daep_placement_scheduling WHERE district_id = $1', [DISTRICT_ID]);
  // Delete approval steps and chains
  await q(`DELETE FROM daep_approval_steps WHERE chain_id IN (
    SELECT id FROM daep_approval_chains WHERE district_id = $1
      AND incident_id IN (SELECT id FROM incidents WHERE notes LIKE '%[APPROVAL_FLOW_SEED]%')
  )`, [DISTRICT_ID]);
  await q(`DELETE FROM daep_approval_chains WHERE district_id = $1
    AND incident_id IN (SELECT id FROM incidents WHERE notes LIKE '%[APPROVAL_FLOW_SEED]%')`, [DISTRICT_ID]);
  await q(`DELETE FROM incidents WHERE district_id = $1 AND notes LIKE '%[APPROVAL_FLOW_SEED]%'`, [DISTRICT_ID]);
  console.log('  ✓ Previous approval flow seed data cleaned\n');

  // =============================================
  // 4. Disable the auto-create trigger so we can manually create chains with step 6
  // =============================================
  console.log('Disabling auto-create triggers...');
  await q('ALTER TABLE incidents DISABLE TRIGGER trg_create_daep_approval_chain');
  await q('ALTER TABLE incidents DISABLE TRIGGER trg_check_sped_compliance');
  await q('ALTER TABLE incidents DISABLE TRIGGER trg_check_repeat_offender');
  try {
    await q('ALTER TABLE incidents DISABLE TRIGGER trg_create_daep_scheduling');
  } catch (e) { /* trigger may not exist yet */ }
  console.log('  ✓ Triggers disabled\n');

  // =============================================
  // 5. Create DAEP incidents at different approval stages
  // =============================================
  console.log('Creating DAEP incidents with approval chains...\n');

  // ---- SCENARIO A: Fully Approved (all 6 steps complete) — Non-SPED student ----
  // David Nguyen (LS-10005, non-SPED, non-504, ELL)
  const david = studentLookup['LS-10005'];
  const { rows: [incA] } = await q(`
    INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time,
      location, offense_code_id, description, consequence_type, consequence_days,
      consequence_start, consequence_end, status, notes)
    VALUES ($1, $2, $3, $4, '2026-01-05', '10:30', 'Parking Lot', $5,
      'David was found in possession of marijuana on campus. SRO confirmed substance. Mandatory DAEP placement per district policy.',
      'daep', 30, '2026-01-06', '2026-02-18', 'approved',
      '[APPROVAL_FLOW_SEED] Fully approved through all 6 steps. Non-SPED student.')
    RETURNING id
  `, [DISTRICT_ID, HS, david.id, ADMIN_USER_ID, offenseLookup['DRUG-01']]);

  // Create chain — fully approved
  const { rows: [chainA] } = await q(`
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
      requires_sped, requires_504, chain_status, current_step, completed_at)
    VALUES ($1, $2, $3, $4, false, false, 'approved', NULL, now())
    RETURNING id
  `, [DISTRICT_ID, incA.id, david.id, ADMIN_USER_ID]);
  await q('UPDATE incidents SET approval_chain_id = $1 WHERE id = $2', [chainA.id, incA.id]);

  // All 6 steps approved (steps 3 & 4 skipped since non-SPED/504)
  const stepsA = [
    [chainA.id, DISTRICT_ID, 'cbc', 1, 'Campus Behavior Coordinator', false, true, 'approved', cbcId, '2026-01-05 11:00', 'Reviewed referral packet. Student has no prior behavioral issues. DAEP placement warranted per policy.'],
    [chainA.id, DISTRICT_ID, 'counselor', 2, 'Counselor', false, true, 'approved', counselorId, '2026-01-05 13:00', 'Met with student. No counseling concerns that would prevent placement. Academic supports recommended.'],
    [chainA.id, DISTRICT_ID, 'sped_coordinator', 3, 'Special Education', true, false, 'skipped', null, null, null],
    [chainA.id, DISTRICT_ID, 'section_504_coordinator', 4, 'Section 504', true, false, 'skipped', null, null, null],
    [chainA.id, DISTRICT_ID, 'sss', 5, 'Student Support Specialist', false, true, 'approved', sssId, '2026-01-05 15:00', 'Transition plan prepared. Student support services in place for DAEP enrollment.'],
    [chainA.id, DISTRICT_ID, 'director_student_affairs', 6, 'Director of Student Affairs', false, true, 'approved', directorId, '2026-01-05 16:30', 'Reviewed full referral package. Placement approved. Orientation to be scheduled.'],
  ];
  for (const s of stepsA) {
    await q(`
      INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
        is_conditional, is_required, status, acted_by, acted_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, s);
  }

  // Create scheduling record (approved → orientation pending)
  await q(`
    INSERT INTO daep_placement_scheduling (district_id, incident_id, student_id,
      ard_required, ard_status, orientation_status, orientation_scheduled_date)
    VALUES ($1, $2, $3, false, 'pending', 'scheduled', '2026-01-08')
  `, [DISTRICT_ID, incA.id, david.id]);

  console.log('  ✓ Scenario A: David Nguyen — FULLY APPROVED (6/6 steps), orientation scheduled');

  // ---- SCENARIO B: Waiting at Step 3 (SPED review) — SPED student ----
  // Tyler Williams (LS-10003, SPED ED)
  const tyler = studentLookup['LS-10003'];
  const { rows: [incB] } = await q(`
    INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time,
      location, offense_code_id, description, consequence_type, consequence_days,
      consequence_start, consequence_end, status, notes)
    VALUES ($1, $2, $3, $4, '2026-02-03', '09:15', 'Classroom', $5,
      'Tyler was involved in a serious physical altercation in the classroom, causing injury to another student. SPED review required before DAEP placement can proceed.',
      'daep', 45, '2026-02-04', '2026-04-07', 'pending_approval',
      '[APPROVAL_FLOW_SEED] Pending at SPED coordinator step. CBC and Counselor approved.')
    RETURNING id
  `, [DISTRICT_ID, HS, tyler.id, ADMIN_USER_ID, offenseLookup['FIGHT-02']]);

  const { rows: [chainB] } = await q(`
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
      requires_sped, requires_504, chain_status, current_step)
    VALUES ($1, $2, $3, $4, true, false, 'in_progress', 'sped_coordinator')
    RETURNING id
  `, [DISTRICT_ID, incB.id, tyler.id, ADMIN_USER_ID]);
  await q('UPDATE incidents SET approval_chain_id = $1 WHERE id = $2', [chainB.id, incB.id]);

  const stepsB = [
    [chainB.id, DISTRICT_ID, 'cbc', 1, 'Campus Behavior Coordinator', false, true, 'approved', cbcId, '2026-02-03 10:00', 'SPED student with ED. Fight resulted in injury. DAEP referral appropriate per Code of Conduct. Recommend MDR coordination with SPED team.'],
    [chainB.id, DISTRICT_ID, 'counselor', 2, 'Counselor', false, true, 'approved', counselorId, '2026-02-03 11:30', 'Reviewed student history. Tyler has shown escalating behavior this semester. Transition supports will be critical.'],
    [chainB.id, DISTRICT_ID, 'sped_coordinator', 3, 'Special Education', true, true, 'waiting', null, null, null],
    [chainB.id, DISTRICT_ID, 'section_504_coordinator', 4, 'Section 504', true, false, 'skipped', null, null, null],
    [chainB.id, DISTRICT_ID, 'sss', 5, 'Student Support Specialist', false, true, 'pending', null, null, null],
    [chainB.id, DISTRICT_ID, 'director_student_affairs', 6, 'Director of Student Affairs', false, true, 'pending', null, null, null],
  ];
  for (const s of stepsB) {
    await q(`
      INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
        is_conditional, is_required, status, acted_by, acted_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, s);
  }
  console.log('  ✓ Scenario B: Tyler Williams (SPED) — PENDING at Step 3 (SPED Coordinator)');

  // ---- SCENARIO C: Waiting at Step 6 (Director) — 504 student ----
  // Aaliyah Brown (LS-10004, 504)
  const aaliyah = studentLookup['LS-10004'];
  const { rows: [incC] } = await q(`
    INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time,
      location, offense_code_id, description, consequence_type, consequence_days,
      consequence_start, consequence_end, status, notes)
    VALUES ($1, $2, $3, $4, '2026-02-01', '14:00', 'Restroom', $5,
      'Aaliyah was found in possession of a controlled substance. SRO report filed. 504 review completed. Awaiting final Director approval.',
      'daep', 30, '2026-02-03', '2026-03-19', 'pending_approval',
      '[APPROVAL_FLOW_SEED] All 5 departmental steps approved. Awaiting Director of Student Affairs final approval.')
    RETURNING id
  `, [DISTRICT_ID, HS, aaliyah.id, ADMIN_USER_ID, offenseLookup['DRUG-03']]);

  const { rows: [chainC] } = await q(`
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
      requires_sped, requires_504, chain_status, current_step)
    VALUES ($1, $2, $3, $4, false, true, 'in_progress', 'director_student_affairs')
    RETURNING id
  `, [DISTRICT_ID, incC.id, aaliyah.id, ADMIN_USER_ID]);
  await q('UPDATE incidents SET approval_chain_id = $1 WHERE id = $2', [chainC.id, incC.id]);

  const stepsC = [
    [chainC.id, DISTRICT_ID, 'cbc', 1, 'Campus Behavior Coordinator', false, true, 'approved', cbcId, '2026-02-01 14:30', 'Substance confirmed by SRO. Mandatory DAEP per district policy.'],
    [chainC.id, DISTRICT_ID, 'counselor', 2, 'Counselor', false, true, 'approved', counselorId, '2026-02-01 15:30', 'Student has 504 plan for ADHD. No contraindication to DAEP placement. Substance education recommended.'],
    [chainC.id, DISTRICT_ID, 'sped_coordinator', 3, 'Special Education', true, false, 'skipped', null, null, null],
    [chainC.id, DISTRICT_ID, 'section_504_coordinator', 4, 'Section 504', true, true, 'approved', coord504Id, '2026-02-02 09:00', '504 accommodations reviewed. ADHD accommodations can be provided at DAEP campus. No manifestation concern.'],
    [chainC.id, DISTRICT_ID, 'sss', 5, 'Student Support Specialist', false, true, 'approved', sssId, '2026-02-02 11:00', 'Transition supports identified. Substance abuse prevention program enrollment pending.'],
    [chainC.id, DISTRICT_ID, 'director_student_affairs', 6, 'Director of Student Affairs', false, true, 'waiting', null, null, null],
  ];
  for (const s of stepsC) {
    await q(`
      INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
        is_conditional, is_required, status, acted_by, acted_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, s);
  }
  console.log('  ✓ Scenario C: Aaliyah Brown (504) — PENDING at Step 6 (Director of Student Affairs)');

  // ---- SCENARIO D: Denied at Step 2 (Counselor) ----
  // Sofia Garcia (LS-10002, ELL, non-SPED)
  const sofia = studentLookup['LS-10002'];
  const { rows: [incD] } = await q(`
    INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time,
      location, offense_code_id, description, consequence_type, consequence_days,
      consequence_start, consequence_end, status, notes)
    VALUES ($1, $2, $3, $4, '2026-01-28', '11:45', 'Hallway', $5,
      'Sofia was reported for persistent verbal harassment of another student. Referral submitted for DAEP.',
      'daep', 30, '2026-01-29', '2026-03-13', 'denied',
      '[APPROVAL_FLOW_SEED] Denied by counselor. Counselor determined alternative interventions more appropriate.')
    RETURNING id
  `, [DISTRICT_ID, HS, sofia.id, ADMIN_USER_ID, offenseLookup['HARASS-01']]);

  const { rows: [chainD] } = await q(`
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
      requires_sped, requires_504, chain_status, current_step,
      denied_by, denied_at, denied_reason)
    VALUES ($1, $2, $3, $4, false, false, 'denied', NULL,
      $5, '2026-01-28 13:00', 'DAEP placement is disproportionate for this offense level. Recommend ISS with restorative conference instead.')
    RETURNING id
  `, [DISTRICT_ID, incD.id, sofia.id, ADMIN_USER_ID, counselorId]);
  await q('UPDATE incidents SET approval_chain_id = $1 WHERE id = $2', [chainD.id, incD.id]);

  const stepsD = [
    [chainD.id, DISTRICT_ID, 'cbc', 1, 'Campus Behavior Coordinator', false, true, 'approved', cbcId, '2026-01-28 12:00', 'Referral packet complete. Recommending DAEP based on severity of harassment.'],
    [chainD.id, DISTRICT_ID, 'counselor', 2, 'Counselor', false, true, 'denied', counselorId, '2026-01-28 13:00', 'DAEP placement is disproportionate for this offense level. Sofia is an ELL student adjusting to new school. Recommend ISS with restorative conference instead.'],
    [chainD.id, DISTRICT_ID, 'sped_coordinator', 3, 'Special Education', true, false, 'skipped', null, null, null],
    [chainD.id, DISTRICT_ID, 'section_504_coordinator', 4, 'Section 504', true, false, 'skipped', null, null, null],
    [chainD.id, DISTRICT_ID, 'sss', 5, 'Student Support Specialist', false, true, 'pending', null, null, null],
    [chainD.id, DISTRICT_ID, 'director_student_affairs', 6, 'Director of Student Affairs', false, true, 'pending', null, null, null],
  ];
  for (const s of stepsD) {
    await q(`
      INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
        is_conditional, is_required, status, acted_by, acted_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, s);
  }
  console.log('  ✓ Scenario D: Sofia Garcia (ELL) — DENIED at Step 2 (Counselor)');

  // ---- SCENARIO E: Returned for revision at Step 5 (SSS) ----
  // Carlos Hernandez (LS-20004, MS, ELL)
  const carlos = studentLookup['LS-20004'];
  const { rows: [incE] } = await q(`
    INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time,
      location, offense_code_id, description, consequence_type, consequence_days,
      consequence_start, consequence_end, status, notes)
    VALUES ($1, $2, $3, $4, '2026-02-05', '08:30', 'Online/Virtual', $5,
      'Carlos posted threatening messages on social media targeting multiple students. Third cyberbullying incident this year.',
      'daep', 30, '2026-02-06', '2026-03-20', 'returned',
      '[APPROVAL_FLOW_SEED] Returned by SSS — missing transition plan documentation.')
    RETURNING id
  `, [DISTRICT_ID, MS, carlos.id, ADMIN_USER_ID, offenseLookup['BULLY-02']]);

  const { rows: [chainE] } = await q(`
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
      requires_sped, requires_504, chain_status, current_step,
      returned_by, returned_at, return_reason)
    VALUES ($1, $2, $3, $4, false, false, 'returned', NULL,
      $5, '2026-02-06 10:00', 'Transition plan is incomplete — missing academic supports and ELL accommodations. Please revise and resubmit.')
    RETURNING id
  `, [DISTRICT_ID, incE.id, carlos.id, ADMIN_USER_ID, msSssId]);
  await q('UPDATE incidents SET approval_chain_id = $1 WHERE id = $2', [chainE.id, incE.id]);

  const stepsE = [
    [chainE.id, DISTRICT_ID, 'cbc', 1, 'Campus Behavior Coordinator', false, true, 'pending', null, null, null],
    [chainE.id, DISTRICT_ID, 'counselor', 2, 'Counselor', false, true, 'pending', null, null, null],
    [chainE.id, DISTRICT_ID, 'sped_coordinator', 3, 'Special Education', true, false, 'skipped', null, null, null],
    [chainE.id, DISTRICT_ID, 'section_504_coordinator', 4, 'Section 504', true, false, 'skipped', null, null, null],
    [chainE.id, DISTRICT_ID, 'sss', 5, 'Student Support Specialist', false, true, 'returned', msSssId, '2026-02-06 10:00', 'Transition plan is incomplete — missing academic supports and ELL accommodations. Please revise and resubmit.'],
    [chainE.id, DISTRICT_ID, 'director_student_affairs', 6, 'Director of Student Affairs', false, true, 'pending', null, null, null],
  ];
  for (const s of stepsE) {
    await q(`
      INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
        is_conditional, is_required, status, acted_by, acted_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, s);
  }
  console.log('  ✓ Scenario E: Carlos Hernandez (ELL) — RETURNED by SSS for revision');

  // ---- SCENARIO F: Waiting at Step 1 (CBC) — Just submitted, SPED student ----
  // Emily Martinez (LS-10006, SPED LD)
  const emily = studentLookup['LS-10006'];
  const { rows: [incF] } = await q(`
    INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time,
      location, offense_code_id, description, consequence_type, consequence_days,
      consequence_start, consequence_end, status, notes)
    VALUES ($1, $2, $3, $4, '2026-02-14', '13:00', 'Cafeteria', $5,
      'Emily was involved in a serious physical altercation in the cafeteria resulting in another student being taken to the nurse. SPED (LD) — will require MDR.',
      'daep', 30, '2026-02-17', '2026-04-01', 'pending_approval',
      '[APPROVAL_FLOW_SEED] Just submitted. Waiting for CBC initial review. SPED student requires steps 1-3,5,6.')
    RETURNING id
  `, [DISTRICT_ID, HS, emily.id, ADMIN_USER_ID, offenseLookup['FIGHT-02']]);

  const { rows: [chainF] } = await q(`
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
      requires_sped, requires_504, chain_status, current_step)
    VALUES ($1, $2, $3, $4, true, false, 'in_progress', 'cbc')
    RETURNING id
  `, [DISTRICT_ID, incF.id, emily.id, ADMIN_USER_ID]);
  await q('UPDATE incidents SET approval_chain_id = $1 WHERE id = $2', [chainF.id, incF.id]);

  const stepsF = [
    [chainF.id, DISTRICT_ID, 'cbc', 1, 'Campus Behavior Coordinator', false, true, 'waiting', null, null, null],
    [chainF.id, DISTRICT_ID, 'counselor', 2, 'Counselor', false, true, 'pending', null, null, null],
    [chainF.id, DISTRICT_ID, 'sped_coordinator', 3, 'Special Education', true, true, 'pending', null, null, null],
    [chainF.id, DISTRICT_ID, 'section_504_coordinator', 4, 'Section 504', true, false, 'skipped', null, null, null],
    [chainF.id, DISTRICT_ID, 'sss', 5, 'Student Support Specialist', false, true, 'pending', null, null, null],
    [chainF.id, DISTRICT_ID, 'director_student_affairs', 6, 'Director of Student Affairs', false, true, 'pending', null, null, null],
  ];
  for (const s of stepsF) {
    await q(`
      INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
        is_conditional, is_required, status, acted_by, acted_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, s);
  }
  console.log('  ✓ Scenario F: Emily Martinez (SPED) — PENDING at Step 1 (CBC), just submitted');

  // ---- SCENARIO G: Approved with ARD + Orientation scheduling — SPED student ----
  // DeShawn Jackson (LS-20006, SPED OHI, MS)
  const deshawn = studentLookup['LS-20006'];
  const { rows: [incG] } = await q(`
    INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time,
      location, offense_code_id, description, consequence_type, consequence_days,
      consequence_start, consequence_end, status, notes)
    VALUES ($1, $2, $3, $4, '2026-01-20', '11:00', 'Gymnasium', $5,
      'DeShawn was involved in a physical altercation during PE resulting in injury. SPED (OHI) student. Full approval chain completed. ARD and orientation scheduling required.',
      'daep', 30, '2026-01-21', '2026-03-05', 'approved',
      '[APPROVAL_FLOW_SEED] Fully approved SPED student. ARD required + orientation. Shows scheduling in progress.')
    RETURNING id
  `, [DISTRICT_ID, MS, deshawn.id, ADMIN_USER_ID, offenseLookup['FIGHT-02']]);

  const { rows: [chainG] } = await q(`
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
      requires_sped, requires_504, chain_status, current_step, completed_at)
    VALUES ($1, $2, $3, $4, true, false, 'approved', NULL, '2026-01-21 16:00')
    RETURNING id
  `, [DISTRICT_ID, incG.id, deshawn.id, ADMIN_USER_ID]);
  await q('UPDATE incidents SET approval_chain_id = $1 WHERE id = $2', [chainG.id, incG.id]);

  // Look up MS counselor ID
  const { rows: msCounselorRows } = await q("SELECT id FROM profiles WHERE email = 'ms-counselor@lonestar-isd.org'");
  const msCounselorId = msCounselorRows[0]?.id || counselorId;

  // Look up MS SPED coordinator ID
  const { rows: msSpedRows } = await q("SELECT id FROM profiles WHERE email = 'sped-coord@lonestar-isd.org'");
  const msSpedId = msSpedRows[0]?.id || spedId;

  const stepsG = [
    [chainG.id, DISTRICT_ID, 'cbc', 1, 'Campus Behavior Coordinator', false, true, 'approved', msCbcId, '2026-01-20 12:00', 'Referral reviewed. Fight resulted in minor injury. DAEP placement per Code of Conduct.'],
    [chainG.id, DISTRICT_ID, 'counselor', 2, 'Counselor', false, true, 'approved', msCounselorId, '2026-01-20 14:00', 'Student has OHI diagnosis (ADHD). Counseling supports to continue at DAEP campus.'],
    [chainG.id, DISTRICT_ID, 'sped_coordinator', 3, 'Special Education', true, true, 'approved', msSpedId, '2026-01-21 09:00', 'ARD committee reviewed. Behavior is not a manifestation of disability. Change of Placement ARD must be held before enrollment. FAPE will be maintained.'],
    [chainG.id, DISTRICT_ID, 'section_504_coordinator', 4, 'Section 504', true, false, 'skipped', null, null, null],
    [chainG.id, DISTRICT_ID, 'sss', 5, 'Student Support Specialist', false, true, 'approved', msSssId, '2026-01-21 11:00', 'Transition plan finalized. Support services arranged at DAEP campus.'],
    [chainG.id, DISTRICT_ID, 'director_student_affairs', 6, 'Director of Student Affairs', false, true, 'approved', directorId, '2026-01-21 16:00', 'Full review completed. Placement approved. Ensure ARD is held before student begins at DAEP.'],
  ];
  for (const s of stepsG) {
    await q(`
      INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
        is_conditional, is_required, status, acted_by, acted_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, s);
  }

  // Create scheduling record — ARD scheduled, orientation pending
  await q(`
    INSERT INTO daep_placement_scheduling (district_id, incident_id, student_id,
      ard_required, ard_scheduled_date, ard_status, ard_notes,
      orientation_status)
    VALUES ($1, $2, $3, true, '2026-02-10', 'scheduled',
      'Change of Placement ARD scheduled with parent, SPED coordinator, and campus admin.',
      'pending')
  `, [DISTRICT_ID, incG.id, deshawn.id]);

  console.log('  ✓ Scenario G: DeShawn Jackson (SPED) — APPROVED, ARD scheduled, orientation pending');

  // ---- SCENARIO H: Approved with both ARD completed and orientation completed ----
  // Marcus Johnson (LS-10001, non-SPED) — another DAEP with orientation done
  const marcus = studentLookup['LS-10001'];
  const { rows: [incH] } = await q(`
    INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time,
      location, offense_code_id, description, consequence_type, consequence_days,
      consequence_start, consequence_end, status, notes)
    VALUES ($1, $2, $3, $4, '2025-12-15', '10:00', 'Hallway', $5,
      'Marcus was involved in another serious altercation. Escalating pattern of behavior. Full DAEP referral with all approvals completed. Orientation done, student enrolled.',
      'daep', 45, '2025-12-16', '2026-02-21', 'approved',
      '[APPROVAL_FLOW_SEED] Fully approved, orientation completed. Ready for activation.')
    RETURNING id
  `, [DISTRICT_ID, HS, marcus.id, ADMIN_USER_ID, offenseLookup['FIGHT-02']]);

  const { rows: [chainH] } = await q(`
    INSERT INTO daep_approval_chains (district_id, incident_id, student_id, submitted_by,
      requires_sped, requires_504, chain_status, current_step, completed_at)
    VALUES ($1, $2, $3, $4, false, false, 'approved', NULL, '2025-12-15 16:00')
    RETURNING id
  `, [DISTRICT_ID, incH.id, marcus.id, ADMIN_USER_ID]);
  await q('UPDATE incidents SET approval_chain_id = $1 WHERE id = $2', [chainH.id, incH.id]);

  const stepsH = [
    [chainH.id, DISTRICT_ID, 'cbc', 1, 'Campus Behavior Coordinator', false, true, 'approved', cbcId, '2025-12-15 10:30', 'Third major fighting incident. DAEP is appropriate escalation.'],
    [chainH.id, DISTRICT_ID, 'counselor', 2, 'Counselor', false, true, 'approved', counselorId, '2025-12-15 11:30', 'Pattern of escalation documented. Student has been receiving behavioral interventions.'],
    [chainH.id, DISTRICT_ID, 'sped_coordinator', 3, 'Special Education', true, false, 'skipped', null, null, null],
    [chainH.id, DISTRICT_ID, 'section_504_coordinator', 4, 'Section 504', true, false, 'skipped', null, null, null],
    [chainH.id, DISTRICT_ID, 'sss', 5, 'Student Support Specialist', false, true, 'approved', sssId, '2025-12-15 14:00', 'Comprehensive transition plan with anger management and mentoring supports.'],
    [chainH.id, DISTRICT_ID, 'director_student_affairs', 6, 'Director of Student Affairs', false, true, 'approved', directorId, '2025-12-15 16:00', 'Approved. This student needs intensive behavioral support at DAEP.'],
  ];
  for (const s of stepsH) {
    await q(`
      INSERT INTO daep_approval_steps (chain_id, district_id, step_role, step_order, step_label,
        is_conditional, is_required, status, acted_by, acted_at, comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, s);
  }

  // Scheduling — orientation completed
  await q(`
    INSERT INTO daep_placement_scheduling (district_id, incident_id, student_id,
      ard_required, orientation_status, orientation_scheduled_date, orientation_completed_date)
    VALUES ($1, $2, $3, false, 'completed', '2025-12-16', '2025-12-16')
  `, [DISTRICT_ID, incH.id, marcus.id]);

  console.log('  ✓ Scenario H: Marcus Johnson — APPROVED, orientation completed, ready for activation');

  console.log('');

  // =============================================
  // 6. Re-enable triggers
  // =============================================
  console.log('Re-enabling triggers...');
  await q('ALTER TABLE incidents ENABLE TRIGGER trg_create_daep_approval_chain');
  await q('ALTER TABLE incidents ENABLE TRIGGER trg_check_sped_compliance');
  await q('ALTER TABLE incidents ENABLE TRIGGER trg_check_repeat_offender');
  try {
    await q('ALTER TABLE incidents ENABLE TRIGGER trg_create_daep_scheduling');
  } catch (e) { /* trigger may not exist yet */ }
  console.log('  ✓ Triggers re-enabled\n');

  // =============================================
  // 7. Verify
  // =============================================
  console.log('Verifying approval flow data...');
  const { rows: chainCount } = await q('SELECT COUNT(*) as c FROM daep_approval_chains WHERE district_id = $1', [DISTRICT_ID]);
  const { rows: stepCount } = await q('SELECT COUNT(*) as c FROM daep_approval_steps WHERE district_id = $1', [DISTRICT_ID]);
  const { rows: schedCount } = await q('SELECT COUNT(*) as c FROM daep_placement_scheduling WHERE district_id = $1', [DISTRICT_ID]);
  console.log(`  Approval chains: ${chainCount[0].c}`);
  console.log(`  Approval steps:  ${stepCount[0].c}`);
  console.log(`  Scheduling records: ${schedCount[0].c}`);

  await client.end();

  console.log('\n========================================');
  console.log('  APPROVAL FLOW DEMO DATA CREATED');
  console.log('========================================\n');
  console.log('  SCENARIOS:');
  console.log('  A) David Nguyen      — Fully Approved (6/6), orientation scheduled');
  console.log('  B) Tyler Williams    — Pending at Step 3 (SPED Coordinator) [SPED]');
  console.log('  C) Aaliyah Brown     — Pending at Step 6 (Director) [504]');
  console.log('  D) Sofia Garcia      — Denied at Step 2 (Counselor) [ELL]');
  console.log('  E) Carlos Hernandez  — Returned by SSS for revision [ELL]');
  console.log('  F) Emily Martinez    — Just submitted, Step 1 (CBC) [SPED]');
  console.log('  G) DeShawn Jackson   — Approved, ARD scheduled, orientation pending [SPED]');
  console.log('  H) Marcus Johnson    — Approved, orientation completed');
  console.log('');
  console.log('  NEW STAFF ACCOUNTS (Password: Password123!):');
  console.log('  hs-cbc@lonestar-isd.org           CBC (High School)');
  console.log('  hs-counselor@lonestar-isd.org      Counselor (High School)');
  console.log('  hs-sped@lonestar-isd.org           SPED Coordinator (High School)');
  console.log('  hs-504@lonestar-isd.org            504 Coordinator (High School)');
  console.log('  sss@lonestar-isd.org               Student Support Specialist');
  console.log('  director@lonestar-isd.org          Director of Student Affairs');
  console.log('  ms-cbc@lonestar-isd.org            CBC (Middle School)');
  console.log('  ms-sss@lonestar-isd.org            SSS (Middle School)');
  console.log('');
}

run().catch(async err => {
  console.error('Fatal error:', err.message);
  console.error('Detail:', err.detail || '');
  try { await client.end(); } catch {}
  process.exit(1);
});
