// Seed polished demo data for B-roll video recording
//
// What this does:
//   1. Activates 3 DAEP incidents (Marcus Johnson, David Nguyen, DeShawn Jackson)
//   2. Creates transition_plans with 30/60/90-day review dates
//   3. Seeds 3 weeks of daily_behavior_tracking for active students
//   4. Creates a parent auth user (parent.marcus@gmail.com) for the parent portal
//
// Prerequisites:
//   - seed_approval_flow.mjs already executed
//
// Usage (PowerShell):
//   $env:SUPABASE_DB_PASSWORD="your-password"
//   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
//   node supabase/seed_demo_video.mjs

import pg from 'pg';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD  = process.env.SUPABASE_DB_PASSWORD;

if (!SERVICE_KEY || !DB_PASSWORD) {
  console.error('Missing required environment variables:');
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="your-key"');
  console.error('  $env:SUPABASE_DB_PASSWORD="your-password"');
  process.exit(1);
}

const DB_HOST     = process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co';
const DISTRICT_ID = '11111111-1111-1111-1111-111111111111';
const HS          = 'aaaa0001-0001-0001-0001-000000000001';
const MS          = 'aaaa0001-0001-0001-0001-000000000002';
const ADMIN_ID    = '1f2defa0-8f23-4173-9b55-01380cd0a836';

const client = new pg.Client({
  host: DB_HOST, port: 5432, database: 'postgres', user: 'postgres',
  password: DB_PASSWORD, ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const q = (sql, p = []) => client.query(sql, p);

// ─── Create or retrieve an auth user via Supabase Admin API ──────────────────
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
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: fullName, role, district_id: DISTRICT_ID },
    }),
  });
  const data = await res.json();
  if (data.id) return data.id;

  // Already exists — find by listing users
  if (data.msg?.includes('already') || data.message?.includes('already')) {
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    });
    const listData = await listRes.json();
    const users = listData.users || listData;
    const existing = users.find(u => u.email === email);
    if (existing) return existing.id;
  }

  throw new Error(`Failed to create/find user ${email}: ${JSON.stringify(data)}`);
}

// ─── Generate weekday date strings between two dates ─────────────────────────
function weekdays(startDate, endDate) {
  const days = [];
  for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow > 0 && dow < 6) days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ─── Clamp a value between min and max ───────────────────────────────────────
const clamp = (v, min, max) => Math.min(max, Math.max(min, Math.round(v)));

async function run() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!\n');

  // ─── 1. Look up student UUIDs ─────────────────────────────────────────────
  console.log('Looking up students...');
  const { rows: studentRows } = await q(`
    SELECT id, student_id_number FROM students
    WHERE student_id_number IN ('LS-10001', 'LS-10005', 'LS-20006')
    AND district_id = $1
  `, [DISTRICT_ID]);

  const studentMap = {};
  for (const r of studentRows) studentMap[r.student_id_number] = r.id;

  const MARCUS_ID  = studentMap['LS-10001'];
  const DAVID_ID   = studentMap['LS-10005'];
  const DESHAWN_ID = studentMap['LS-20006'];

  if (!MARCUS_ID || !DAVID_ID || !DESHAWN_ID) {
    console.error('ERROR: Could not find all 3 students. Run seed_approval_flow.mjs first.');
    process.exit(1);
  }
  console.log(`  ✓ Marcus Johnson  (LS-10001): ${MARCUS_ID}`);
  console.log(`  ✓ David Nguyen    (LS-10005): ${DAVID_ID}`);
  console.log(`  ✓ DeShawn Jackson (LS-20006): ${DESHAWN_ID}\n`);

  // ─── 2. Look up incidents created by the approval flow seed ──────────────
  console.log('Looking up approval-flow incidents...');
  const { rows: incRows } = await q(`
    SELECT id, student_id, campus_id, consequence_start, consequence_end
    FROM incidents
    WHERE student_id IN ($1, $2, $3)
      AND district_id = $4
      AND notes LIKE '%[APPROVAL_FLOW_SEED]%'
    ORDER BY incident_date DESC
  `, [MARCUS_ID, DAVID_ID, DESHAWN_ID, DISTRICT_ID]);

  // Take the most recent incident per student
  const incMap = {};
  for (const r of incRows) {
    if (!incMap[r.student_id]) incMap[r.student_id] = r;
  }

  const marcusInc  = incMap[MARCUS_ID];
  const davidInc   = incMap[DAVID_ID];
  const deshawnInc = incMap[DESHAWN_ID];

  if (!marcusInc || !davidInc || !deshawnInc) {
    console.error('ERROR: Missing incidents. Run seed_approval_flow.mjs first.');
    process.exit(1);
  }
  console.log(`  ✓ Marcus incident:  ${marcusInc.id} (campus: HS)`);
  console.log(`  ✓ David incident:   ${davidInc.id} (campus: HS)`);
  console.log(`  ✓ DeShawn incident: ${deshawnInc.id} (campus: MS)\n`);

  // ─── 3. Disable app-level triggers (not system FK triggers) ──────────────
  console.log('Disabling triggers...');
  const appTriggers = [
    'trg_create_daep_approval_chain',
    'trg_check_sped_compliance',
    'trg_check_repeat_offender',
    'trg_resolve_placement_started_activation',
    'trg_orientation_missed_alert',
    'trg_create_daep_scheduling',
  ];
  for (const t of appTriggers) {
    try { await q(`ALTER TABLE incidents DISABLE TRIGGER ${t}`); }
    catch { /* trigger may not exist — skip */ }
  }
  // Disable the behavior-tracking alert trigger (resolves placement_not_started alerts)
  try { await q('ALTER TABLE daily_behavior_tracking DISABLE TRIGGER trg_resolve_placement_started_tracking'); }
  catch { /* may not exist */ }
  console.log('  ✓ App triggers disabled\n');

  // ─── 4. Activate incidents ────────────────────────────────────────────────
  console.log('Activating DAEP incidents...');
  await q(`UPDATE incidents SET status = 'active' WHERE id = $1`, [marcusInc.id]);
  await q(`UPDATE incidents SET status = 'active' WHERE id = $1`, [davidInc.id]);
  await q(`UPDATE incidents SET status = 'active' WHERE id = $1`, [deshawnInc.id]);
  console.log('  ✓ Marcus Johnson  → active');
  console.log('  ✓ David Nguyen    → active');
  console.log('  ✓ DeShawn Jackson → active\n');

  // ─── 5. Create transition plans ───────────────────────────────────────────
  console.log('Creating transition plans...');

  // Delete any pre-existing plans for these incidents so we can re-insert cleanly
  const { rows: existingPlans } = await q(`
    SELECT id FROM transition_plans
    WHERE incident_id IN ($1, $2, $3) AND district_id = $4
  `, [marcusInc.id, davidInc.id, deshawnInc.id, DISTRICT_ID]);

  if (existingPlans.length > 0) {
    const planIds = existingPlans.map(r => r.id);
    // Null out incident references to plans first
    await q(`UPDATE incidents SET transition_plan_id = NULL WHERE transition_plan_id = ANY($1)`, [planIds]);
    await q(`DELETE FROM transition_plans WHERE id = ANY($1)`, [planIds]);
    console.log(`  Cleaned ${existingPlans.length} existing plan(s)`);
  }

  // Marcus Johnson — 45-day placement, Dec 16 start
  //   30-day: Jan 15  60-day: Feb 14  90-day: Mar 16
  const { rows: [tpMarcus] } = await q(`
    INSERT INTO transition_plans (
      district_id, student_id, incident_id,
      plan_type, offense_category,
      behavioral_supports, academic_supports,
      start_date, end_date,
      review_30_date, review_60_date, review_90_date,
      status, created_by
    ) VALUES (
      $1, $2, $3,
      'daep_entry', 'assault',
      $4::jsonb, $5::jsonb,
      '2025-12-16', '2026-02-21',
      '2026-01-15', '2026-02-14', '2026-03-16',
      'active', $6
    ) RETURNING id
  `, [
    DISTRICT_ID, MARCUS_ID, marcusInc.id,
    JSON.stringify([
      { type: 'Anger Management', provider: 'Campus Counselor', frequency: 'weekly' },
      { type: 'Peer Mentoring', provider: 'DAEP Staff', frequency: 'daily' },
      { type: 'Individual Counseling', provider: 'Campus Counselor', frequency: 'biweekly' },
    ]),
    JSON.stringify([
      { type: 'Math Tutoring', provider: 'DAEP Teacher', frequency: 'daily' },
      { type: 'Reading Support', provider: 'DAEP Teacher', frequency: 'daily' },
      { type: 'Credit Recovery', provider: 'DAEP Campus', frequency: 'ongoing' },
    ]),
    ADMIN_ID,
  ]);
  await q(`UPDATE incidents SET transition_plan_id = $1 WHERE id = $2`, [tpMarcus.id, marcusInc.id]);
  console.log('  ✓ Marcus — 30-day: Jan 15 | 60-day: Feb 14 | 90-day: Mar 16');

  // David Nguyen — 30-day placement, Jan 6 start
  //   30-day: Feb 5   60-day: Mar 7
  const { rows: [tpDavid] } = await q(`
    INSERT INTO transition_plans (
      district_id, student_id, incident_id,
      plan_type, offense_category,
      behavioral_supports, academic_supports,
      start_date, end_date,
      review_30_date, review_60_date,
      status, created_by
    ) VALUES (
      $1, $2, $3,
      'daep_entry', 'drugs',
      $4::jsonb, $5::jsonb,
      '2026-01-06', '2026-02-18',
      '2026-02-05', '2026-03-07',
      'active', $6
    ) RETURNING id
  `, [
    DISTRICT_ID, DAVID_ID, davidInc.id,
    JSON.stringify([
      { type: 'Substance Abuse Education', provider: 'DAEP Counselor', frequency: 'weekly' },
      { type: 'Individual Counseling', provider: 'Campus Counselor', frequency: 'biweekly' },
    ]),
    JSON.stringify([
      { type: 'Credit Recovery', provider: 'DAEP Campus', frequency: 'ongoing' },
      { type: 'ESL/ELL Support', provider: 'DAEP Teacher', frequency: 'daily' },
    ]),
    ADMIN_ID,
  ]);
  await q(`UPDATE incidents SET transition_plan_id = $1 WHERE id = $2`, [tpDavid.id, davidInc.id]);
  console.log('  ✓ David  — 30-day: Feb 5  | 60-day: Mar 7');

  // DeShawn Jackson — 30-day placement, Jan 21 start
  //   30-day: Feb 20  60-day: Mar 22
  const { rows: [tpDeShawn] } = await q(`
    INSERT INTO transition_plans (
      district_id, student_id, incident_id,
      plan_type, offense_category,
      behavioral_supports, academic_supports,
      start_date, end_date,
      review_30_date, review_60_date,
      status, created_by
    ) VALUES (
      $1, $2, $3,
      'daep_entry', 'assault',
      $4::jsonb, $5::jsonb,
      '2026-01-21', '2026-03-05',
      '2026-02-20', '2026-03-22',
      'active', $6
    ) RETURNING id
  `, [
    DISTRICT_ID, DESHAWN_ID, deshawnInc.id,
    JSON.stringify([
      { type: 'Conflict Resolution', provider: 'DAEP Counselor', frequency: 'weekly' },
      { type: 'Behavioral Intervention', provider: 'DAEP Staff', frequency: 'daily' },
      { type: 'Individual Counseling', provider: 'Campus Counselor', frequency: 'weekly' },
    ]),
    JSON.stringify([
      { type: 'PE Modification', provider: 'DAEP PE Teacher', frequency: 'daily' },
      { type: 'Credit Recovery', provider: 'DAEP Campus', frequency: 'ongoing' },
    ]),
    ADMIN_ID,
  ]);
  await q(`UPDATE incidents SET transition_plan_id = $1 WHERE id = $2`, [tpDeShawn.id, deshawnInc.id]);
  console.log('  ✓ DeShawn — 30-day: Feb 20 | 60-day: Mar 22\n');

  // ─── 6. Daily behavior tracking — 3 weeks (Feb 2 – Feb 27) ───────────────
  console.log('Seeding behavior tracking data...');

  // Remove any existing entries for these 3 students in the date range
  await q(`
    DELETE FROM daily_behavior_tracking
    WHERE student_id IN ($1, $2, $3) AND district_id = $4
      AND tracking_date BETWEEN '2026-02-02' AND '2026-02-27'
  `, [MARCUS_ID, DAVID_ID, DESHAWN_ID, DISTRICT_ID]);

  const trackDays = weekdays('2026-02-02', '2026-02-27');
  const n = trackDays.length;

  // Marcus — improving trajectory: starts ~60, reaches ~88 by end. Goal: 80.
  for (let i = 0; i < n; i++) {
    const progress = i / Math.max(n - 1, 1);
    const base = 59 + progress * 30 + (Math.random() * 8 - 4);
    const daily_total = clamp(base, 40, 100);
    const daily_goal  = 80;
    const scores = Array.from({ length: 8 }, (_, p) =>
      ({ period: p + 1, score: clamp(daily_total / 8 + (Math.random() * 4 - 2), 0, 15) })
    );
    await q(`
      INSERT INTO daily_behavior_tracking
        (district_id, campus_id, student_id, tracking_date,
         checked_in, behavior_scores, daily_total, daily_goal, goal_met)
      VALUES ($1, $2, $3, $4, true, $5::jsonb, $6, $7, $8)
      ON CONFLICT (student_id, tracking_date) DO UPDATE SET
        daily_total = EXCLUDED.daily_total,
        daily_goal  = EXCLUDED.daily_goal,
        goal_met    = EXCLUDED.goal_met,
        behavior_scores = EXCLUDED.behavior_scores
    `, [DISTRICT_ID, HS, MARCUS_ID, trackDays[i],
        JSON.stringify(scores), daily_total, daily_goal, daily_total >= daily_goal]);
  }
  console.log(`  ✓ Marcus  — ${n} days, improving trajectory (goal 80, ending ~88)`);

  // David — steady/strong, mostly above goal. Goal: 75.
  for (let i = 0; i < n; i++) {
    const base = 76 + (Math.random() * 16 - 5);
    const daily_total = clamp(base, 50, 100);
    const daily_goal  = 75;
    const scores = Array.from({ length: 8 }, (_, p) =>
      ({ period: p + 1, score: clamp(daily_total / 8 + (Math.random() * 3 - 1), 0, 15) })
    );
    await q(`
      INSERT INTO daily_behavior_tracking
        (district_id, campus_id, student_id, tracking_date,
         checked_in, behavior_scores, daily_total, daily_goal, goal_met)
      VALUES ($1, $2, $3, $4, true, $5::jsonb, $6, $7, $8)
      ON CONFLICT (student_id, tracking_date) DO UPDATE SET
        daily_total = EXCLUDED.daily_total,
        daily_goal  = EXCLUDED.daily_goal,
        goal_met    = EXCLUDED.goal_met,
        behavior_scores = EXCLUDED.behavior_scores
    `, [DISTRICT_ID, HS, DAVID_ID, trackDays[i],
        JSON.stringify(scores), daily_total, daily_goal, daily_total >= daily_goal]);
  }
  console.log(`  ✓ David   — ${n} days, steady above goal (goal 75, avg ~81)`);

  // DeShawn — strong, nearly always meets goal. Goal: 70.
  for (let i = 0; i < n; i++) {
    const base = 72 + (Math.random() * 22 - 4);
    const daily_total = clamp(base, 55, 100);
    const daily_goal  = 70;
    const scores = Array.from({ length: 8 }, (_, p) =>
      ({ period: p + 1, score: clamp(daily_total / 8 + (Math.random() * 4 - 2), 0, 15) })
    );
    await q(`
      INSERT INTO daily_behavior_tracking
        (district_id, campus_id, student_id, tracking_date,
         checked_in, behavior_scores, daily_total, daily_goal, goal_met)
      VALUES ($1, $2, $3, $4, true, $5::jsonb, $6, $7, $8)
      ON CONFLICT (student_id, tracking_date) DO UPDATE SET
        daily_total = EXCLUDED.daily_total,
        daily_goal  = EXCLUDED.daily_goal,
        goal_met    = EXCLUDED.goal_met,
        behavior_scores = EXCLUDED.behavior_scores
    `, [DISTRICT_ID, MS, DESHAWN_ID, trackDays[i],
        JSON.stringify(scores), daily_total, daily_goal, daily_total >= daily_goal]);
  }
  console.log(`  ✓ DeShawn — ${n} days, strong performance (goal 70, avg ~84)\n`);

  // ─── 7. Re-enable app-level triggers ─────────────────────────────────────
  console.log('Re-enabling triggers...');
  for (const t of appTriggers) {
    try { await q(`ALTER TABLE incidents ENABLE TRIGGER ${t}`); }
    catch { /* skip if didn't exist */ }
  }
  try { await q('ALTER TABLE daily_behavior_tracking ENABLE TRIGGER trg_resolve_placement_started_tracking'); }
  catch { /* skip if didn't exist */ }
  console.log('  ✓ App triggers re-enabled\n');

  // ─── 8. Parent portal account for Marcus Johnson ──────────────────────────
  console.log('Creating parent portal account...');
  const PARENT_EMAIL = 'parent.marcus@gmail.com';
  const PARENT_NAME  = 'Sandra Johnson';

  const parentAuthId = await createAuthUser(PARENT_EMAIL, PARENT_NAME, 'parent');

  // Profile record
  await q(`
    INSERT INTO profiles (id, district_id, email, full_name, role)
    VALUES ($1, $2, $3, $4, 'parent')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name
  `, [parentAuthId, DISTRICT_ID, PARENT_EMAIL, PARENT_NAME]);

  // Guardian record — link to Marcus (delete any existing first, then insert)
  await q(`DELETE FROM student_guardians WHERE portal_user_id = $1`, [parentAuthId]);
  await q(`
    INSERT INTO student_guardians
      (district_id, student_id, portal_user_id, has_portal_access,
       guardian_name, relationship, email, is_primary)
    VALUES ($1, $2, $3, true, $4, 'mother', $5, true)
  `, [DISTRICT_ID, MARCUS_ID, parentAuthId, PARENT_NAME, PARENT_EMAIL]);

  console.log(`  ✓ ${PARENT_NAME} <${PARENT_EMAIL}>`);
  console.log(`  ✓ Password: Password123!`);
  console.log(`  ✓ Linked to: Marcus Johnson (LS-10001)\n`);

  // ─── 9. Verify ────────────────────────────────────────────────────────────
  console.log('Verifying...');
  const [actRes, tpRes, btRes, guardRes] = await Promise.all([
    q(`SELECT COUNT(*) AS c FROM incidents WHERE district_id=$1 AND status='active'`, [DISTRICT_ID]),
    q(`SELECT COUNT(*) AS c FROM transition_plans WHERE district_id=$1`, [DISTRICT_ID]),
    q(`SELECT COUNT(*) AS c FROM daily_behavior_tracking WHERE district_id=$1 AND student_id IN ($2,$3,$4)`,
      [DISTRICT_ID, MARCUS_ID, DAVID_ID, DESHAWN_ID]),
    q(`SELECT COUNT(*) AS c FROM student_guardians WHERE district_id=$1`, [DISTRICT_ID]),
  ]);
  console.log(`  Active incidents:       ${actRes.rows[0].c}`);
  console.log(`  Transition plans:       ${tpRes.rows[0].c}`);
  console.log(`  Behavior tracking days: ${btRes.rows[0].c} (for 3 video students)`);
  console.log(`  Student guardians:      ${guardRes.rows[0].c}`);

  await client.end();

  printShotGuide();
}

// ─── Shot guide printed after seeding ────────────────────────────────────────
function printShotGuide() {
  const L = (s = '') => console.log(s);
  L();
  L('═══════════════════════════════════════════════════════════════');
  L('  B-ROLL SHOT GUIDE — 7 CLIPS');
  L('═══════════════════════════════════════════════════════════════');
  L('  Staff login:  admin@lonestar-isd.org / Password123!');
  L('  Parent login: parent.marcus@gmail.com / Password123!');
  L('═══════════════════════════════════════════════════════════════');
  L();

  L('CLIP 1 — Waypoint Dashboard  (~10 sec)');
  L('  1. Log in as admin@lonestar-isd.org');
  L('  2. Navigate to /dashboard');
  L('  3. Let the page fully load');
  L('     → You should see 3 ACTIVE students in the DAEP enrollments table:');
  L('       Marcus Johnson, David Nguyen, DeShawn Jackson');
  L('  4. Slowly pan your cursor across the alert badges (top-right corner)');
  L('  5. Slowly scroll through the active enrollments table');
  L('  TIP: The table should show orientation status, days remaining, alert badges');
  L();

  L('CLIP 2 — New Incident Form  (~10 sec)');
  L('  1. Click "+ New Incident" (dashboard or sidebar)');
  L('  2. Select Campus: Lone Star High School');
  L('  3. Select Student: Marcus Johnson (start typing)');
  L('  4. Select Offense: FIGHT-02 — Physical Altercation');
  L('  5. Fill in Location: Hallway | Date: today');
  L('  6. Type 1–2 sentences of description (slow, deliberate keystrokes)');
  L('  7. STOP — do not submit. This is just the form-fill B-roll.');
  L('  TIP: Demonstrate the offense code dropdown populating automatically');
  L();

  L('CLIP 3 — Compliance Checklist auto-appearing  (~10 sec)');
  L('  OPTION A (recommended — shows live trigger):');
  L('    1. Submit the incident from Clip 2');
  L('    2. The app redirects to the new incident detail page');
  L('    3. Scroll down to the "Compliance Checklist" section');
  L('    4. It should already be populated with checklist items');
  L('    5. Hover over or check 1–2 items to show interactivity');
  L('    → Delete this test incident from the admin panel after recording');
  L('  OPTION B (use existing Marcus incident):');
  L('    1. From /dashboard → click Marcus Johnson\'s active incident row');
  L('    2. Scroll to the Compliance Checklist section');
  L('  TIP: Show items auto-populating with the correct TEC steps');
  L();

  L('CLIP 4 — SPED Hard-Block Modal  (~8 sec)');
  L('  1. Navigate to /incidents');
  L('  2. Find Tyler Williams (search or filter — he is LS-10003, SPED status)');
  L('  3. Open his incident detail');
  L('  4. The approval chain shows: Step 3 "SPED Coordinator" — WAITING');
  L('     → A red "SPED Review Required" banner should be visible');
  L('  5. If a button appears to advance the chain, click it');
  L('     → The hard-block modal fires: "Cannot proceed until manifestation');
  L('        determination is complete"');
  L('  TIP: Switch to full-screen presenter for voice-over on this moment');
  L();

  L('CLIP 5 — DAEP Dashboard: real-time view  (~12 sec)');
  L('  1. Navigate to /daep (DAEP Dashboard tab)');
  L('  2. The active enrollments table shows all 3 students');
  L('  3. Point at each student row and linger 1–2 seconds:');
  L('     Marcus Johnson  → Orientation: COMPLETED ✓, 90-day review: Mar 16');
  L('     David Nguyen    → Orientation: MISSED (amber alert), 30-day: Feb 5');
  L('     DeShawn Jackson → Orientation: PENDING, ARD: scheduled');
  L('  4. Hover over a "30-day" chip / countdown badge to trigger tooltip');
  L('  5. Scroll down to show any behavior score widgets');
  L('  TIP: Show the color-coded status badges — green/amber/red');
  L();

  L('CLIP 6 — Parent Portal  (~10 sec)');
  L('  1. Open a new private/incognito browser window');
  L('  2. Navigate to the app URL → log in as:');
  L('     parent.marcus@gmail.com / Password123!');
  L('  3. You land on the parent portal (/parent)');
  L('  4. Marcus Johnson\'s placement card is visible:');
  L('     → Placement dates, days remaining, behavior score');
  L('  5. Scroll down to the behavior score chart (3 weeks of data, improving line)');
  L('  TIP: Keep the scroll slow and deliberate — this is the warmth moment');
  L();

  L('CLIP 7 — Reports / PEIMS Export  (~8 sec)');
  L('  1. Navigate to /reports (back in the staff browser window)');
  L('  2. Select the "Discipline" or "PEIMS" tab');
  L('  3. Set date range: Jan 1, 2026 → Feb 28, 2026');
  L('  4. Click "Export PEIMS" (or "Download CSV") button');
  L('  5. Show the file downloading in the browser download bar');
  L('  TIP: Let the download bar animation fully play before cutting');
  L();

  L('═══════════════════════════════════════════════════════════════');
  L('  RECORDING TIPS');
  L('  • Resolution: 1920×1080. Browser at 100% zoom. Hide bookmarks bar.');
  L('  • Move mouse at least 2× slower than feels natural.');
  L('  • Pause 1 full second before and after every click.');
  L('  • Record each clip separately — easier to trim in HeyGen.');
  L('  • Raw record 2–3× longer than target; trim in post.');
  L('  • Use Chrome or Edge — smoothest rendering for screen recording.');
  L('═══════════════════════════════════════════════════════════════');
  L();
}

run().catch(async err => {
  console.error('\nFatal error:', err.message);
  if (err.detail) console.error('Detail:', err.detail);
  try { await client.end(); } catch {}
  process.exit(1);
});
