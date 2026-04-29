import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'kvxecksvkimcgwhxxyhw'
const sql = readFileSync(join(__dirname, 'migrations', '069_navigator_parent_notice_strict.sql'), 'utf-8')
const PAT = process.env.SB_PAT

if (!PAT) { console.error('Set SB_PAT env var (sbp_... personal access token)'); process.exit(1) }

console.log('Running migration 069 via Supabase Management API...')

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
  console.log('✓ Migration 069 applied — parent_notice trigger now raises on client-set timestamps')
} else {
  console.error(`✗ Failed (${res.status}): ${body}`)
  process.exit(1)
}
