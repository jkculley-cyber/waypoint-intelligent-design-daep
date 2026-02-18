import pg from 'pg'
const { Client } = pg

const client = new Client({
  host: 'db.kvxecksvkimcgwhxxyhw.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
})

await client.connect()

// Check actual column types in the tables
const { rows: cols } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('students','daep_placement_scheduling')
    AND column_name IN ('grade_level','orientation_scheduled_time','orientation_status',
                        'orientation_scheduled_date','orientation_completed_date','orientation_form_data')
  ORDER BY table_name, column_name
`)
console.log('Actual column types:')
cols.forEach(c => console.log(' ', c.column_name, ':', c.data_type))

// Drop and recreate function cleanly with correct types
await client.query(`DROP FUNCTION IF EXISTS lookup_orientation_for_kiosk(TEXT)`)

await client.query(`
  CREATE FUNCTION lookup_orientation_for_kiosk(p_student_id_number TEXT)
  RETURNS TABLE (
    student_id              UUID,
    first_name              TEXT,
    last_name               TEXT,
    student_id_number       TEXT,
    grade_level             TEXT,
    scheduling_id           UUID,
    orientation_scheduled_date  DATE,
    orientation_scheduled_time  TEXT,
    orientation_status      TEXT,
    orientation_completed_date  DATE,
    orientation_form_data   JSONB
  )
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
  AS $fn$
  BEGIN
    RETURN QUERY
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.student_id_number,
      s.grade_level::TEXT,
      ps.id,
      ps.orientation_scheduled_date,
      ps.orientation_scheduled_time::TEXT,
      ps.orientation_status::TEXT,
      ps.orientation_completed_date,
      ps.orientation_form_data
    FROM students s
    JOIN daep_placement_scheduling ps ON ps.student_id = s.id
    WHERE s.student_id_number = p_student_id_number
      AND ps.orientation_status IN ('scheduled','completed','pending','missed')
    ORDER BY
      CASE ps.orientation_status
        WHEN 'scheduled' THEN 1
        WHEN 'pending'   THEN 2
        WHEN 'missed'    THEN 3
        WHEN 'completed' THEN 4
        ELSE 5
      END,
      ps.orientation_scheduled_date ASC NULLS LAST
    LIMIT 1;
  END;
  $fn$
`)

await client.query(`GRANT EXECUTE ON FUNCTION lookup_orientation_for_kiosk(TEXT) TO anon`)

console.log('Function recreated cleanly. Testing...')

// Quick test
const { rows } = await client.query(`SELECT * FROM lookup_orientation_for_kiosk('LS-20004')`)
if (rows.length > 0) {
  const r = rows[0]
  console.log('PASS - lookup works:')
  console.log('  Name:', r.first_name, r.last_name)
  console.log('  Grade:', r.grade_level, '(type:', typeof r.grade_level, ')')
  console.log('  Status:', r.orientation_status)
  console.log('  Date:', r.orientation_scheduled_date)
  console.log('  Time:', r.orientation_scheduled_time)
} else {
  console.log('FAIL - no rows returned')
}

await client.end()
