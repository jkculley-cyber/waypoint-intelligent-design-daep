import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const password = process.env.SUPABASE_DB_PASSWORD
const host = process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co'

if (!password) { console.error('SUPABASE_DB_PASSWORD required'); process.exit(1) }

const client = new pg.Client({
  host, port: 5432, database: 'postgres', user: 'postgres', password,
  ssl: { rejectUnauthorized: false },
})

const migrations = [
  '033_kiosk_dob_pin.sql',
  '034_student_guardians.sql',
  '035_audit_log.sql',
  '036_notification_preferences.sql',
]

await client.connect()
console.log('Connected.')

for (const file of migrations) {
  console.log(`Applying ${file}...`)
  const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8')
  await client.query(sql)
  console.log(`✓ ${file} applied.`)
}

await client.end()
console.log('\n✓ All migrations 033–036 applied successfully.')
