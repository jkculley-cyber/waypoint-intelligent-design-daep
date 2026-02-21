import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const password = process.env.SUPABASE_DB_PASSWORD
const host = process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co'

if (!password) {
  console.error('Error: SUPABASE_DB_PASSWORD env var required')
  process.exit(1)
}

const client = new pg.Client({
  host,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
})

const migrations = [
  '028_harden_kiosk_student_rls.sql',
  '029_fix_approval_rpc_user_id.sql',
]

await client.connect()
console.log('Connected.')

for (const filename of migrations) {
  const sql = readFileSync(join(__dirname, 'migrations', filename), 'utf-8')
  console.log(`Applying ${filename}...`)
  await client.query(sql)
  console.log(`✓ ${filename} applied`)
}

await client.end()
console.log('\nAll migrations applied successfully.')
