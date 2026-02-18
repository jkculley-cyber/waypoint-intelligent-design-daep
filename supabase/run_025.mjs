import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'kvxecksvkimcgwhxxyhw'
const sql = readFileSync(join(__dirname, 'migrations', '025_orientation_kiosk_rpc.sql'), 'utf-8')
const PAT = process.env.SB_PAT

if (!PAT) { console.error('Set SB_PAT env var'); process.exit(1) }

console.log('Running migration 025 via Supabase Management API...')

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  }
)

const body = await res.text()
if (res.ok) {
  console.log('✓ Migration 025 applied successfully!')
  console.log('  - lookup_orientation_for_kiosk() created, granted to anon')
  console.log('  - complete_orientation_for_kiosk() created, granted to anon')
  console.log('  - Orientation kiosk RLS policies applied (idempotent)')
} else {
  console.error(`✗ Failed (${res.status}): ${body}`)
}
