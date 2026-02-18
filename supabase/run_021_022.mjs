// Seeds orientation scheduling records using actual incident IDs from the DB.
// Reads real IDs at runtime so it works regardless of which seed scripts ran.
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kvxecksvkimcgwhxxyhw.supabase.co',
  process.env.SERVICE_KEY,
  { auth: { persistSession: false } }
)

const DISTRICT = '11111111-1111-1111-1111-111111111111'

// Student UUIDs are fixed from migration 007
const STUDENTS = {
  'LS-10001': 'bbbb0001-0001-0001-0001-000000000001', // Marcus Johnson
  'LS-10002': 'bbbb0001-0001-0001-0001-000000000002', // Sofia Garcia
  'LS-10003': 'bbbb0001-0001-0001-0001-000000000003', // Tyler Williams
  'LS-10004': 'bbbb0001-0001-0001-0001-000000000004', // Aaliyah Brown
  'LS-20004': 'bbbb0001-0001-0001-0001-000000000011', // Carlos Hernandez
  'LS-20006': 'bbbb0001-0001-0001-0001-000000000013', // DeShawn Jackson
}

const FORM_DATA = {
  'LS-10001': {
    reflection: "I know that fighting is never the answer. I let my anger take over and I hurt someone. That is not who I want to be. I need to walk away when things get heated and find a better way to deal with how I feel. I am going to use anger management and really try to change how I react when I get upset.",
    behavior_plan: [
      { behavior: "Walk away from conflicts instead of responding with physical aggression", supports: "Anger management group every Tuesday and Thursday", interventions: "Conflict resolution counseling, de-escalation strategies taught by counselor" },
      { behavior: "Use calming strategies when I feel myself getting angry", supports: "Cue card in my binder with breathing techniques and self-talk prompts", interventions: "CICO daily with behavior coach, individual counseling weekly" },
      { behavior: "Maintain positive relationships with peers without physical altercations", supports: "Peer mediation program and structured lunch schedule", interventions: "Restorative conference with peer when ready, social skills group" },
    ],
    completed_at: '2025-12-16',
  },
  'LS-10003': {
    reflection: "I made a bad decision bringing that to school. I knew it was wrong but I thought I wouldn't get caught. I let down my teachers, my mom, and myself. I need to make better choices about who I spend time with and what I bring to school. I'm going to use this time at DAEP to get back on track with my classes and show that I can do the right thing.",
    behavior_plan: [
      { behavior: "Make better choices about peer influence and avoid situations involving substances", supports: "Weekly check-ins with my counselor to talk through social pressures", interventions: "Substance abuse education program, mentoring with a positive adult role model" },
      { behavior: "Stay focused on academics and turn in all assignments on time", supports: "Daily planner and teacher check-ins to keep me organized", interventions: "Study skills support, tutoring during intervention period" },
      { behavior: "Communicate when I am struggling instead of acting out", supports: "Safe person at DAEP I can go to when feeling overwhelmed", interventions: "CICO (Check-In/Check-Out), individual counseling sessions" },
    ],
    completed_at: '2026-01-15',
  },
  'LS-10004': {
    reflection: "I was not thinking clearly about how serious this was. Having a 504 does not excuse what I did. I put myself and everyone around me at risk. I want to use this time to really understand why I made that choice and learn how to handle stress without turning to things that can get me in trouble.",
    behavior_plan: [
      { behavior: "Avoid situations and people associated with drug use", supports: "Weekly counseling appointments to process social pressures", interventions: "Substance awareness sessions, parent involvement meetings monthly" },
      { behavior: "Use healthy coping strategies when I feel stressed", supports: "Daily mood check-in with my assigned DAEP counselor", interventions: "Individual counseling twice per week, mindfulness exercises" },
      { behavior: "Attend all classes and maintain passing grades in all subjects", supports: "504 accommodations reviewed and updated for DAEP setting", interventions: "Academic progress monitoring weekly, teacher feedback form" },
    ],
    completed_at: '2026-01-20',
  },
}

async function main() {
  // ── 1. Load actual incident IDs from DB ─────────────────────────────────
  console.log('Loading incident IDs from database...')
  const { data: incidents, error: incErr } = await supabase
    .from('incidents')
    .select('id, status, student_id, student:students(student_id_number)')
    .eq('consequence_type', 'daep')

  if (incErr) { console.error('Cannot read incidents:', incErr.message); process.exit(1) }

  // Build map: student_id_number → first incident (prefer active/approved/compliance_hold)
  const byStudent = {}
  const priority = ['active', 'approved', 'compliance_hold', 'pending_approval', 'completed']
  for (const inc of incidents) {
    const num = inc.student?.student_id_number
    if (!num) continue
    const existing = byStudent[num]
    if (!existing || priority.indexOf(inc.status) < priority.indexOf(existing.status)) {
      byStudent[num] = inc
    }
  }

  console.log('Found DAEP incidents:')
  for (const [num, inc] of Object.entries(byStudent)) {
    console.log(`  ${num}: ${inc.id} (${inc.status})`)
  }

  // ── 2. Build scheduling records to upsert ───────────────────────────────
  const toUpsert = []

  // Completed with form data: LS-10001, LS-10003, LS-10004
  const completedStudents = [
    { num: 'LS-10001', date: '2025-12-16', time: '09:00' },
    { num: 'LS-10003', date: '2026-01-15', time: '08:30' },
    { num: 'LS-10004', date: '2026-01-20', time: '13:00' },
  ]
  for (const { num, date, time } of completedStudents) {
    const inc = byStudent[num]
    if (!inc) { console.log(`  ⚠ No DAEP incident for ${num}, skipping`); continue }
    toUpsert.push({
      district_id: DISTRICT,
      incident_id: inc.id,
      student_id: STUDENTS[num],
      ard_required: num === 'LS-10003', // Tyler is SPED
      ard_status: num === 'LS-10003' ? 'completed' : 'pending',
      ard_completed_date: num === 'LS-10003' ? '2026-01-14' : null,
      orientation_status: 'completed',
      orientation_scheduled_date: date,
      orientation_scheduled_time: time,
      orientation_completed_date: date,
    })
  }

  // Scheduled: LS-10002 (Sofia), LS-20004 (Carlos)
  const scheduledStudents = [
    { num: 'LS-10002', date: '2026-02-19', time: '13:00' },
    { num: 'LS-20004', date: '2026-02-20', time: '09:00' },
  ]
  for (const { num, date, time } of scheduledStudents) {
    const inc = byStudent[num]
    if (!inc) { console.log(`  ⚠ No DAEP incident for ${num}, skipping`); continue }
    toUpsert.push({
      district_id: DISTRICT,
      incident_id: inc.id,
      student_id: STUDENTS[num],
      ard_required: false,
      ard_status: 'pending',
      ard_completed_date: null,
      orientation_status: 'scheduled',
      orientation_scheduled_date: date,
      orientation_scheduled_time: time,
      orientation_completed_date: null,
    })
  }

  // Pending: LS-20006 (DeShawn)
  const pendingStudents = ['LS-20006']
  for (const num of pendingStudents) {
    const inc = byStudent[num]
    if (!inc) { console.log(`  ⚠ No DAEP incident for ${num}, skipping`); continue }
    toUpsert.push({
      district_id: DISTRICT,
      incident_id: inc.id,
      student_id: STUDENTS[num],
      ard_required: true,
      ard_status: 'pending',
      ard_completed_date: null,
      orientation_status: 'pending',
      orientation_scheduled_date: null,
      orientation_scheduled_time: null,
      orientation_completed_date: null,
    })
  }

  // ── 3. Upsert base records ───────────────────────────────────────────────
  console.log(`\nUpserting ${toUpsert.length} scheduling records (without form data)...`)
  const { error: upsertErr } = await supabase
    .from('daep_placement_scheduling')
    .upsert(toUpsert, { onConflict: 'incident_id' })

  if (upsertErr) {
    console.error('  ✗ Upsert failed:', upsertErr.message)
    process.exit(1)
  }
  console.log(`  ✓ ${toUpsert.length} records upserted`)

  // ── 4. Try to patch orientation_form_data ───────────────────────────────
  console.log('\nPatching orientation_form_data for 3 completed students...')
  let formOk = true
  for (const { num } of completedStudents) {
    const inc = byStudent[num]
    if (!inc || !FORM_DATA[num]) continue

    const { error } = await supabase
      .from('daep_placement_scheduling')
      .update({ orientation_form_data: FORM_DATA[num] })
      .eq('incident_id', inc.id)

    if (error) {
      console.error(`  ✗ ${num}: ${error.message}`)
      formOk = false
    } else {
      console.log(`  ✓ ${num} form data saved`)
    }
  }

  // ── 5. Summary ───────────────────────────────────────────────────────────
  const { data: all } = await supabase
    .from('daep_placement_scheduling')
    .select('student_id, orientation_status, orientation_completed_date')
    .order('orientation_status')

  console.log(`\nScheduling records in DB now (${all?.length ?? 0}):`)
  all?.forEach(r => console.log(`  student=${r.student_id?.slice(0,8)}…  status=${r.orientation_status?.padEnd(10)}  completed=${r.orientation_completed_date ?? '—'}`))

  if (!formOk) {
    console.log('\n⚠️  orientation_form_data column missing (migration 021 not applied).')
    console.log('   Run this one line in your Supabase SQL Editor, then run this script again:')
    console.log()
    console.log('   ALTER TABLE daep_placement_scheduling ADD COLUMN IF NOT EXISTS orientation_form_data JSONB;')
    console.log()
  } else {
    console.log('\n✓ Done! Test the kiosk with LS-10001, LS-10003, or LS-10004.')
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
