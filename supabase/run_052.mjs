/**
 * Migration 052 — Checklist completed_by + alert plan_id
 * Run: SUPABASE_DB_PASSWORD=xxx node supabase/run_052.mjs
 * OR paste supabase/migrations/052_checklist_completed_by_and_alert_plan_id.sql into SQL Editor.
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

const sql = readFileSync(
  join(__dirname, 'migrations/052_checklist_completed_by_and_alert_plan_id.sql'),
  'utf8'
)

try {
  await client.connect()
  await client.query(sql)
  console.log('✅ Migration 052 applied — item_completed_by added to compliance_checklists, plan_id added to alerts')
} catch (err) {
  console.error('❌ Migration failed:', err.message)
} finally {
  await client.end()
}
