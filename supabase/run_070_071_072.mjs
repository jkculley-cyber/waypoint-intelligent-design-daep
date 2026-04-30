// Apply migrations 070, 071, 072 sequentially via Supabase Management API.
// Each migration runs independently — if 070 succeeds and 071 fails, 070 is
// already committed (Management API runs each query in its own implicit
// transaction). The runner reports per-migration status so a partial apply
// is recoverable.
//
// Usage:  SB_PAT=sbp_... node supabase/run_070_071_072.mjs
//
// PAT scope: must include the Waypoint project (ref: kvxecksvkimcgwhxxyhw).
// Apex PAT will return 401. Generate a Waypoint-scoped PAT at
// https://supabase.com/dashboard/account/tokens.
//
// Fallback: if PAT auth fails, paste each .sql into the SQL Editor at
// https://supabase.com/dashboard/project/kvxecksvkimcgwhxxyhw/sql/new

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'kvxecksvkimcgwhxxyhw'
const PAT = process.env.SB_PAT

if (!PAT) {
  console.error('Set SB_PAT env var (Waypoint-scoped Supabase PAT, sbp_... format)')
  console.error('Get one at: https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

const MIGRATIONS = [
  { num: '070', file: '070_navigator_race_validate.sql', label: 'race_ethnicity NULL backfill + NOT NULL' },
  { num: '071', file: '071_seed_audit_sentinel.sql',     label: 'audit-fallback sentinel UUID in auth.users + profiles' },
  { num: '072', file: '072_navigator_history_integrity.sql', label: 'reason_history + description_history JSONB integrity CHECK' },
]

let failed = 0

for (const m of MIGRATIONS) {
  const sql = readFileSync(join(__dirname, 'migrations', m.file), 'utf-8')
  process.stdout.write(`Running migration ${m.num} (${m.label})... `)
  try {
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
      console.log('✓')
    } else {
      console.log(`✗ (${res.status})`)
      console.error(`  ${body}`)
      failed++
    }
  } catch (e) {
    console.log('✗ (network)')
    console.error(`  ${e.message}`)
    failed++
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${MIGRATIONS.length} migration(s) failed. Review above + retry, or paste failing SQL into Supabase SQL Editor.`)
  process.exit(1)
}
console.log(`\n${MIGRATIONS.length}/${MIGRATIONS.length} migrations applied.`)
console.log('Next: re-run scripts/check-schema-drift.mjs to confirm the new shape is reachable from app code.')
