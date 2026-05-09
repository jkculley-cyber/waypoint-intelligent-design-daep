// scripts/check-schema-drift.mjs
//
// Round-3 audit, Chen blocker R2-2: production audit_log was found drifted
// from migration 035 source for ~70 days. The drift was undetectable via
// migration history because migrations are append-only — a separate
// out-of-band ALTER TABLE doesn't surface in source. Smoke tests caught it
// only because Navigator's CC14 fail-loud audit triggers tried to write to
// columns that no longer matched the source.
//
// This script probes production for the columns that the application code
// EXPECTS to exist on each audited / load-bearing table. The probe uses
// `supabase-js` with `.select('col1,col2,...').limit(0)` — PostgREST
// returns 4xx (with an unambiguous error body) when any column is missing,
// renamed, or absent from the row-level RLS view. The check is column-
// existence + read-shape, not type-precision; it catches the class of drift
// that hurts (renames, drops) without false-positives on harmless changes
// (default values, constraint tweaks).
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
  compliance_override_requests: [
    'id', 'district_id', 'compliance_checklist_id', 'incident_id',
    'reason_category', 'reason_detail', 'supporting_document_url',
    'requested_by', 'requested_at',
    'approval_status', 'approved_by', 'approved_at', 'approval_notes',
    'created_at', 'updated_at',
  ],
  // T2-2: parent edit history reads from this table via RLS 079
  transition_plans: [
    'id', 'district_id', 'student_id', 'incident_id', 'plan_type',
    'start_date', 'end_date', 'review_30_date', 'review_60_date', 'review_90_date',
    'status',
  ],
}

let failed = 0
let passed = 0

for (const [table, cols] of Object.entries(EXPECTED)) {
  const { error } = await sb.from(table).select(cols.join(',')).limit(0)
  if (error) {
    failed++
    console.error(`✗ ${table}: ${error.message}`)
    if (error.details) console.error(`  details: ${error.details}`)
    if (error.hint) console.error(`  hint: ${error.hint}`)
  } else {
    passed++
    if (VERBOSE) console.log(`✓ ${table}: all ${cols.length} columns reachable`)
  }
}

console.log(`\nSchema drift check: ${passed} PASS, ${failed} FAIL (${Object.keys(EXPECTED).length} tables)`)
if (failed > 0) {
  console.error('\nDrift detected. Compare migration sources to production schema.')
  console.error('To regenerate the expected list from current production after a deliberate change,')
  console.error('update EXPECTED above; do NOT regenerate blindly — that defeats the tripwire.')
  process.exit(1)
}
process.exit(0)
