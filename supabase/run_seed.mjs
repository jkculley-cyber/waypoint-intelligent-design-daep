import pg from 'pg';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADMIN_USER_ID = '2a276f4c-b972-406a-a26a-1f2f0a7a6bf8';
const DISTRICT_ID = '11111111-1111-1111-1111-111111111111';
const HS = 'aaaa0001-0001-0001-0001-000000000001';
const MS = 'aaaa0001-0001-0001-0001-000000000002';
const EL = 'aaaa0001-0001-0001-0001-000000000003';
const DAEP = 'aaaa0001-0001-0001-0001-000000000004';

const client = new pg.Client({
  host: 'db.bbmolhntcrtcwouqoyse.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'CVw&-%.iE/6F84T',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function q(sql, params = []) {
  return client.query(sql, params);
}

async function run() {
  console.log('Connecting...');
  await client.connect();
  console.log('Connected!\n');

  // =============================================
  // CLEANUP previous partial runs
  // =============================================
  console.log('Cleaning up previous data...');
  await q('DELETE FROM student_interventions WHERE district_id = $1', [DISTRICT_ID]);
  await q('DELETE FROM transition_plan_reviews WHERE district_id = $1', [DISTRICT_ID]);
  await q('DELETE FROM transition_plans WHERE district_id = $1', [DISTRICT_ID]);
  await q('DELETE FROM compliance_checklists WHERE district_id = $1', [DISTRICT_ID]);
  await q('DELETE FROM alerts WHERE district_id = $1', [DISTRICT_ID]);
  await q('DELETE FROM daily_behavior_tracking WHERE district_id = $1', [DISTRICT_ID]);
  await q('DELETE FROM incidents WHERE district_id = $1', [DISTRICT_ID]);
  await q('DELETE FROM discipline_matrix WHERE district_id = $1', [DISTRICT_ID]);
  console.log('  ✓ Previous seed data cleaned\n');

  // =============================================
  // Temporarily disable triggers that cause FK issues during seeding
  // =============================================
  console.log('Disabling triggers for seeding...');
  await q('ALTER TABLE incidents DISABLE TRIGGER trg_check_sped_compliance');
  await q('ALTER TABLE incidents DISABLE TRIGGER trg_check_repeat_offender');
  console.log('  ✓ Triggers disabled\n');

  // =============================================
  // STUDENTS (20)
  // =============================================
  console.log('Seeding students...');
  const students = [
    [DISTRICT_ID, HS, 'LS-10001', 'Marcus', 'Johnson', 'D', '2008-03-15', 10, 'M', 'Black', false, null, false, false, false, false],
    [DISTRICT_ID, HS, 'LS-10002', 'Sofia', 'Garcia', 'M', '2008-07-22', 10, 'F', 'Hispanic', false, null, false, true, false, false],
    [DISTRICT_ID, HS, 'LS-10003', 'Tyler', 'Williams', null, '2007-11-08', 11, 'M', 'White', true, 'ED', false, false, false, false],
    [DISTRICT_ID, HS, 'LS-10004', 'Aaliyah', 'Brown', 'R', '2008-01-30', 10, 'F', 'Black', false, null, true, false, false, false],
    [DISTRICT_ID, HS, 'LS-10005', 'David', 'Nguyen', null, '2007-09-12', 11, 'M', 'Asian', false, null, false, true, false, false],
    [DISTRICT_ID, HS, 'LS-10006', 'Emily', 'Martinez', 'A', '2009-04-18', 9, 'F', 'Hispanic', true, 'LD', false, false, false, false],
    [DISTRICT_ID, HS, 'LS-10007', 'Jayden', 'Smith', null, '2008-12-05', 10, 'M', 'Black', false, null, false, false, true, false],
    [DISTRICT_ID, MS, 'LS-20001', 'Isabella', 'Rodriguez', null, '2011-06-20', 7, 'F', 'Hispanic', false, null, false, true, false, false],
    [DISTRICT_ID, MS, 'LS-20002', 'Ethan', 'Davis', 'J', '2011-02-14', 7, 'M', 'White', true, 'AU', false, false, false, false],
    [DISTRICT_ID, MS, 'LS-20003', 'Aisha', 'Thompson', null, '2010-10-30', 8, 'F', 'Black', false, null, false, false, false, true],
    [DISTRICT_ID, MS, 'LS-20004', 'Carlos', 'Hernandez', 'R', '2010-08-25', 8, 'M', 'Hispanic', false, null, false, true, false, false],
    [DISTRICT_ID, MS, 'LS-20005', 'Lily', 'Chen', null, '2011-05-03', 7, 'F', 'Asian', false, null, false, false, false, false],
    [DISTRICT_ID, MS, 'LS-20006', 'DeShawn', 'Jackson', null, '2010-01-17', 8, 'M', 'Black', true, 'OHI', false, false, false, false],
    [DISTRICT_ID, EL, 'LS-30001', 'Emma', 'Wilson', null, '2015-03-12', 3, 'F', 'White', false, null, false, false, false, false],
    [DISTRICT_ID, EL, 'LS-30002', 'Luis', 'Morales', 'A', '2014-09-08', 4, 'M', 'Hispanic', true, 'SI', false, true, false, false],
    [DISTRICT_ID, EL, 'LS-30003', 'Zoe', 'Anderson', null, '2015-11-21', 3, 'F', 'White', false, null, true, false, false, false],
    [DISTRICT_ID, EL, 'LS-30004', 'Kwame', 'Osei', null, '2014-07-04', 4, 'M', 'Black', false, null, false, false, true, false],
    [DISTRICT_ID, EL, 'LS-30005', 'Maya', 'Patel', null, '2016-02-28', 2, 'F', 'Asian', false, null, false, false, false, false],
    [DISTRICT_ID, DAEP, 'LS-40001', 'Jordan', 'Taylor', 'L', '2008-06-10', 10, 'M', 'Multiracial', false, null, false, false, false, false],
    [DISTRICT_ID, DAEP, 'LS-40002', 'Destiny', 'Moore', null, '2009-04-22', 9, 'F', 'Black', true, 'ED', false, false, false, false],
  ];

  const studentIds = [];
  for (const s of students) {
    const { rows } = await q(`
      INSERT INTO students (district_id, campus_id, student_id_number, first_name, last_name, middle_name, date_of_birth, grade_level, gender, race, is_sped, sped_eligibility, is_504, is_ell, is_homeless, is_foster_care, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true)
      ON CONFLICT (district_id, student_id_number) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    `, s);
    studentIds.push(rows[0].id);
  }
  console.log(`  ✓ ${studentIds.length} students created\n`);

  // Map student IDs by index
  const sid = (i) => studentIds[i];

  // =============================================
  // OFFENSE CODE LOOKUP
  // =============================================
  console.log('Looking up offense codes...');
  const codes = ['FIGHT-01','FIGHT-02','DRUG-03','VAPE-01','BULLY-01','BULLY-02','DEFY-01','DEFY-02','DEFY-03','THEFT-01','TRUAN-02','HARASS-01','DRUG-01'];
  const oc = {};
  for (const code of codes) {
    const { rows } = await q('SELECT id FROM offense_codes WHERE code = $1 LIMIT 1', [code]);
    oc[code] = rows[0]?.id;
  }
  console.log(`  ✓ ${Object.keys(oc).length} offense codes found\n`);

  // =============================================
  // INCIDENTS (15)
  // =============================================
  console.log('Seeding incidents...');
  const incidents = [
    // Marcus Johnson (0) - Fighting ISS completed
    { campus: HS, student: sid(0), date: '2025-09-15', time: '10:30', loc: 'Hallway', offense: oc['FIGHT-01'],
      desc: 'Marcus was involved in a physical altercation with another student. Both students were pushing and shoving.', type: 'iss', days: 3, start: '2025-09-16', end: '2025-09-18', status: 'completed' },
    // Marcus (0) - Defiance ISS completed
    { campus: HS, student: sid(0), date: '2025-10-08', time: '14:15', loc: 'Classroom', offense: oc['DEFY-02'],
      desc: 'Marcus was disruptive in class, refusing to put away his phone after multiple warnings.', type: 'iss', days: 2, start: '2025-10-09', end: '2025-10-10', status: 'completed' },
    // Marcus (0) - Fighting OSS active
    { campus: HS, student: sid(0), date: '2025-11-12', time: '12:45', loc: 'Cafeteria', offense: oc['FIGHT-02'],
      desc: 'Marcus involved in a second fighting incident in the cafeteria. Another student suffered a minor injury.', type: 'oss', days: 5, start: '2025-11-13', end: '2025-11-19', status: 'active' },
    // Tyler Williams SPED (2) - Drug DAEP compliance_hold
    { campus: HS, student: sid(2), date: '2025-10-22', time: '08:30', loc: 'Parking Lot', offense: oc['DRUG-03'],
      desc: 'Tyler was found in possession of marijuana in the school parking lot. Student admitted to personal use.', type: 'daep', days: 30, start: '2025-10-23', end: '2025-11-21', status: 'compliance_hold' },
    // Sofia Garcia (1) - Vaping detention completed
    { campus: HS, student: sid(1), date: '2025-09-28', time: '11:00', loc: 'Restroom', offense: oc['VAPE-01'],
      desc: 'Sofia was found vaping (nicotine) in the girls restroom. Device confiscated. First offense.', type: 'detention', days: 2, start: null, end: null, status: 'completed' },
    // Jayden Smith (6) - Bullying ISS active
    { campus: HS, student: sid(6), date: '2025-11-05', time: '13:30', loc: 'Gymnasium', offense: oc['BULLY-01'],
      desc: 'Jayden was reported for persistent bullying behavior toward a younger student.', type: 'iss', days: 3, start: '2025-11-06', end: '2025-11-08', status: 'active' },
    // Emily Martinez SPED (5) - Defiance warning
    { campus: HS, student: sid(5), date: '2025-10-15', time: '09:45', loc: 'Classroom', offense: oc['DEFY-01'],
      desc: 'Emily refused to participate in class and became verbally defiant. De-escalation was successful.', type: 'warning', days: null, start: null, end: null, status: 'completed' },
    // Ethan Davis SPED (8) - Disruptive ISS completed
    { campus: MS, student: sid(8), date: '2025-09-20', time: '10:00', loc: 'Classroom', offense: oc['DEFY-02'],
      desc: 'Ethan had a meltdown during schedule change. No physical harm. Crisis team responded.', type: 'iss', days: 1, start: '2025-09-21', end: '2025-09-21', status: 'completed' },
    // Carlos Hernandez (10) - Cyberbullying OSS active
    { campus: MS, student: sid(10), date: '2025-11-01', time: '08:00', loc: 'Online/Virtual', offense: oc['BULLY-02'],
      desc: 'Carlos posted threatening messages toward another student on social media.', type: 'oss', days: 3, start: '2025-11-02', end: '2025-11-04', status: 'active' },
    // DeShawn Jackson SPED (12) - Theft ISS completed
    { campus: MS, student: sid(12), date: '2025-10-05', time: '12:30', loc: 'Cafeteria', offense: oc['THEFT-01'],
      desc: 'DeShawn took another student\'s phone from their backpack. Phone was recovered.', type: 'iss', days: 2, start: '2025-10-06', end: '2025-10-07', status: 'completed' },
    // Aisha Thompson foster (9) - Truancy warning
    { campus: MS, student: sid(9), date: '2025-10-18', time: '13:00', loc: 'Hallway', offense: oc['TRUAN-02'],
      desc: 'Aisha was found in hallway during 5th period without signing out. Counselor meeting scheduled.', type: 'warning', days: null, start: null, end: null, status: 'completed' },
    // Luis Morales SPED (14) - Defiance warning
    { campus: EL, student: sid(14), date: '2025-11-08', time: '10:15', loc: 'Classroom', offense: oc['DEFY-01'],
      desc: 'Luis refused to transition to reading group and threw materials off desk. Used calm-down corner.', type: 'warning', days: null, start: null, end: null, status: 'completed' },
    // Kwame Osei homeless (16) - Fighting ISS
    { campus: EL, student: sid(16), date: '2025-10-30', time: '12:00', loc: 'Playground/Recess', offense: oc['FIGHT-01'],
      desc: 'Kwame got into a shoving match during recess over a basketball disagreement. No injuries.', type: 'iss', days: 1, start: '2025-10-31', end: '2025-10-31', status: 'completed' },
    // Jordan Taylor (18) - Harassment ISS active
    { campus: DAEP, student: sid(18), date: '2025-11-10', time: '09:00', loc: 'Classroom', offense: oc['HARASS-01'],
      desc: 'Jordan made threatening verbal comments toward another student during class.', type: 'iss', days: 2, start: '2025-11-11', end: '2025-11-12', status: 'active' },
    // Destiny Moore SPED (19) - Profanity ISS active
    { campus: DAEP, student: sid(19), date: '2025-11-14', time: '14:00', loc: 'Hallway', offense: oc['DEFY-03'],
      desc: 'Destiny used profane language directed at a staff member when asked to return to class.', type: 'iss', days: 2, start: '2025-11-15', end: '2025-11-16', status: 'active' },
  ];

  const incidentIds = [];
  for (const inc of incidents) {
    const { rows } = await q(`
      INSERT INTO incidents (district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id
    `, [DISTRICT_ID, inc.campus, inc.student, ADMIN_USER_ID, inc.date, inc.time, inc.loc, inc.offense, inc.desc, inc.type, inc.days, inc.start, inc.end, inc.status]);
    incidentIds.push(rows[0].id);
  }
  console.log(`  ✓ ${incidentIds.length} incidents created\n`);

  // =============================================
  // TRANSITION PLANS (3)
  // =============================================
  console.log('Seeding transition plans...');
  const plans = [
    { student: sid(0), incident: incidentIds[2], type: 'behavioral', cat: 'fighting',
      goals: 'Goal 1: Reduce physical altercations to zero for 60 days\nGoal 2: Demonstrate 3+ conflict resolution strategies\nGoal 3: Maintain daily behavior score ≥ 3.5/5.0\nGoal 4: Complete anger management counseling (8 sessions)',
      metrics: 'Zero fighting incidents in 60 days\nTeacher observation rubric (weekly)\nDaily behavior tracking average ≥ 3.5\nCounseling attendance (8/8 sessions)',
      start: '2025-11-13', end: '2026-01-12', r30: '2025-12-13', r60: '2026-01-12', r90: null, status: 'active', activated: '2025-11-13' },
    { student: sid(2), incident: incidentIds[3], type: 'daep_exit', cat: 'drugs_alcohol',
      goals: 'Goal 1: Complete substance abuse education (12 sessions)\nGoal 2: Pass random drug screening (3 clean tests)\nGoal 3: Maintain attendance ≥ 90%\nGoal 4: Academic grades ≥ 70 in all subjects\nGoal 5: Present personal accountability plan',
      metrics: 'Substance education completion (12/12)\nDrug screening results (3 clean tests)\nAttendance rate ≥ 90%\nAcademic grades ≥ 70\nAccountability plan presentation',
      start: '2025-10-23', end: '2026-01-21', r30: '2025-11-22', r60: '2025-12-22', r90: '2026-01-21', status: 'active', activated: '2025-10-23' },
    { student: sid(19), incident: incidentIds[14], type: 'behavioral', cat: 'defiance',
      goals: 'Goal 1: Reduce verbal outbursts to zero for 30 days\nGoal 2: Use appropriate communication (3 documented/week)\nGoal 3: Complete 6 individual counseling sessions\nGoal 4: Maintain CICO average ≥ 3.0/5.0',
      metrics: 'Zero staff-directed incidents in 30 days\nCommunication log (3/week)\nCounseling attendance (6/6)\nCICO average ≥ 3.0',
      start: '2025-11-15', end: '2025-12-15', r30: '2025-12-15', r60: null, r90: null, status: 'draft', activated: null },
  ];

  const planIds = [];
  for (const p of plans) {
    const { rows } = await q(`
      INSERT INTO transition_plans (district_id, student_id, incident_id, plan_type, offense_category, goals, metrics, start_date, end_date, review_30_date, review_60_date, review_90_date, status, created_by, activated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id
    `, [DISTRICT_ID, p.student, p.incident, p.type, p.cat, p.goals, p.metrics, p.start, p.end, p.r30, p.r60, p.r90, p.status, ADMIN_USER_ID, p.activated]);
    planIds.push(rows[0].id);
  }
  console.log(`  ✓ ${planIds.length} transition plans created\n`);

  // =============================================
  // DISCIPLINE MATRIX (sample rules)
  // =============================================
  console.log('Seeding discipline matrix...');
  const matrixRules = [
    [oc['FIGHT-01'], 1, 'all', 'detention', 'iss', 'iss', 1, 3, '{parent_conference,conflict_resolution}', false],
    [oc['FIGHT-01'], 2, 'all', 'iss', 'oss', 'iss', 2, 5, '{parent_conference,conflict_resolution,anger_management}', true],
    [oc['FIGHT-01'], 3, 'all', 'oss', 'daep', 'oss', 3, 10, '{parent_conference,threat_assessment,counseling_referral}', true],
    [oc['FIGHT-02'], 1, 'all', 'oss', 'daep', 'oss', 3, 10, '{parent_conference,threat_assessment,anger_management}', true],
    [oc['FIGHT-02'], 2, 'all', 'daep', 'daep', 'daep', 30, 45, '{parent_conference,threat_assessment,transition_plan}', true],
    [oc['DEFY-01'], 1, 'all', 'warning', 'detention', 'warning', 0, 1, '{parent_notification,teacher_conference}', false],
    [oc['DEFY-01'], 2, 'all', 'detention', 'iss', 'detention', 1, 2, '{parent_conference,behavior_contract}', false],
    [oc['DEFY-02'], 1, 'all', 'warning', 'detention', 'warning', 0, 1, '{parent_notification}', false],
    [oc['DEFY-02'], 2, 'all', 'detention', 'iss', 'detention', 1, 2, '{parent_conference,behavior_contract}', false],
    [oc['BULLY-01'], 1, 'all', 'iss', 'oss', 'iss', 2, 5, '{parent_conference,anti_bullying_program}', false],
    [oc['BULLY-01'], 2, 'all', 'oss', 'daep', 'oss', 3, 10, '{parent_conference,counseling_referral}', true],
    [oc['VAPE-01'], 1, 'all', 'detention', 'iss', 'detention', 1, 3, '{parent_notification,substance_education}', false],
    [oc['THEFT-01'], 1, 'all', 'detention', 'iss', 'detention', 1, 2, '{parent_notification,restitution}', false],
    [oc['DRUG-03'], 1, 'all', 'daep', 'daep', 'daep', 30, 45, '{parent_conference,substance_assessment,drug_testing}', true],
  ];

  for (const r of matrixRules) {
    await q(`
      INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports, transition_plan_required)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [DISTRICT_ID, ...r]);
  }
  console.log(`  ✓ ${matrixRules.length} matrix rules created\n`);

  // =============================================
  // ALERTS
  // =============================================
  console.log('Seeding alerts...');
  await q(`INSERT INTO alerts (district_id, campus_id, student_id, alert_level, trigger_type, trigger_description, status, suggested_interventions) VALUES
    ($1, $2, $3, 'red', 'iss_frequency', '3 ISS placements in last 30 days', 'active', $4),
    ($1, $2, $3, 'yellow', 'offense_repeat', 'Fighting offense committed 2 times', 'acknowledged', $5),
    ($1, $2, $6, 'yellow', 'referral_frequency', 'Homeless student with behavioral incident', 'active', $7)
  `, [DISTRICT_ID, HS, sid(0),
      ['Anger Management Group','Check-In/Check-Out (CICO)','Individual Counseling'],
      ['Conflict Resolution Counseling','Restorative Conference'],
      sid(6),
      ['Mentoring Program','Wraparound Services','Individual Counseling']]);
  console.log('  ✓ 3 alerts created\n');

  // =============================================
  // STUDENT INTERVENTIONS
  // =============================================
  console.log('Seeding student interventions...');
  const intNames = ['Check-In/Check-Out (CICO)','Anger Management Group','Conflict Resolution Counseling','Substance Abuse Counseling','Individual Counseling','Mentoring Program'];
  const intIds = {};
  for (const name of intNames) {
    const { rows } = await q('SELECT id FROM interventions WHERE name = $1 LIMIT 1', [name]);
    intIds[name] = rows[0]?.id;
  }

  // Marcus's plan interventions
  await q(`INSERT INTO student_interventions (district_id, student_id, intervention_id, plan_id, assigned_by, start_date, end_date, status) VALUES
    ($1, $2, $3, $4, $5, '2025-11-13', '2026-01-12', 'active'),
    ($1, $2, $6, $4, $5, '2025-11-13', '2025-12-25', 'active'),
    ($1, $2, $7, $4, $5, '2025-11-13', '2025-12-13', 'active')
  `, [DISTRICT_ID, sid(0), intIds['Check-In/Check-Out (CICO)'], planIds[0], ADMIN_USER_ID,
      intIds['Anger Management Group'], intIds['Conflict Resolution Counseling']]);

  // Tyler's plan interventions
  await q(`INSERT INTO student_interventions (district_id, student_id, intervention_id, plan_id, assigned_by, start_date, end_date, status) VALUES
    ($1, $2, $3, $4, $5, '2025-10-23', '2026-01-21', 'active'),
    ($1, $2, $6, $4, $5, '2025-10-23', '2026-01-21', 'active'),
    ($1, $2, $7, $4, $5, '2025-10-23', '2026-01-21', 'active')
  `, [DISTRICT_ID, sid(2), intIds['Substance Abuse Counseling'], planIds[1], ADMIN_USER_ID,
      intIds['Individual Counseling'], intIds['Mentoring Program']]);
  console.log('  ✓ 6 student interventions created\n');

  // =============================================
  // Re-enable triggers
  // =============================================
  console.log('Re-enabling triggers...');
  await q('ALTER TABLE incidents ENABLE TRIGGER trg_check_sped_compliance');
  await q('ALTER TABLE incidents ENABLE TRIGGER trg_check_repeat_offender');
  console.log('  ✓ Triggers re-enabled\n');

  // =============================================
  // Manually create compliance checklists for SPED/DAEP incidents
  // =============================================
  console.log('Creating compliance checklists for SPED students...');
  // Tyler Williams (SPED, DAEP consequence) - incident index 3
  const tyler_incident_id = incidentIds[3];
  const { rows: checklist_rows } = await q(`
    INSERT INTO compliance_checklists (district_id, incident_id, student_id, status, placement_blocked)
    VALUES ($1, $2, $3, 'incomplete', true)
    RETURNING id
  `, [DISTRICT_ID, tyler_incident_id, sid(2)]);

  // Update the incident to link to the checklist and set compliance_hold
  await q(`
    UPDATE incidents SET sped_compliance_required = true, status = 'compliance_hold', compliance_cleared = false, compliance_checklist_id = $1
    WHERE id = $2
  `, [checklist_rows[0].id, tyler_incident_id]);
  console.log('  ✓ Compliance checklist created for Tyler Williams\n');

  // =============================================
  // VERIFY
  // =============================================
  console.log('Verifying all data...');
  const tables = ['districts','campuses','profiles','students','offense_codes','interventions','incidents','compliance_checklists','alerts','transition_plans','student_interventions','discipline_matrix'];
  for (const t of tables) {
    const { rows } = await q(`SELECT COUNT(*) as c FROM ${t}`);
    console.log(`  ${t}: ${rows[0].c}`);
  }

  await client.end();
  console.log('\n🎉 Database fully seeded!');
  console.log('\n📋 Login: admin@lonestar-isd.org / Password123!');
}

run().catch(async err => {
  console.error('Fatal error:', err.message);
  console.error('Detail:', err.detail || '');
  try { await client.end(); } catch {}
  process.exit(1);
});
