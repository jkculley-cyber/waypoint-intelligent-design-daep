// Apply migrations 073-079 sequentially via Supabase Management API.
// These are the T1 patches from CC22 R1 Waypoint adversarial audit:
//
//   073  audit-log triggers + history columns        (T1-2)
//   074  10-day SPED P0001 RAISE                     (T1-1)
//   075  parent-notice strict trigger + method enum  (T1-3)
//   076  lock compliance_checklists when completed   (T1-4)
//   077  history JSONB integrity CHECK constraints   (T1-6)
//   078  dual-signature override workflow            (T1-5)
//   079  parent role audit_log SELECT                (T1-8)
//
// Apply in order — 073 establishes the audit triggers + history columns that
// 074-079 reference. 077 validates JSONB shape installed by 073 (run later
// is fine because new history rows are written through the trigger which
// already enforces shape).
//
// Each migration runs independently — Management API runs each query in its
// own implicit transaction. If 073 succeeds and 074 fails, 073 is already
// committed. Recover by re-running with the failed migration only or pasting
// remaining SQL into the SQL Editor.
//
// Usage:  SB_PAT=sbp_... node supabase/run_073_to_079.mjs
//
// PAT scope: Waypoint project (ref: kvxecksvkimcgwhxxyhw). Apex PAT returns 401.
// Get a Waypoint PAT at: https://supabase.com/dashboard/account/tokens
//
// Fallback: paste each .sql into the SQL Editor at
//   https://supabase.com/dashboard/project/kvxecksvkimcgwhxxyhw/sql/new

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
  { num: '073', file: '073_waypoint_audit_triggers.sql',          label: 'audit-log triggers + history columns (T1-2)' },
  { num: '074', file: '074_waypoint_sped_10day.sql',              label: '10-day SPED P0001 RAISE (T1-1)' },
  { num: '075', file: '075_waypoint_parent_notice_strict.sql',    label: 'parent-notice strict + method enum (T1-3)' },
  { num: '076', file: '076_waypoint_compliance_lock.sql',         label: 'lock compliance_checklists when status=completed (T1-4)' },
  { num: '077', file: '077_waypoint_history_integrity.sql',       label: 'history JSONB integrity CHECK constraints (T1-6)' },
  { num: '078', file: '078_waypoint_override_dual_signature.sql', label: 'dual-signature override workflow (T1-5)' },
  { num: '079', file: '079_waypoint_parent_audit_select.sql',     label: 'parent role audit_log SELECT (T1-8)' },
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
console.log('\nNext steps:')
console.log('  1. Run a smoke test against the new SPED 10-day rule: insert an incident')
console.log('     for a SPED student that would cross 10 cumulative days without an MDR;')
console.log('     expect P0001 raise.')
console.log('  2. Verify audit_log captures field-level diffs on incident UPDATE: edit')
console.log('     incidents.description and confirm a row in audit_log with old/new values.')
console.log('  3. Run scripts/check-schema-drift.mjs to confirm new columns are reachable.')
console.log('  4. Update marketing brief language — claims about "database-level enforcement"')
console.log('     are now true on Waypoint side. See docs/handovers/vera-sage-marketing-brief-05092026.md')
console.log('     and remove the soft-spoken caveats that flagged the gap.')
