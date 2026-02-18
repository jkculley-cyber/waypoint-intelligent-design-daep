import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kvxecksvkimcgwhxxyhw.supabase.co',
  process.env.SERVICE_KEY,
  { auth: { persistSession: false } }
)

// Get all DAEP incidents with student info
const { data: incidents } = await supabase
  .from('incidents')
  .select('id, consequence_type, status, student_id, student:students(id, student_id_number, first_name, last_name)')
  .eq('consequence_type', 'daep')
  .order('created_at', { ascending: true })

console.log(`\nDAEP incidents (${incidents?.length ?? 0}):`)
incidents?.forEach(i => console.log(
  `  ${i.id}  status=${i.status.padEnd(18)} student_id_number=${i.student?.student_id_number?.padEnd(10)} name=${i.student?.first_name} ${i.student?.last_name}`
))

// Get existing scheduling records
const { data: scheduling } = await supabase
  .from('daep_placement_scheduling')
  .select('id, incident_id, student_id, orientation_status, orientation_scheduled_date')

console.log(`\nExisting scheduling records (${scheduling?.length ?? 0}):`)
scheduling?.forEach(s => console.log(
  `  incident=${s.incident_id}  orientation_status=${s.orientation_status}  date=${s.orientation_scheduled_date ?? '—'}`
))
