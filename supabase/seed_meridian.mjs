// Seed Meridian demo data for Lone Star ISD
// Creates realistic SPED/504 students, IEPs, 504 plans, ARD referrals,
// compliance deadlines, and a CAP finding to showcase all Meridian module pages.
//
// Also enables Meridian for Lone Star ISD if not already enabled.
//
// Prerequisites:
//   - Migrations 001-040 applied
//   - run_seed.mjs already executed (district, campuses exist)
//   - seed_approval_flow.mjs already executed (SPED coordinator profiles exist)
//
// Usage:
//   node supabase/seed_meridian.mjs

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

const DISTRICT_ID = '11111111-1111-1111-1111-111111111111'
const HS = 'aaaa0001-0001-0001-0001-000000000001'
const MS = 'aaaa0001-0001-0001-0001-000000000002'
const ADMIN_ID = '1f2defa0-8f23-4173-9b55-01380cd0a836'

const TODAY = '2026-02-24'
const D = (s) => s  // just a label helper for readability

async function run() {
  console.log('Connected.\n')

  // --- 0. Enable Meridian for Lone Star ISD ---
  console.log('Enabling Meridian for Lone Star ISD...')
  const { data: distRow, error: distErr } = await supabase
    .from('districts')
    .select('settings')
    .eq('id', DISTRICT_ID)
    .single()
  if (distErr) throw new Error(`Fetch district settings: ${distErr.message}`)

  const settings = distRow?.settings || {}
  const products = settings.products || ['waypoint']
  if (!products.includes('meridian')) products.push('meridian')
  const { error: updateErr } = await supabase
    .from('districts')
    .update({ settings: { ...settings, products } })
    .eq('id', DISTRICT_ID)
  if (updateErr) throw new Error(`Update district settings: ${updateErr.message}`)
  console.log(`  + Products now: ${products.join(", ")}
`)

  // --- 1. Look up case manager profiles ---
  console.log('Looking up case manager profiles...')
  const { data: spedRows, error: spedErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('district_id', DISTRICT_ID)
    .eq('role', 'sped_coordinator')
    .limit(1)
  if (spedErr) throw new Error(`Fetch SPED coordinator: ${spedErr.message}`)
  const CASE_MGR = spedRows?.[0]?.id || ADMIN_ID

  const { data: coord504Rows, error: coord504Err } = await supabase
    .from('profiles')
    .select('id')
    .eq('district_id', DISTRICT_ID)
    .eq('role', 'section_504_coordinator')
    .limit(1)
  if (coord504Err) throw new Error(`Fetch 504 coordinator: ${coord504Err.message}`)
  const COORD_504 = coord504Rows?.[0]?.id || ADMIN_ID
  console.log(`  + SPED case manager: ${CASE_MGR}`)
  console.log(`  + 504 coordinator:   ${COORD_504}
`)

  // --- 2. Clean up previous seed data ---
  console.log('Cleaning previous Meridian seed data...')
  const tables = [
    'meridian_cap_tasks',
    'meridian_cap_findings',
    'meridian_iep_progress_reports',
    'meridian_plan_504_progress_reports',
    'meridian_ieps',
    'meridian_plans_504',
    'meridian_referrals',
    'meridian_import_logs',
    'meridian_integration_sources',
    'meridian_students',
  ]
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('district_id', DISTRICT_ID)
    if (error) throw new Error(`Delete from ${table}: ${error.message}`)
  }
  console.log('  + Cleaned\n')

  // --- 3. Students ---
  console.log('Creating Meridian students...')

  const insertStudent = async (s) => {
    const { data, error } = await supabase
      .from('meridian_students')
      .insert({
        district_id:          DISTRICT_ID,
        campus_id:            s.campus,
        state_id:             s.state_id,
        local_id:             s.local_id,
        first_name:           s.first,
        last_name:            s.last,
        date_of_birth:        s.dob,
        grade:                s.grade,
        gender:               s.gender,
        ethnicity:            s.ethnicity,
        sped_status:          s.sped_status,
        primary_disability:   s.disability,
        secondary_disability: s.disability2,
        has_504:              s.has_504 || false,
        plan_type:            s.plan_type || 'none',
        dyslexia_identified:  s.dyslexia || false,
        dyslexia_plan_type:   s.dyslexia_plan || null,
        hb3928_review_status: s.hb3928 || 'not_required',
        import_source:        'manual',
      })
      .select('id')
      .single()
    if (error) throw new Error(`Insert student ${s.first} ${s.last}: ${error.message}`)
    return data.id
  }

  // 8 students covering: IEP-only, 504-only, both, dyslexia, new referral, overdue
  const students = {}

  // Emma Rodriguez -- IEP (Learning Disability) + dyslexia identified, folder complete
  students.emma = await insertStudent({
    campus: HS, state_id: 'TX-5551001', local_id: 'MS-SPED-001',
    first: 'Emma', last: 'Rodriguez', dob: '2009-04-12', grade: '9', gender: 'F', ethnicity: 'Hispanic',
    sped_status: 'eligible', disability: 'Specific Learning Disability', disability2: null,
    has_504: false, plan_type: 'IEP',
    dyslexia: true, dyslexia_plan: 'IEP', hb3928: 'reviewed',
  })
  console.log('  + Emma Rodriguez (IEP, LD, dyslexia)')

  // James Carter -- IEP (Autism), folder readiness issues
  students.james = await insertStudent({
    campus: HS, state_id: 'TX-5551002', local_id: 'MS-SPED-002',
    first: 'James', last: 'Carter', dob: '2008-11-03', grade: '10', gender: 'M', ethnicity: 'Black',
    sped_status: 'eligible', disability: 'Autism', disability2: null,
    has_504: false, plan_type: 'IEP',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  + James Carter (IEP, Autism, folder issues)')

  // Lily Chen -- 504 (ADHD) + dyslexia, HB 3928 needs review
  students.lily = await insertStudent({
    campus: HS, state_id: 'TX-5551003', local_id: 'MS-504-001',
    first: 'Lily', last: 'Chen', dob: '2010-07-22', grade: '8', gender: 'F', ethnicity: 'Asian',
    sped_status: null, disability: null, disability2: null,
    has_504: true, plan_type: '504',
    dyslexia: true, dyslexia_plan: '504', hb3928: 'needs_review',
  })
  console.log('  + Lily Chen (504, ADHD, dyslexia, HB3928 needs review)')

  // Marcus Davis -- New referral, evaluation window OVERDUE
  students.marcus = await insertStudent({
    campus: MS, state_id: 'TX-5552001', local_id: 'MS-REF-001',
    first: 'Marcus', last: 'Davis', dob: '2011-02-08', grade: '7', gender: 'M', ethnicity: 'Black',
    sped_status: 'referred', disability: null, disability2: null,
    has_504: false, plan_type: 'none',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  + Marcus Davis (new referral, eval OVERDUE)')

  // Sophie Williams -- IEP (ED), annual review OVERDUE
  students.sophie = await insertStudent({
    campus: HS, state_id: 'TX-5551004', local_id: 'MS-SPED-003',
    first: 'Sophie', last: 'Williams', dob: '2008-09-15', grade: '11', gender: 'F', ethnicity: 'White',
    sped_status: 'eligible', disability: 'Emotional Disturbance', disability2: null,
    has_504: false, plan_type: 'IEP',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  + Sophie Williams (IEP, ED, annual review overdue)')

  // Ethan Nguyen -- 504 (anxiety), plan current
  students.ethan = await insertStudent({
    campus: MS, state_id: 'TX-5552002', local_id: 'MS-504-002',
    first: 'Ethan', last: 'Nguyen', dob: '2012-01-30', grade: '6', gender: 'M', ethnicity: 'Asian',
    sped_status: null, disability: null, disability2: null,
    has_504: true, plan_type: '504',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  + Ethan Nguyen (504, anxiety, current)')

  // Isabella Martinez -- new referral, ARD window CRITICAL (eval done, ARD due soon)
  students.isabella = await insertStudent({
    campus: MS, state_id: 'TX-5552003', local_id: 'MS-REF-002',
    first: 'Isabella', last: 'Martinez', dob: '2011-06-18', grade: '7', gender: 'F', ethnicity: 'Hispanic',
    sped_status: 'referred', disability: null, disability2: null,
    has_504: false, plan_type: 'none',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  + Isabella Martinez (referral, ARD window critical)')

  // Noah Thompson -- IEP (OHI/ADHD), triennial coming up
  students.noah = await insertStudent({
    campus: HS, state_id: 'TX-5551005', local_id: 'MS-SPED-004',
    first: 'Noah', last: 'Thompson', dob: '2007-12-01', grade: '12', gender: 'M', ethnicity: 'White',
    sped_status: 'eligible', disability: 'Other Health Impairment', disability2: 'Specific Learning Disability',
    has_504: false, plan_type: 'IEP',
    dyslexia: false, hb3928: 'not_required',
  })
  console.log('  + Noah Thompson (IEP, OHI+SLD, triennial coming up)\n')

  // --- 4. IEPs ---
  console.log('Creating IEPs...')

  // Emma -- complete folder, annual review upcoming (warning zone)
  const { data: iepEmma, error: iepEmmaErr } = await supabase
    .from('meridian_ieps')
    .insert({
      district_id:              DISTRICT_ID,
      student_id:               students.emma,
      campus_id:                HS,
      ard_date:                 '2025-03-10',
      iep_start_date:           '2025-03-10',
      iep_end_date:             '2026-03-10',
      annual_review_due:        '2026-03-05',
      triennial_due:            '2028-03-10',
      status:                   'active',
      case_manager_id:          CASE_MGR,
      has_present_levels:       true,
      has_annual_goals:         true,
      has_services_section:     true,
      has_accommodations:       true,
      has_transition_plan:      true,
      has_parent_signature:     true,
      has_prior_written_notice: true,
    })
    .select('id')
    .single()
  if (iepEmmaErr) throw new Error(`Insert Emma IEP: ${iepEmmaErr.message}`)
  console.log('  + Emma -- IEP, folder 7/7 complete, annual review in 9 days (warning)')

  // James -- folder INCOMPLETE (3 of 7 missing)
  const { data: iepJames, error: iepJamesErr } = await supabase
    .from('meridian_ieps')
    .insert({
      district_id:              DISTRICT_ID,
      student_id:               students.james,
      campus_id:                HS,
      ard_date:                 '2025-09-15',
      iep_start_date:           '2025-09-15',
      iep_end_date:             '2026-09-15',
      annual_review_due:        '2026-09-15',
      triennial_due:            '2028-09-15',
      status:                   'active',
      case_manager_id:          CASE_MGR,
      has_present_levels:       true,
      has_annual_goals:         true,
      has_services_section:     false,
      has_accommodations:       true,
      has_transition_plan:      false,
      has_parent_signature:     false,
      has_prior_written_notice: true,
    })
    .select('id')
    .single()
  if (iepJamesErr) throw new Error(`Insert James IEP: ${iepJamesErr.message}`)
  console.log('  + James -- IEP, folder 4/7 (services, transition plan, parent signature missing)')

  // Sophie -- IEP, annual review OVERDUE
  const { data: iepSophie, error: iepSophieErr } = await supabase
    .from('meridian_ieps')
    .insert({
      district_id:              DISTRICT_ID,
      student_id:               students.sophie,
      campus_id:                HS,
      ard_date:                 '2025-02-01',
      iep_start_date:           '2025-02-01',
      iep_end_date:             '2026-02-01',
      annual_review_due:        '2026-02-10',
      triennial_due:            '2028-02-01',
      status:                   'active',
      case_manager_id:          CASE_MGR,
      has_present_levels:       true,
      has_annual_goals:         true,
      has_services_section:     true,
      has_accommodations:       true,
      has_transition_plan:      false,
      has_parent_signature:     true,
      has_prior_written_notice: true,
    })
    .select('id')
    .single()
  if (iepSophieErr) throw new Error(`Insert Sophie IEP: ${iepSophieErr.message}`)
  console.log('  + Sophie -- IEP, annual review OVERDUE (Feb 10), transition plan missing')

  // Noah -- IEP, current, triennial due in 30 days
  const { data: iepNoah, error: iepNoahErr } = await supabase
    .from('meridian_ieps')
    .insert({
      district_id:              DISTRICT_ID,
      student_id:               students.noah,
      campus_id:                HS,
      ard_date:                 '2025-06-01',
      iep_start_date:           '2025-06-01',
      iep_end_date:             '2026-06-01',
      annual_review_due:        '2026-06-01',
      triennial_due:            '2026-03-25',
      status:                   'active',
      case_manager_id:          CASE_MGR,
      has_present_levels:       true,
      has_annual_goals:         true,
      has_services_section:     true,
      has_accommodations:       true,
      has_transition_plan:      true,
      has_parent_signature:     true,
      has_prior_written_notice: false,
    })
    .select('id')
    .single()
  if (iepNoahErr) throw new Error(`Insert Noah IEP: ${iepNoahErr.message}`)
  console.log('  + Noah -- IEP, triennial due Mar 25, missing prior written notice\n')

  // --- 5. IEP Progress Reports ---
  console.log('Creating IEP progress reports...')
  for (const [period, submitted, status] of [
    ['Q1 2025-2026', '2025-10-15', 'submitted'],
    ['Q2 2025-2026', '2026-01-10', 'submitted'],
    ['Q3 2025-2026', null,         'pending'],
  ]) {
    const { error } = await supabase
      .from('meridian_iep_progress_reports')
      .insert({
        district_id:    DISTRICT_ID,
        iep_id:         iepEmma.id,
        student_id:     students.emma,
        grading_period: period,
        due_date:       period === 'Q3 2025-2026' ? '2026-03-28' : null,
        submitted_date: submitted,
        submitted_by:   submitted ? CASE_MGR : null,
        status,
      })
    if (error) throw new Error(`Insert IEP progress report ${period}: ${error.message}`)
  }
  console.log('  + Emma -- 2 submitted, 1 pending progress reports\n')

  // --- 6. 504 Plans ---
  console.log('Creating 504 plans...')

  // Lily -- dyslexia 504, HB3928 reviewed, annual review upcoming (critical)
  const { data: plan504Lily, error: plan504LilyErr } = await supabase
    .from('meridian_plans_504')
    .insert({
      district_id:                   DISTRICT_ID,
      student_id:                    students.lily,
      campus_id:                     HS,
      meeting_date:                  '2025-09-05',
      plan_start_date:               '2025-09-05',
      plan_end_date:                 '2026-09-05',
      annual_review_due:             '2026-02-28',
      is_dyslexia_plan:              true,
      hb3928_reviewed:               false,
      hb3928_review_date:            null,
      mdt_composition_verified:      true,
      progress_report_required:      true,
      status:                        'active',
      case_manager_id:               COORD_504,
      has_eligibility_determination: true,
      has_accommodation_list:        true,
      has_parent_signature:          true,
      has_prior_written_notice:      false,
    })
    .select('id')
    .single()
  if (plan504LilyErr) throw new Error(`Insert Lily 504 plan: ${plan504LilyErr.message}`)
  console.log('  + Lily -- 504 dyslexia plan, annual review CRITICAL (Feb 28), HB3928 not reviewed')

  // Ethan -- standard 504, current, all documents complete
  const { data: plan504Ethan, error: plan504EthanErr } = await supabase
    .from('meridian_plans_504')
    .insert({
      district_id:                   DISTRICT_ID,
      student_id:                    students.ethan,
      campus_id:                     MS,
      meeting_date:                  '2025-10-12',
      plan_start_date:               '2025-10-12',
      plan_end_date:                 '2026-10-12',
      annual_review_due:             '2026-10-12',
      is_dyslexia_plan:              false,
      hb3928_reviewed:               false,
      mdt_composition_verified:      true,
      progress_report_required:      false,
      status:                        'active',
      case_manager_id:               COORD_504,
      has_eligibility_determination: true,
      has_accommodation_list:        true,
      has_parent_signature:          true,
      has_prior_written_notice:      true,
    })
    .select('id')
    .single()
  if (plan504EthanErr) throw new Error(`Insert Ethan 504 plan: ${plan504EthanErr.message}`)
  console.log('  + Ethan -- 504 anxiety plan, fully compliant, annual review Oct 2026\n')

  // --- 7. 504 Progress Reports ---
  console.log('Creating 504 progress reports...')
  for (const [period, submitted, status] of [
    ['Q1 2025-2026', '2025-10-20', 'submitted'],
    ['Q2 2025-2026', null,         'pending'],
  ]) {
    const { error } = await supabase
      .from('meridian_plan_504_progress_reports')
      .insert({
        district_id:    DISTRICT_ID,
        plan_id:        plan504Lily.id,
        student_id:     students.lily,
        grading_period: period,
        due_date:       period === 'Q2 2025-2026' ? '2026-01-30' : null,
        submitted_date: submitted,
        submitted_by:   submitted ? COORD_504 : null,
        status,
      })
    if (error) throw new Error(`Insert 504 progress report ${period}: ${error.message}`)
  }
  console.log('  + Lily -- 1 submitted, 1 pending 504 progress reports\n')

  // --- 8. ARD Referrals (compliance deadline engine) ---
  console.log('Creating ARD referrals...')

  // Marcus -- eval window OVERDUE (consent signed, eval due was Feb 17)
  const { error: marcusRefErr } = await supabase
    .from('meridian_referrals')
    .insert({
      district_id:         DISTRICT_ID,
      student_id:          students.marcus,
      campus_id:           MS,
      referral_date:       '2025-12-18',
      referral_source:     'Teacher referral',
      referral_reason:     'Student demonstrating significant academic and behavioral concerns possibly related to processing disorder.',
      consent_sent_date:   '2025-12-20',
      consent_signed_date: '2025-12-22',
      consent_refused:     false,
      eval_due_date:       '2026-02-17',
      eval_assigned_to:    CASE_MGR,
      ard_due_date:        '2026-03-19',
      status:              'open',
    })
  if (marcusRefErr) throw new Error(`Insert Marcus referral: ${marcusRefErr.message}`)
  console.log('  + Marcus -- eval window OVERDUE (due Feb 17)')

  // Isabella -- eval complete, ARD window CRITICAL (ARD due Feb 28)
  const { error: isabellaRefErr } = await supabase
    .from('meridian_referrals')
    .insert({
      district_id:          DISTRICT_ID,
      student_id:           students.isabella,
      campus_id:            MS,
      referral_date:        '2025-12-01',
      referral_source:      'Counselor referral',
      referral_reason:      'Significant reading and language processing delays observed across multiple content areas.',
      consent_sent_date:    '2025-12-03',
      consent_signed_date:  '2025-12-05',
      consent_refused:      false,
      eval_due_date:        '2026-01-30',
      eval_completed_date:  '2026-01-28',
      eval_assigned_to:     CASE_MGR,
      ard_due_date:         '2026-02-28',
      status:               'open',
    })
  if (isabellaRefErr) throw new Error(`Insert Isabella referral: ${isabellaRefErr.message}`)
  console.log('  + Isabella -- eval complete, ARD due Feb 28 (CRITICAL)')

  // Add a 3rd referral -- new, consent just sent, eval due in 3 weeks (ok)
  students.jaylen = await insertStudent({
    campus: MS, state_id: 'TX-5552004', local_id: 'MS-REF-003',
    first: 'Jaylen', last: 'Brooks', dob: '2012-03-14', grade: '6', gender: 'M', ethnicity: 'Black',
    sped_status: 'referred', disability: null, disability2: null,
    has_504: false, plan_type: 'none',
    dyslexia: false, hb3928: 'not_required',
  })
  const { error: jaylenRefErr } = await supabase
    .from('meridian_referrals')
    .insert({
      district_id:       DISTRICT_ID,
      student_id:        students.jaylen,
      campus_id:         MS,
      referral_date:     '2026-02-10',
      referral_source:   'Parent request',
      referral_reason:   'Parent requested evaluation for suspected dyslexia and attention challenges.',
      consent_sent_date: '2026-02-12',
      consent_refused:   false,
      eval_due_date:     '2026-03-18',
      eval_assigned_to:  CASE_MGR,
      ard_due_date:      '2026-04-17',
      status:            'open',
    })
  if (jaylenRefErr) throw new Error(`Insert Jaylen referral: ${jaylenRefErr.message}`)
  console.log('  + Jaylen Brooks -- new referral, eval due Mar 18 (ok)\n')

  // --- 9. CAP Finding ---
  console.log('Creating TEA CAP finding...')

  const { data: finding, error: findingErr } = await supabase
    .from('meridian_cap_findings')
    .insert({
      district_id:             DISTRICT_ID,
      finding_number:          'F-2025-001',
      finding_type:            'Procedural',
      legal_citation:          'TEC 29.003 / 34 CFR 300.300',
      description:             'District failed to obtain properly documented informed written consent prior to conducting initial evaluations for 3 students during the 2024-2025 school year. Consent forms were signed after evaluation activities had begun.',
      issued_date:             '2025-11-15',
      child_correction_due:    '2026-01-15',
      systemic_correction_due: '2026-05-15',
      status:                  'open',
    })
    .select('id')
    .single()
  if (findingErr) throw new Error(`Insert CAP finding: ${findingErr.message}`)

  const tasks = [
    ['Review all pending referrals for consent compliance',       'audit',    '2026-01-15', '2026-01-10', 'completed'],
    ['Train evaluation staff on consent timeline requirements',   'training', '2026-02-01', '2026-01-30', 'completed'],
    ['Implement consent tracking in Frontline eSped workflow',    'systemic', '2026-04-01', null,         'pending'],
    ['Submit corrective evidence to TEA program specialist',      'evidence', '2026-05-01', null,         'pending'],
  ]
  for (const [label, type, due, completed, status] of tasks) {
    const { error } = await supabase
      .from('meridian_cap_tasks')
      .insert({
        district_id:    DISTRICT_ID,
        finding_id:     finding.id,
        task_label:     label,
        task_type:      type,
        due_date:       due,
        completed_date: completed,
        assigned_to:    CASE_MGR,
        status,
      })
    if (error) throw new Error(`Insert CAP task "${label}": ${error.message}`)
  }
  console.log('  + CAP Finding F-2025-001 -- 2 tasks complete, 2 pending\n')

  // --- 10. Integration Source ---
  console.log('Creating integration source...')
  const { error: intErr } = await supabase
    .from('meridian_integration_sources')
    .insert({
      district_id:                 DISTRICT_ID,
      source_name:                 'Frontline eSped',
      integration_type:            'sftp',
      status:                      'active',
      sftp_schedule:               'nightly_2am',
      last_sync_at:                '2026-02-23T02:14:00+00:00',
      last_sync_status:            'success',
      last_sync_records_processed: 247,
      last_sync_errors:            0,
    })
  if (intErr) throw new Error(`Insert integration source: ${intErr.message}`)
  console.log('  + Frontline eSped integration source (last sync: Feb 23)\n')

  // --- 11. Verify ---
  console.log('Verifying...')
  const countTable = async (table) => {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('district_id', DISTRICT_ID)
    if (error) throw new Error(`Count ${table}: ${error.message}`)
    return count
  }

  const [students_, ieps, plans504, referrals, findings_, capTasks] = await Promise.all([
    countTable('meridian_students'),
    countTable('meridian_ieps'),
    countTable('meridian_plans_504'),
    countTable('meridian_referrals'),
    countTable('meridian_cap_findings'),
    countTable('meridian_cap_tasks'),
  ])

  console.log(`  Students:    ${students_}`)
  console.log(`  IEPs:        ${ieps}`)
  console.log(`  504 plans:   ${plans504}`)
  console.log(`  Referrals:   ${referrals}`)
  console.log(`  CAP finding: ${findings_} (${capTasks} tasks)`)
  console.log('')
  console.log('══════════════════════════════════════════')
  console.log('  MERIDIAN DEMO DATA SEEDED')
  console.log('══════════════════════════════════════════')
  console.log('')
  console.log('  STUDENTS:')
  console.log('  Emma Rodriguez   -- IEP, LD, dyslexia, folder 7/7 ok')
  console.log('  James Carter     -- IEP, Autism, folder 4/7 (needs attention)')
  console.log('  Sophie Williams  -- IEP, ED, annual review OVERDUE')
  console.log('  Noah Thompson    -- IEP, OHI+SLD, triennial due Mar 25')
  console.log('  Lily Chen        -- 504, dyslexia, HB3928 needs review, annual review CRITICAL')
  console.log('  Ethan Nguyen     -- 504, anxiety, fully compliant')
  console.log('  Marcus Davis     -- Referral, eval window OVERDUE')
  console.log('  Isabella Martinez-- Referral, ARD window CRITICAL (Feb 28)')
  console.log('  Jaylen Brooks    -- Referral, eval due Mar 18')
  console.log('')
  console.log('  COMPLIANCE DEADLINES TO DEMO:')
  console.log('  OVERDUE:  Marcus eval (Feb 17), Sophie annual review (Feb 10)')
  console.log('  CRITICAL: Isabella ARD (Feb 28), Lily 504 review (Feb 28)')
  console.log('  WARNING:  Emma IEP annual review (Mar 5)')
  console.log('  OK:       Jaylen eval (Mar 18), Noah triennial (Mar 25)')
  console.log('')
  console.log('  Meridian is now enabled for Lone Star ISD.')
  console.log('')
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
