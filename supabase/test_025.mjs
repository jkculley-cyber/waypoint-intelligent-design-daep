import pg from 'pg'
const { Client } = pg

const client = new Client({
  host: 'db.kvxecksvkimcgwhxxyhw.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

await client.connect()
console.log('Connected.\n')

// 1. Find students with orientations
const { rows: orientations } = await client.query(`
  SELECT s.student_id_number, s.first_name, s.last_name, s.is_active,
         ps.orientation_status, ps.orientation_scheduled_date
  FROM daep_placement_scheduling ps
  JOIN students s ON s.id = ps.student_id
  WHERE ps.orientation_status IN ('scheduled','pending','missed','completed')
  ORDER BY ps.orientation_scheduled_date DESC NULLS LAST
  LIMIT 10
`)

console.log('=== Orientations in DB ===')
orientations.forEach(r =>
  console.log(` ${r.student_id_number} | ${r.first_name} ${r.last_name} | active:${r.is_active} | ${r.orientation_status} | ${r.orientation_scheduled_date}`)
)

if (orientations.length === 0) {
  console.log('No orientations found — nothing to test.')
  await client.end()
  process.exit(0)
}

// 2. Test lookup_orientation_for_kiosk with the first student
const testId = orientations[0].student_id_number
console.log(`\n=== Testing lookup_orientation_for_kiosk('${testId}') ===`)
const { rows: lookupResult } = await client.query(
  `SELECT * FROM lookup_orientation_for_kiosk($1)`, [testId]
)

if (lookupResult.length === 0) {
  console.log('FAIL: Function returned no rows for known student ID')
} else {
  const r = lookupResult[0]
  console.log('PASS: Student found')
  console.log(`  Name:    ${r.first_name} ${r.last_name}`)
  console.log(`  ID:      ${r.student_id_number}`)
  console.log(`  Grade:   ${r.grade_level}`)
  console.log(`  Status:  ${r.orientation_status}`)
  console.log(`  Date:    ${r.orientation_scheduled_date}`)
  console.log(`  Sched ID: ${r.scheduling_id}`)
}

// 3. Test with a bogus ID — should return nothing
const { rows: bogusResult } = await client.query(
  `SELECT * FROM lookup_orientation_for_kiosk($1)`, ['BOGUS999']
)
console.log(`\n=== Testing bogus ID 'BOGUS999' ===`)
console.log(bogusResult.length === 0 ? 'PASS: Returned no rows (correct)' : 'FAIL: Unexpectedly returned rows')

// 4. Test complete_orientation_for_kiosk with a fake UUID — should return false
const { rows: completeResult } = await client.query(
  `SELECT complete_orientation_for_kiosk($1, NULL)`, ['00000000-0000-0000-0000-000000000000']
)
console.log(`\n=== Testing complete_orientation_for_kiosk with fake UUID ===`)
console.log(completeResult[0].complete_orientation_for_kiosk === false
  ? 'PASS: Returned false for unknown ID (correct)'
  : 'FAIL: Should have returned false')

// 5. Check RLS policies on anon role
const { rows: policies } = await client.query(`
  SELECT policyname, cmd, roles
  FROM pg_policies
  WHERE tablename = 'daep_placement_scheduling'
`)
console.log('\n=== RLS policies on daep_placement_scheduling ===')
policies.forEach(p => console.log(` [${p.cmd}] ${p.policyname} → roles: ${p.roles}`))

// 6. Check grants on functions
const { rows: grants } = await client.query(`
  SELECT routine_name, privilege_type, grantee
  FROM information_schema.routine_privileges
  WHERE routine_name IN ('lookup_orientation_for_kiosk','complete_orientation_for_kiosk')
    AND grantee = 'anon'
`)
console.log('\n=== Function grants to anon ===')
grants.forEach(g => console.log(` ${g.routine_name}: ${g.privilege_type} → ${g.grantee}`))

await client.end()
console.log('\nDone.')
