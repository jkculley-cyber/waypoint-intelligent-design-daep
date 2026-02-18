import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'kvxecksvkimcgwhxxyhw'

const sql = readFileSync(join(__dirname, 'migrations', '024_kiosk_student_rpc.sql'), 'utf-8')
const PAT = process.env.SB_PAT

console.log('Running migration 024 via Supabase Management API...')

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
)

const body = await res.text()

if (res.ok) {
  console.log('✓ Migration 024 applied successfully!')
  console.log('  Function lookup_student_for_kiosk created.')
  console.log('  GRANT EXECUTE to anon role done.')
} else {
  console.error(`✗ Failed (${res.status}): ${body}`)
}
