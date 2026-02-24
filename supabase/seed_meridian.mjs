// Seed Meridian demo data for Lone Star ISD
// Creates realistic SPED/504 students, IEPs, 504 plans, ARD referrals,
// compliance deadlines, and a CAP finding to showcase all Meridian module pages.
//
// Also enables Meridian for Lone Star ISD if not already enabled.
//
// Prerequisites:
//   - Migrations 001–040 applied
//   - run_seed.mjs already executed (district, campuses exist)
//   - seed_approval_flow.mjs already executed (SPED coordinator profiles exist)
//
// Usage:
//   $env:SUPABASE_DB_PASSWORD="your-password"
//   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
//   node supabase/seed_meridian.mjs

import pg from 'pg'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const DB_PASSWORD  = process.env.SUPABASE_DB_PASSWORD
const DB_HOST      = process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co'

if (!DB_PASSWORD) {
  console.error('Missing SUPABASE_DB_PASSWORD')
  process.exit(1)
}

const DISTRICT_ID = '11111111-1111-1111-1111-111111111111'
const HS = 'aaaa0001-0001-0001-0001-000000000001'
const MS = 'aaaa0001-0001-0001-0001-000000000002'
const ADMIN_ID = '1f2defa0-8f23-4173-9b55-01380cd0a836'

// Dates relative to 2026-02-24 (today)
const TODAY = '2026-02-24'
const D = (s) => s  // just a label helper for readability

const client = new pg.Client({
  host: DB_HOST, port: 5432, database: 'postgres', user: 'postgres',
  password: DB_PASSWORD, ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

const q = (sql, p = []) => client.query(sql, p)

async function run() {
  await client.connect()
  console.log('Connected.\n')

  // ─── 0. Enable Meridian for Lone Star ISD ─────────────────────────────────
  console.log('Enabling Meridian for Lone Star ISD...')
  const { rows: [distRow] } = await q(
    `SELECT settings FROM districts WHERE id = $1`, [DISTRICT_ID]
  )
  const settings = distRow?.settings || {}
  const products = settings.products || ['waypoint']
  if (!products.includes('meridian')) products.push('meridian')
  await q(
    `UPDATE districts SET settings = settings || $1::jsonb WHERE id = $2`,
    [JSON.stringify({ products }), DISTRICT_ID]
  )
  console.log(`  ✓ Products now: ${products.join(', ')}\n`)

  // ─── 1. Look up case manager profiles ─────────────────────────────────────
  console.log('Looking up case manager profiles...')
  const { rows: spedRows } = await q(
    `SELECT id FROM profiles WHERE district_id = $1 AND role = 'sped_coordinator' LIMIT 1`,
    [DISTRICT_ID]
  )
  const CASE_MGR = spedRows[0]?.id || ADMIN_ID

  const { rows: coord504Rows } = await q(
    `SELECT id FROM profiles WHERE district_id = $1 AND role = 'section_504_coordinator' LIMIT 1`,
    [DISTRICT_ID]
  )
  const COORD_504 = coord504Rows[0]?.id || ADMIN_ID
  console.log(`  ✓ SPED case manager: ${CASE_MGR}`)
  console.log(`  ✓ 504 coordinator:   ${COORD_504}\n`)

  // ─── 2. Clean up previous seed data ───────────────────────────────────────
  console.log('Cleaning previous Meridian seed data...')
  await q(`DELETE FROM meridian_cap_tasks    WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_cap_findings WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_iep_progress_reports WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_plan_504_progress_reports WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_ieps          WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_plans_504     WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_referrals     WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_import_logs   WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_integration_sources WHERE district_id = $1`, [DISTRICT_ID])
  await q(`DELETE FROM meridian_students      WHERE district_id = $1`, [DISTRICT_ID])
  console.log('  ✓ Cleaned\n')

  // ─── 3. Students ───────────────────────────────────────────────────────────
  console.log('Creating Meridian students...')

  const insertStudent = async (s) => {
    const { rows: [row] } = await q(`
      INSERT INTO meridian_students (
        district_id, campus_id, state_id, local_id,
        first_name, last_name, date_of_birth, grade, gender, ethnicity,
        sped_status, primary_disability, secondary_disability,
        has_504, plan_type,
        dyslexia_identified, dyslexia_plan_type, hb3928_review_status,
        import_source
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      ) RETURNING id
    `, [
      DISTRICT_ID, s.campus, s.state_id, s.local_id,
      s.first, s.last, s.dob, s.grade, s.gender, s.ethnicity,
      s.sped_status, s.disability, s.disability2,
      s.has_504 || false, s.plan_type || 'none',
      s.dyslexia || false, s.dyslexia_plan || null, s.hb3928 || 'not_required',
      'manual'
    ])
    return row.id
  }

  // 8 students covering: IEP-only, 504-only, both, dyslexia, new referral, overdue
  const students = {}

  // Emma Rodriguez — IEP (Learning Disability) + dyslexia identified, folder complete
  students.emma = await insertStudent({
    campus: HS, state_id: 'TX-5551001', local_id: 'MS-SPED-001',
    first: 'Emma', last: 'Rodriguez', dob: '2009-04-12', grade: '9', gender: 'F', ethnicity: 'Hispanic',
    sped_status: 'eligible', disability: 'Specific Learning Disability', disability2: null,
    has_504: false, plan_type: 'IEP',
    dyslexia: true, dyslexia_plan: 'IEP', hb3928: 'reviewed',
  })
  console.log('  ✓ Emma Rodriguez (IEP, LD, dyslexia)')

  // James Carter — IEP (Autism), folder readiness issues
  students.james = await insertStudent({
    campus: HS, state_id: 'TX-5551002', local_id: 'MS-SPED-002',
    first: 'James', last: 'Carter', dob: '2008-11-03', grade: '10', gender: 'M', ethnicity: 'Black',
    sped_status: 'eligible', disability: 'Autism', disability2: null,
    has_504: false, plan_type: 'IEP',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  ✓ James Carter (IEP, Autism, folder issues)')

  // Lily Chen — 504 (ADHD) + dyslexia, HB 3928 needs review
  students.lily = await insertStudent({
    campus: HS, state_id: 'TX-5551003', local_id: 'MS-504-001',
    first: 'Lily', last: 'Chen', dob: '2010-07-22', grade: '8', gender: 'F', ethnicity: 'Asian',
    sped_status: null, disability: null, disability2: null,
    has_504: true, plan_type: '504',
    dyslexia: true, dyslexia_plan: '504', hb3928: 'needs_review',
  })
  console.log('  ✓ Lily Chen (504, ADHD, dyslexia, HB3928 needs review)')

  // Marcus Davis — New referral, evaluation window OVERDUE
  students.marcus = await insertStudent({
    campus: MS, state_id: 'TX-5552001', local_id: 'MS-REF-001',
    first: 'Marcus', last: 'Davis', dob: '2011-02-08', grade: '7', gender: 'M', ethnicity: 'Black',
    sped_status: 'referred', disability: null, disability2: null,
    has_504: false, plan_type: 'none',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  ✓ Marcus Davis (new referral, eval OVERDUE)')

  // Sophie Williams — IEP (ED), annual review OVERDUE
  students.sophie = await insertStudent({
    campus: HS, state_id: 'TX-5551004', local_id: 'MS-SPED-003',
    first: 'Sophie', last: 'Williams', dob: '2008-09-15', grade: '11', gender: 'F', ethnicity: 'White',
    sped_status: 'eligible', disability: 'Emotional Disturbance', disability2: null,
    has_504: false, plan_type: 'IEP',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  ✓ Sophie Williams (IEP, ED, annual review overdue)')

  // Ethan Nguyen — 504 (anxiety), plan current
  students.ethan = await insertStudent({
    campus: MS, state_id: 'TX-5552002', local_id: 'MS-504-002',
    first: 'Ethan', last: 'Nguyen', dob: '2012-01-30', grade: '6', gender: 'M', ethnicity: 'Asian',
    sped_status: null, disability: null, disability2: null,
    has_504: true, plan_type: '504',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  ✓ Ethan Nguyen (504, anxiety, current)')

  // Isabella Martinez — new referral, ARD window CRITICAL (eval done, ARD due soon)
  students.isabella = await insertStudent({
    campus: MS, state_id: 'TX-5552003', local_id: 'MS-REF-002',
    first: 'Isabella', last: 'Martinez', dob: '2011-06-18', grade: '7', gender: 'F', ethnicity: 'Hispanic',
    sped_status: 'referred', disability: null, disability2: null,
    has_504: false, plan_type: 'none',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  ✓ Isabella Martinez (referral, ARD window critical)')

  // Noah Thompson — IEP (OHI/ADHD), triennial coming up
  students.noah = await insertStudent({
    campus: HS, state_id: 'TX-5551005', local_id: 'MS-SPED-004',
    first: 'Noah', last: 'Thompson', dob: '2007-12-01', grade: '12', gender: 'M', ethnicity: 'White',
    sped_status: 'eligible', disability: 'Other Health Impairment', disability2: 'Specific Learning Disability',
    has_504: false, plan_type: 'IEP',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  ✓ Noah Thompson (IEP, OHI+SLD, triennial coming up)\n')

  // ─── 4. IEPs ───────────────────────────────────────────────────────────────
  console.log('Creating IEPs...')

  // Emma — complete folder, annual review upcoming (warning zone)
  const { rows: [iepEmma] } = await q(`
    INSERT INTO meridian_ieps (
      district_id, student_id, campus_id, ard_date,
      iep_start_date, iep_end_date,
      annual_review_due, triennial_due,
      status, case_manager_id,
      has_present_levels, has_annual_goals, has_services_section,
      has_accommodations, has_transition_plan, has_parent_signature, has_prior_written_notice
    ) VALUES (
      $1,$2,$3,'2025-03-10','2025-03-10','2026-03-10',
      '2026-03-05','2028-03-10',
      'active',$4,
      true,true,true,true,true,true,true
    ) RETURNING id
  `, [DISTRICT_ID, students.emma, HS, CASE_MGR])
  console.log('  ✓ Emma — IEP, folder 7/7 complete, annual review in 9 days (warning)')

  // James — folder INCOMPLETE (3 of 7 missing)
  const { rows: [iepJames] } = await q(`
    INSERT INTO meridian_ieps (
      district_id, student_id, campus_id, ard_date,
      iep_start_date, iep_end_date,
      annual_review_due, triennial_due,
      status, case_manager_id,
      has_present_levels, has_annual_goals, has_services_section,
      has_accommodations, has_transition_plan, has_parent_signature, has_prior_written_notice
    ) VALUES (
      $1,$2,$3,'2025-09-15','2025-09-15','2026-09-15',
      '2026-09-15','2028-09-15',
      'active',$4,
      true,true,false,true,false,false,true
    ) RETURNING id
  `, [DISTRICT_ID, students.james, HS, CASE_MGR])
  console.log('  ✓ James — IEP, folder 4/7 (services, transition plan, parent signature missing)')

  // Sophie — IEP, annual review OVERDUE
  const { rows: [iepSophie] } = await q(`
    INSERT INTO meridian_ieps (
      district_id, student_id, campus_id, ard_date,
      iep_start_date, iep_end_date,
      annual_review_due, triennial_due,
      status, case_manager_id,
      has_present_levels, has_annual_goals, has_services_section,
      has_accommodations, has_transition_plan, has_parent_signature, has_prior_written_notice
    ) VALUES (
      $1,$2,$3,'2025-02-01','2025-02-01','2026-02-01',
      '2026-02-10','2028-02-01',
      'active',$4,
      true,true,true,true,false,true,true
    ) RETURNING id
  `, [DISTRICT_ID, students.sophie, HS, CASE_MGR])
  console.log('  ✓ Sophie — IEP, annual review OVERDUE (Feb 10), transition plan missing')

  // Noah — IEP, current, triennial due in 30 days
  const { rows: [iepNoah] } = await q(`
    INSERT INTO meridian_ieps (
      district_id, student_id, campus_id, ard_date,
      iep_start_date, iep_end_date,
      annual_review_due, triennial_due,
      status, case_manager_id,
      has_present_levels, has_annual_goals, has_services_section,
      has_accommodations, has_transition_plan, has_parent_signature, has_prior_written_notice
    ) VALUES (
      $1,$2,$3,'2025-06-01','2025-06-01','2026-06-01',
      '2026-06-01','2026-03-25',
      'active',$4,
      true,true,true,true,true,true,false
    ) RETURNING id
  `, [DISTRICT_ID, students.noah, HS, CASE_MGR])
  console.log('  ✓ Noah — IEP, triennial due Mar 25, missing prior written notice\n')

  // ─── 5. IEP Progress Reports ───────────────────────────────────────────────
  console.log('Creating IEP progress reports...')
  // Emma — 2 submitted, 1 pending
  for (const [period, submitted, status] of [
    ['Q1 2025-2026', '2025-10-15', 'submitted'],
    ['Q2 2025-2026', '2026-01-10', 'submitted'],
    ['Q3 2025-2026', null,         'pending'],
  ]) {
    await q(`
      INSERT INTO meridian_iep_progress_reports
        (district_id, iep_id, student_id, grading_period, due_date, submitted_date, submitted_by, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [DISTRICT_ID, iepEmma.id, students.emma, period,
        period === 'Q3 2025-2026' ? '2026-03-28' : null,
        submitted, submitted ? CASE_MGR : null, status])
  }
  console.log('  ✓ Emma — 2 submitted, 1 pending progress reports\n')

  // ─── 6. 504 Plans ──────────────────────────────────────────────────────────
  console.log('Creating 504 plans...')

  // Lily — dyslexia 504, HB3928 reviewed, annual review upcoming (critical)
  const { rows: [plan504Lily] } = await q(`
    INSERT INTO meridian_plans_504 (
      district_id, student_id, campus_id,
      meeting_date, plan_start_date, plan_end_date,
      annual_review_due,
      is_dyslexia_plan, hb3928_reviewed, hb3928_review_date, mdt_composition_verified, progress_report_required,
      status, case_manager_id,
      has_eligibility_determination, has_accommodation_list, has_parent_signature, has_prior_written_notice
    ) VALUES (
      $1,$2,$3,
      '2025-09-05','2025-09-05','2026-09-05',
      '2026-02-28',
      true, false, null, true, true,
      'active',$4,
      true,true,true,false
    ) RETURNING id
  `, [DISTRICT_ID, students.lily, HS, COORD_504])
  console.log('  ✓ Lily — 504 dyslexia plan, annual review CRITICAL (Feb 28), HB3928 not reviewed')

  // Ethan — standard 504, current, all documents complete
  const { rows: [plan504Ethan] } = await q(`
    INSERT INTO meridian_plans_504 (
      district_id, student_id, campus_id,
      meeting_date, plan_start_date, plan_end_date,
      annual_review_due,
      is_dyslexia_plan, hb3928_reviewed, mdt_composition_verified, progress_report_required,
      status, case_manager_id,
      has_eligibility_determination, has_accommodation_list, has_parent_signature, has_prior_written_notice
    ) VALUES (
      $1,$2,$3,
      '2025-10-12','2025-10-12','2026-10-12',
      '2026-10-12',
      false, false, true, false,
      'active',$4,
      true,true,true,true
    ) RETURNING id
  `, [DISTRICT_ID, students.ethan, MS, COORD_504])
  console.log('  ✓ Ethan — 504 anxiety plan, fully compliant, annual review Oct 2026\n')

  // ─── 7. 504 Progress Reports ───────────────────────────────────────────────
  console.log('Creating 504 progress reports...')
  for (const [period, submitted, status] of [
    ['Q1 2025-2026', '2025-10-20', 'submitted'],
    ['Q2 2025-2026', null,         'pending'],
  ]) {
    await q(`
      INSERT INTO meridian_plan_504_progress_reports
        (district_id, plan_id, student_id, grading_period, due_date, submitted_date, submitted_by, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [DISTRICT_ID, plan504Lily.id, students.lily, period,
        period === 'Q2 2025-2026' ? '2026-01-30' : null,
        submitted, submitted ? COORD_504 : null, status])
  }
  console.log('  ✓ Lily — 1 submitted, 1 pending 504 progress reports\n')

  // ─── 8. ARD Referrals (compliance deadline engine) ─────────────────────────
  console.log('Creating ARD referrals...')

  // Marcus — eval window OVERDUE (consent signed, eval due was Feb 17)
  await q(`
    INSERT INTO meridian_referrals (
      district_id, student_id, campus_id,
      referral_date, referral_source, referral_reason,
      consent_sent_date, consent_signed_date, consent_refused,
      eval_due_date, eval_assigned_to,
      ard_due_date,
      status
    ) VALUES (
      $1,$2,$3,
      '2025-12-18','Teacher referral','Student demonstrating significant academic and behavioral concerns possibly related to processing disorder.',
      '2025-12-20','2025-12-22',false,
      '2026-02-17',$4,
      '2026-03-19',
      'open'
    )
  `, [DISTRICT_ID, students.marcus, MS, CASE_MGR])
  console.log('  ✓ Marcus — eval window OVERDUE (due Feb 17)')

  // Isabella — eval complete, ARD window CRITICAL (ARD due Feb 28)
  await q(`
    INSERT INTO meridian_referrals (
      district_id, student_id, campus_id,
      referral_date, referral_source, referral_reason,
      consent_sent_date, consent_signed_date, consent_refused,
      eval_due_date, eval_completed_date, eval_assigned_to,
      ard_due_date,
      status
    ) VALUES (
      $1,$2,$3,
      '2025-12-01','Counselor referral','Significant reading and language processing delays observed across multiple content areas.',
      '2025-12-03','2025-12-05',false,
      '2026-01-30','2026-01-28',$4,
      '2026-02-28',
      'open'
    )
  `, [DISTRICT_ID, students.isabella, MS, CASE_MGR])
  console.log('  ✓ Isabella — eval complete, ARD due Feb 28 (CRITICAL)')

  // Add a 3rd referral — new, consent just sent, eval due in 3 weeks (ok)
  students.jaylen = await insertStudent({
    campus: MS, state_id: 'TX-5552004', local_id: 'MS-REF-003',
    first: 'Jaylen', last: 'Brooks', dob: '2012-03-14', grade: '6', gender: 'M', ethnicity: 'Black',
    sped_status: 'referred', disability: null, disability2: null,
    has_504: false, plan_type: 'none',
    dyslexia: false, hb3928: 'not_required',
  })
  await q(`
    INSERT INTO meridian_referrals (
      district_id, student_id, campus_id,
      referral_date, referral_source, referral_reason,
      consent_sent_date, consent_refused,
      eval_due_date, eval_assigned_to,
      ard_due_date,
      status
    ) VALUES (
      $1,$2,$3,
      '2026-02-10','Parent request','Parent requested evaluation for suspected dyslexia and attention challenges.',
      '2026-02-12',false,
      '2026-03-18',$4,
      '2026-04-17',
      'open'
    )
  `, [DISTRICT_ID, students.jaylen, MS, CASE_MGR])
  console.log('  ✓ Jaylen Brooks — new referral, eval due Mar 18 (ok)\n')

  // ─── 9. CAP Finding ────────────────────────────────────────────────────────
  console.log('Creating TEA CAP finding...')

  const { rows: [finding] } = await q(`
    INSERT INTO meridian_cap_findings (
      district_id,
      finding_number, finding_type, legal_citation, description,
      issued_date, child_correction_due, systemic_correction_due,
      status
    ) VALUES (
      $1,
      'F-2025-001', 'Procedural', 'TEC §29.003 / 34 CFR 300.300',
      'District failed to obtain properly documented informed written consent prior to conducting initial evaluations for 3 students during the 2024-2025 school year. Consent forms were signed after evaluation activities had begun.',
      '2025-11-15','2026-01-15','2026-05-15',
      'open'
    ) RETURNING id
  `, [DISTRICT_ID])

  const tasks = [
    ['Review all pending referrals for consent compliance',       'audit',    '2026-01-15', '2026-01-10', 'completed'],
    ['Train evaluation staff on consent timeline requirements',   'training', '2026-02-01', '2026-01-30', 'completed'],
    ['Implement consent tracking in Frontline eSped workflow',    'systemic', '2026-04-01', null,         'pending'],
    ['Submit corrective evidence to TEA program specialist',      'evidence', '2026-05-01', null,         'pending'],
  ]
  for (const [label, type, due, completed, status] of tasks) {
    await q(`
      INSERT INTO meridian_cap_tasks (district_id, finding_id, task_label, task_type, due_date, completed_date, assigned_to, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [DISTRICT_ID, finding.id, label, type, due, completed, CASE_MGR, status])
  }
  console.log('  ✓ CAP Finding F-2025-001 — 2 tasks complete, 2 pending\n')

  // ─── 10. Integration Source ────────────────────────────────────────────────
  console.log('Creating integration source...')
  await q(`
    INSERT INTO meridian_integration_sources (
      district_id, source_name, integration_type, status,
      sftp_schedule, last_sync_at, last_sync_status, last_sync_records_processed, last_sync_errors
    ) VALUES (
      $1, 'Frontline eSped', 'sftp', 'active',
      'nightly_2am', '2026-02-23 02:14:00+00', 'success', 247, 0
    )
  `, [DISTRICT_ID])
  console.log('  ✓ Frontline eSped integration source (last sync: Feb 23)\n')

  // ─── 11. Verify ───────────────────────────────────────────────────────────
  console.log('Verifying...')
  const counts = await Promise.all([
    q(`SELECT COUNT(*) FROM meridian_students WHERE district_id = $1`,           [DISTRICT_ID]),
    q(`SELECT COUNT(*) FROM meridian_ieps WHERE district_id = $1`,                [DISTRICT_ID]),
    q(`SELECT COUNT(*) FROM meridian_plans_504 WHERE district_id = $1`,           [DISTRICT_ID]),
    q(`SELECT COUNT(*) FROM meridian_referrals WHERE district_id = $1`,           [DISTRICT_ID]),
    q(`SELECT COUNT(*) FROM meridian_cap_findings WHERE district_id = $1`,        [DISTRICT_ID]),
    q(`SELECT COUNT(*) FROM meridian_cap_tasks WHERE district_id = $1`,           [DISTRICT_ID]),
  ])
  const [students_, ieps, plans504, referrals, findings, capTasks] = counts.map(r => r.rows[0].count)

  await client.end()

  console.log(`  Students:    ${students_}`)
  console.log(`  IEPs:        ${ieps}`)
  console.log(`  504 plans:   ${plans504}`)
  console.log(`  Referrals:   ${referrals}`)
  console.log(`  CAP finding: ${findings} (${capTasks} tasks)`)
  console.log('')
  console.log('══════════════════════════════════════════')
  console.log('  MERIDIAN DEMO DATA SEEDED')
  console.log('══════════════════════════════════════════')
  console.log('')
  console.log('  STUDENTS:')
  console.log('  Emma Rodriguez   — IEP, LD, dyslexia, folder 7/7 ✓')
  console.log('  James Carter     — IEP, Autism, folder 4/7 (needs attention)')
  console.log('  Sophie Williams  — IEP, ED, annual review OVERDUE')
  console.log('  Noah Thompson    — IEP, OHI+SLD, triennial due Mar 25')
  console.log('  Lily Chen        — 504, dyslexia, HB3928 needs review, annual review CRITICAL')
  console.log('  Ethan Nguyen     — 504, anxiety, fully compliant')
  console.log('  Marcus Davis     — Referral, eval window OVERDUE')
  console.log('  Isabella Martinez— Referral, ARD window CRITICAL (Feb 28)')
  console.log('  Jaylen Brooks    — Referral, eval due Mar 18')
  console.log('')
  console.log('  COMPLIANCE DEADLINES TO DEMO:')
  console.log('  🔴 OVERDUE: Marcus eval (Feb 17), Sophie annual review (Feb 10)')
  console.log('  🟠 CRITICAL: Isabella ARD (Feb 28), Lily 504 review (Feb 28)')
  console.log('  🟡 WARNING:  Emma IEP annual review (Mar 5)')
  console.log('  🟢 OK:       Jaylen eval (Mar 18), Noah triennial (Mar 25)')
  console.log('')
  console.log('  Meridian is now enabled for Lone Star ISD.')
  console.log('')
}

run().catch(async err => {
  console.error('Fatal:', err.message)
  console.error(err.detail || '')
  try { await client.end() } catch {}
  process.exit(1)
})
