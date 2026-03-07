/**
 * Migration 051 — Parent acknowledgement content columns
 * Run: SUPABASE_DB_PASSWORD=xxx node supabase/run_051.mjs
 * OR paste supabase/migrations/051_parent_ack_content.sql into SQL Editor.
 */
import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD
if (!DB_PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD env var required')
  process.exit(1)
}

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const sql = readFileSync(join(__dirname, 'migrations/051_parent_ack_content.sql'), 'utf8')

try {
  await client.connect()
  await client.query(sql)
  console.log('✅ Migration 051 applied — parent_acknowledged_by_name + parent_acknowledged_offense added to incidents')
} catch (err) {
  console.error('❌ Migration failed:', err.message)
} finally {
  await client.end()
}
