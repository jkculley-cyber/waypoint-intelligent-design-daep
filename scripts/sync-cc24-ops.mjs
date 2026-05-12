// One-off ops Command Center sync for Session CC24.
// Pushes new handoff entry + 3 new DECISIONS entries.

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co'
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'

const hdrs = {
  apikey: OPS_KEY,
  Authorization: `Bearer ${OPS_KEY}`,
  'Content-Type': 'application/json',
}

const SESSION_LABEL = 'Session CC24'
const SESSION_DATE = '2026-05-12'
const AUTHOR = 'Archer'

const handoffEntry = {
  session: SESSION_LABEL,
  date: SESSION_DATE,
  author: AUTHOR,
  focus: 'T3 audit_edit_log WORM mirror — Phase 1 (chain substrate) shipped + Phase 2 (hourly external backup pipeline) shipped to substrate; Edge Function gateway carryover.',
  done: [
    'Migration 081 + 081a hotpatch: audit_edit_log WORM mirror table, SHA-256 hash chain, REVOKE all client writes, SECURITY DEFINER append function with pg_advisory_xact_lock serialization, AFTER INSERT trigger on audit_log, two verify functions (chain + cross-check), full-history backfill of 248 existing audit_log rows. Hotpatch fixed SET search_path to include extensions schema (pgcrypto digest resolution).',
    'Smoke 081 11/11 PASS — mirror trigger, chain links, hash shape, multi-insert chain, both verify RPCs, idempotency P0001, lockdown INSERT/UPDATE/DELETE via service-role all rejected with 42501.',
    'Schema-drift CI extended (12/12 PASS, +audit_edit_log) then 13/13 with audit_chain_backup_state.',
    'Migration 082: audit_chain_backup_state singleton + atomic lock RPCs (UPDATE-WHERE-RETURNING) + Storage bucket audit-edit-log-backups + waypoint_admin-only RLS SELECT + hourly pg_cron schedule.',
    'Edge Function verify-and-backup-audit-chain deployed via CLI — algorithm: acquire lock, verify chain, verify cross-check, upload JSONL delta + chain_head.json attestation, complete run with status.',
    '3 new DECISIONS entries — Phase 2 design + pgcrypto/extensions search_path lesson + Phase 1 WORM substrate.',
    'Memory entry feedback_search_path_extensions.md — generalized rule for all future SECURITY DEFINER + extension-call patterns.',
  ],
  next: [
    'CARRYOVER: Edge Function gateway returning INVALID_CREDENTIALS for all valid bearers — same CC22 asymmetric-JWT-rollout pattern. Dashboard toggle flipped OFF mid-session but did not release the gateway. Three rounds attempted, then CC18 anti-ping-pong applied. Substrate is shipped; hourly cron will silently no-op until gateway releases.',
    'Next session step 1: probe Edge Function. If still 401, try one CLI redeploy + dashboard toggle re-flip; if still blocked, wait for Supabase cache release.',
    'Next session step 2: ship supabase/config.toml with [functions.verify-and-backup-audit-chain] verify_jwt = false so future redeploys cannot undo the dashboard state.',
    'Phase 3 UI surface unblocked by the Phase 2 substrate, independent of gateway: Waypoint Admin Chain Integrity page reading audit_chain_backup_state with head hash, chain length, staleness alarm, Storage object listing.',
    'Commercial track (unchanged): escrow, §37 legal opinion, SOC 2 Type 1, secondary engineer in MSA, reference district, PEIMS connector.',
  ],
}

const newDecisions = [
  {
    rule: 'verify-and-backup-audit-chain Edge Function externalizes the audit_edit_log chain head + delta rows to a write-only Supabase Storage bucket hourly via pg_cron.',
    why: 'Phase 2 of T3 closes the prevention half of Reyes CC23 R3 residual. A privileged DB attacker who rewrites the in-DB chain must now also rewrite every Storage object to stay undetected. Singleton state row + atomic UPDATE-WHERE-RETURNING lock (session-bound pg_advisory_lock does not work across separate Edge Function HTTP invocations). Storage bucket waypoint_admin SELECT-only via storage.objects RLS, REVOKE INSERT/UPDATE/DELETE from authenticated/anon; service_role bypasses RLS for the function. NOT truly tamper-proof — bucket is still deletable by Supabase project-owner; Phase 4 (AWS/GCP external) deferred until procurement demands.',
    date: SESSION_DATE,
  },
  {
    rule: 'SECURITY DEFINER functions in Supabase that call extension functions (pgcrypto digest, vault, pg_net, etc.) must declare SET search_path = public, extensions.',
    why: 'Supabase installs all extensions into the extensions schema by convention — even when CREATE EXTENSION IF NOT EXISTS is run without explicit schema. Bare public excludes extensions; the function compiles (resolution is at call time) but every invocation fails with function digest(text, unknown) does not exist. In CC24 this propagated through the audit fail-loud trigger and would have aborted every mutation under traffic. Smoke caught it in 15 min, ~zero customer impact. Generalized rule: any SECURITY DEFINER function with SET search_path must contain every schema the body references. Audit existing migrations for the same trap as a follow-up.',
    date: SESSION_DATE,
  },
  {
    rule: 'audit_edit_log is a WORM mirror of audit_log with a SHA-256 hash chain. Only fn_append_audit_edit_log SECURITY DEFINER can write — INSERT/UPDATE/DELETE/TRUNCATE REVOKEd from PUBLIC/anon/authenticated/service_role.',
    why: 'Phase 1 of T3 closes Reyes CC23 R3 residual at the detection layer. AFTER INSERT trigger mirrors every audit_log row in same txn; backfill on apply mirrors every existing row in (created_at, id) order so chain starts at historical beginning. row_canonical = jsonb_build_object(...)::text with microsecond-precision UTC ISO-8601. Appends serialized via pg_advisory_xact_lock to avoid concurrent-write chain races. Two verify RPCs: fn_verify_audit_edit_log_chain (internal consistency) + fn_verify_audit_log_matches_edit_log (cross-table consistency). RLS read: waypoint_admin everywhere + district admin/principal scoped. Phase 1 alone is detection; Phase 2 (external Storage backup) makes detection preventative.',
    date: SESSION_DATE,
  },
]

async function main() {
  console.log('Fetching current ops state...')
  const res = await fetch(
    `${OPS_URL}/rest/v1/command_center?key=eq.main&select=value&order=updated_at.desc&limit=1`,
    { headers: hdrs },
  )
  if (!res.ok) {
    console.error('GET failed:', res.status, await res.text())
    process.exit(1)
  }
  const rows = await res.json()
  if (!rows.length) {
    console.error('No ops state found at key=main')
    process.exit(1)
  }
  const state = JSON.parse(rows[0].value)
  console.log(`State loaded: ${state.handoffs?.length || 0} handoffs, ${state.decisions?.length || 0} decisions`)

  // Idempotency check: skip if Session CC24 already in handoffs
  if (state.handoffs.find((h) => h.session === SESSION_LABEL)) {
    console.log(`${SESSION_LABEL} already in handoffs — skipping handoff push`)
  } else {
    state.handoffs.push({
      id: state.nextHoId++,
      ...handoffEntry,
    })
    console.log(`Pushed ${SESSION_LABEL} handoff (id=${state.handoffs[state.handoffs.length - 1].id})`)
  }

  let addedDecs = 0
  for (const d of newDecisions) {
    if (state.decisions.find((x) => x.rule === d.rule)) {
      console.log(`Decision already present, skipping: ${d.rule.slice(0, 60)}...`)
      continue
    }
    state.decisions.push({
      id: state.nextDecId++,
      rule: d.rule,
      why: d.why,
      by: SESSION_LABEL,
      date: d.date,
    })
    addedDecs++
  }
  console.log(`Added ${addedDecs} new decisions`)

  console.log('Patching state back to ops...')
  const patchRes = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main`, {
    method: 'PATCH',
    headers: { ...hdrs, Prefer: 'return=minimal' },
    body: JSON.stringify({
      value: JSON.stringify(state),
      updated_at: new Date().toISOString(),
    }),
  })
  if (!patchRes.ok) {
    console.error('PATCH failed:', patchRes.status, await patchRes.text())
    process.exit(1)
  }
  console.log('Ops sync complete.')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
