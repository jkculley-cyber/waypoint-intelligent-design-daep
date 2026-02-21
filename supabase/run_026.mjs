import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'kvxecksvkimcgwhxxyhw'
const sql = readFileSync(join(__dirname, 'migrations', '026_waypoint_admin.sql'), 'utf-8')
const PAT = process.env.SB_PAT

if (!PAT) { console.error('Set SB_PAT env var'); process.exit(1) }

console.log('Running migration 026 via Supabase Management API...')

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
  console.log('✓ Migration 026 applied successfully!')
  console.log('  - profiles.district_id is now nullable')
  console.log('  - profiles_role_check constraint updated (adds waypoint_admin)')
  console.log('  - is_waypoint_admin() helper created')
  console.log('  - provision_new_district() RPC created')
  console.log('  - provision_campus() RPC created')
  console.log('  - provision_admin_profile() RPC created')
  console.log('  - list_districts_for_admin() RPC created')
} else {
  console.error(`✗ Failed (${res.status}): ${body}`)
  process.exit(1)
}
