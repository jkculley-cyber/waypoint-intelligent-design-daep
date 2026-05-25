// scripts/check-schema-drift.mjs
//
// Round-3 audit, Chen blocker R2-2: production audit_log was found drifted
// from migration 035 source for ~70 days. The drift was undetectable via
// migration history because migrations are append-only — a separate
// out-of-band ALTER TABLE doesn't surface in source. Smoke tests caught it
// only because Navigator's CC14 fail-loud audit triggers tried to write to
// columns that no longer matched the source.
//
// CC26 extension: column drift isn't the only thing that escapes migration
// history. Required SEED ROWS can also vanish — the audit sentinel UUID
// (`00000000-...` in profiles + auth.users) was missing from production for
// an unknown duration before CC26 caught it via every navigator_* DELETE
// failing on the audit trigger's FK. Migration 071 supposedly seeded both
// rows, but production didn't have them. The row-invariant section below
// catches this class of drift: presence of load-bearing seed rows.
//
// This script probes production for:
//   1. EXPECTED columns: application-read columns on each load-bearing table.
//      Uses `.select('col1,col2,...').limit(0)` — PostgREST returns 4xx when
//      any column is missing, renamed, or absent from RLS view.
//   2. REQUIRED_ROWS: specific seed rows that must exist for the app to work.
//      Uses `.select('id').match({...}).maybeSingle()` — fails on missing row.
//
// Both checks are tripwires for the CLASSES of drift that hurt (renames,
// drops, missing seed rows), not full schema/data diffs. Update lists below
// when adding deliberate new schema/seed requirements.
//
// Usage:
//   node scripts/check-schema-drift.mjs           # exits 1 on drift
//   node scripts/check-schema-drift.mjs --verbose # also prints PASS lines
//
// Required env (one of):
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (preferred for CI)
//   VITE_SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY (local dev)
//
// CI integration: see .github/workflows/schema-drift.yml.

import { createClient } from '@supabase/supabase-js'

const VERBOSE = process.argv.includes('--verbose')

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(2)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

// ─── Expected schema ────────────────────────────────────────────────────
// Each entry is the column set that application code currently reads from
// a given table. If production drops or renames any of these columns, the
// app silently degrades; this script catches it before deploy.
//
// Update when:
//   - Adding a new column the app starts reading: add it here.
//   - Removing a column from app reads: remove from here AND drop in
//     production via a tracked migration.
//   - Renaming: update both production migration and this list.
//
// NOT a substitute for a full schema diff. It's a tripwire on the columns
// that have load-bearing app reads.
const EXPECTED = {
  audit_log: ['id', 'district_id', 'user_id', 'action', 'entity_type', 'entity_id', 'changes', 'ip_address', 'user_agent', 'created_at'],
  navigator_referrals: ['id', 'district_id', 'campus_id', 'student_id', 'reported_by', 'referral_date', 'location', 'description', 'description_history', 'status', 'reviewed_by', 'reviewed_at', 'outcome', 'skill_gap'],
  navigator_placements: ['id', 'district_id', 'campus_id', 'student_id', 'assigned_by', 'placement_type', 'start_date', 'end_date', 'days', 'reason', 'reason_history', 'parent_notified', 'parent_notified_at', 'parent_notified_method', 'parent_contact_notes'],
  navigator_supports: ['id', 'district_id', 'campus_id', 'student_id', 'assigned_by', 'assigned_to', 'support_type', 'start_date', 'end_date', 'status', 'notes'],
  manifestation_determinations: ['id', 'district_id', 'student_id', 'meeting_date', 'is_manifestation', 'fba_required', 'bip_required', 'iep_modified'],
  students: ['id', 'district_id', 'campus_id', 'first_name', 'last_name', 'student_id_number', 'grade_level', 'is_active', 'is_sped', 'is_504', 'race_ethnicity'],
  profiles: ['id', 'district_id', 'role', 'full_name', 'is_active'],

  // Waypoint discipline tables — extended in T2-5 to cover migrations 073-079.
  incidents: [
    'id', 'district_id', 'campus_id', 'student_id', 'reported_by', 'status',
    'laserfiche_instance_id',
    // 073: free-text history
    'description_history', 'notes_history',
  ],
  compliance_checklists: [
    'id', 'district_id', 'incident_id', 'student_id', 'status',
    'manifestation_determination', 'manifestation_result',
    'parent_notified', 'fape_plan_documented', 'placement_justification',
    'placement_blocked', 'block_overridden',
    // 075: parent-notice strict + method enum
    'parent_notification_method',
    // 073: history capture for placement_justification
    'placement_justification_history',
    // 078: dual-signature override link
    'override_request_id',
  ],
  // 078: net-new dual-signature override workflow table
  // 080: SHA-256 attestation columns added (TOCTOU close, Reyes residual)
  compliance_override_requests: [
    'id', 'district_id', 'compliance_checklist_id', 'incident_id',
    'reason_category', 'reason_detail', 'supporting_document_url',
    'requested_by', 'requested_at',
    'approval_status', 'approved_by', 'approved_at', 'approval_notes',
    'document_sha256', 'document_size_bytes', 'document_mime', 'document_verified_at',
    'created_at', 'updated_at',
  ],
  // T2-2: parent edit history reads from this table via RLS 079
  transition_plans: [
    'id', 'district_id', 'student_id', 'incident_id', 'plan_type',
    'start_date', 'end_date', 'review_30_date', 'review_60_date', 'review_90_date',
    'status',
  ],
  // T3 Phase 1: WORM mirror of audit_log with SHA-256 hash chain (mig 081)
  audit_edit_log: [
    'seq', 'audit_log_id', 'district_id', 'user_id', 'action', 'entity_type',
    'entity_id', 'changes', 'ip_address', 'user_agent', 'audit_created_at',
    'row_canonical', 'prev_row_hash', 'row_hash', 'mirrored_at',
  ],
  // T3 Phase 2: singleton cursor for the hourly chain-backup Edge Function (mig 082)
  audit_chain_backup_state: [
    'id', 'last_backed_up_seq', 'last_head_hash', 'last_head_seq',
    'last_run_at', 'last_status', 'last_error', 'updated_at',
  ],
}

// ─── Required rows (CC26 addition) ─────────────────────────────────────
// Specific seed rows that MUST exist in production for load-bearing flows
// to work. A row going missing here is not a "schema" change in the
// traditional sense (no column added/removed), but the symptom is identical:
// every operation that depends on the row silently breaks.
//
// Each entry is { table, match: {col: value, ...}, name, why }. The check
// runs `from(table).select('*').match(match).maybeSingle()` and fails if
// the row is absent OR if the query errors.
//
// Update when:
//   - Adding a new system-invariant row (e.g., a new sentinel UUID): add it.
//   - A row becomes optional / is migrated away: remove and document.
//   - Reseeding logic changes location: keep this list as the canary.
//
// Demo / sample data does NOT belong here — those are intentionally
// add/remove and would create noisy CI failures.
const REQUIRED_ROWS = [
  {
    table: 'profiles',
    match: { id: '00000000-0000-0000-0000-000000000000' },
    name: 'audit sentinel',
    why: 'audit_log.user_id FK target when auth.uid() returns NULL on service-role calls (mig 071). Missing row blocks every navigator_* / waypoint audit trigger.',
  },
]

let failed = 0
let passed = 0

for (const [table, cols] of Object.entries(EXPECTED)) {
  const { error } = await sb.from(table).select(cols.join(',')).limit(0)
  if (error) {
    failed++
    console.error(`✗ column-drift ${table}: ${error.message}`)
    if (error.details) console.error(`  details: ${error.details}`)
    if (error.hint) console.error(`  hint: ${error.hint}`)
  } else {
    passed++
    if (VERBOSE) console.log(`✓ column-drift ${table}: all ${cols.length} columns reachable`)
  }
}

for (const req of REQUIRED_ROWS) {
  const { data, error } = await sb.from(req.table).select('*').match(req.match).maybeSingle()
  if (error) {
    failed++
    console.error(`✗ row-invariant ${req.table} [${req.name}]: query error — ${error.message}`)
  } else if (!data) {
    failed++
    console.error(`✗ row-invariant ${req.table} [${req.name}]: REQUIRED ROW MISSING`)
    console.error(`  match: ${JSON.stringify(req.match)}`)
    console.error(`  why this matters: ${req.why}`)
    console.error(`  fix: re-apply the seeding migration or paste the upsert into SQL Editor`)
  } else {
    passed++
    if (VERBOSE) console.log(`✓ row-invariant ${req.table} [${req.name}]: present`)
  }
}

const totalChecks = Object.keys(EXPECTED).length + REQUIRED_ROWS.length
console.log(`\nSchema drift check: ${passed} PASS, ${failed} FAIL (${Object.keys(EXPECTED).length} column-shapes + ${REQUIRED_ROWS.length} row-invariants)`)
if (failed > 0) {
  console.error('\nDrift detected. Compare migration sources to production schema.')
  console.error('Column drift: update EXPECTED above to match deliberate schema changes;')
  console.error('row-invariant drift: re-apply the seeding migration (do NOT just delete the')
  console.error('row from this list to silence it — the row is load-bearing).')
  process.exit(1)
}
process.exit(0)
