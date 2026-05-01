// CC18 ops sync — push CC18 handoff + 1 new decision (Bobby / no forced login)
// to clearpath-ops.pages.dev command_center state. Runs once at session close
// per CLAUDE.md procedure.

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co'
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'
const hdrs = { 'apikey': OPS_KEY, 'Authorization': `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' }

// 1. GET current state
const res = await fetch(
  `${OPS_URL}/rest/v1/command_center?key=eq.main&select=value&order=updated_at.desc&limit=1`,
  { headers: hdrs }
)
const rows = await res.json()
if (!rows.length) { console.error('No ops state found'); process.exit(1) }
const state = JSON.parse(rows[0].value)

const SESSION = 'Session CC18'

// 2. Handoff entry
if (!state.handoffs.find(h => h.session === SESSION)) {
  state.handoffs.push({
    id: state.nextHoId++,
    session: SESSION,
    date: '2026-05-01',
    author: 'Archer',
    focus: 'Apex R4 Tier 1 — R4-3 + R4-4 + R4-1 shipped (3 of 5); R4-2 + R4-5 deferred; session ended on smoke-test friction',
    done: [
      'R4-3 shipped (commit d44d936): migration 017 cleanup_runs table (RLS service-role-only, status=running on entry, updates to ok/partial/error with metrics) + apex-audio-cleanup edge function rewritten to refuse work if audit row INSERT fails',
      'R4-4 shipped (d44d936): PROVENANCE OPERANDS block in STEP 0 of generate-coaching-draft + ib-coaching-draft — ACTIONS/COUNTS/DURATIONS/QUOTES required, paraphrase that strips operand-shape rejected, no fabrication',
      'R4-1 shipped (d44d936): migration 018 observation_edits table (RLS per-principal SELECT, no INSERT/UPDATE/DELETE policies = append-only) + immutable ai_draft_original / ai_summary_original snapshot columns + fn_audit_observation_edit() BEFORE UPDATE trigger using to_jsonb(OLD/NEW)->field pattern (CC14 lesson — disjoint-column safety) + useObservationEdits hook + ObservationEditHistoryModal (AI original-vs-current panel + per-field side-by-side diff) + ObservationReviewPage Coaching Narrative gets View edit history button',
      'Migrations 017 + 018 applied to production by user (018 second-paste 42710 confirmed first-paste committed; migration file patched mid-session with DROP POLICY IF EXISTS for idempotency, local-only post-session)',
      'Apex frontend deployed via Cloudflare Pages auto-build on d44d936; user verified View edit history button visible at apex.clearpathedgroup.com/observe/:id',
      '3 edge functions deployed by user (apex-audio-cleanup, generate-coaching-draft, ib-coaching-draft) — but final smoke returned Hello undefined! template response, deploy state for apex-audio-cleanup unverified end-to-end',
      'Bobby decision logged: no forced login for signing/receiving party in any Clear Path product. Magic-link only with single-use token + 14-day expiry + signed_at/via/ip provenance capture. Buyer-side login stays as-is. R4-2 design locked to this rule.',
      'New feedback memory: don\'t ping-pong on smoke-test verification loops — first round should be comprehensive (full output, not just status code); ambiguous results should be trusted + flagged in closeout, not re-verified mid-flow',
    ],
    next: [
      'Verify apex-audio-cleanup deploy state (open Code view in Supabase dashboard; should NOT start with const { name } = await req.json()). If template, redeploy from local file. After confirmed: smoke + check cleanup_runs has row with invoked_by=manual_smoke_r4',
      'Verify R4-1 trigger fires on real edits — edit any observation narrative, save, then SELECT field_name, edited_at FROM observation_edits ORDER BY edited_at DESC LIMIT 5',
      'Commit + push migration 018 idempotency patch (DROP POLICY IF EXISTS) — local edit only on Apex repo, not on origin/master',
      'R4-2 (post-conf magic-link signature, ~1 day): biggest blast radius of the five — public unauth /sign/:token route + email surface change + immutability trigger. Design locked to magic-link per Bobby decision. Recommend separate post_conference_signatures table, single-use token + 14-day expiry, signed_via + signed_ip capture',
      'R4-5 (inline approve drafts, ~half day): Karen N2 +5 retention',
      'IB observation page extension: wire View edit history button into IBObservationsPage.jsx (~30 min, identical pattern)',
      'CC16/CC17 carryover all still pending: Navigator walkthrough, schema-drift CI run, CLAUDE.md closing-checklist update, Cloudflare Pages routing recheck (CC13), verify-attestation page (CC12), DPA template finalization',
    ],
  })
} else {
  console.log(`${SESSION} handoff already present — skipping insert`)
}

// 3. New decisions
const newDecisions = [
  {
    rule: 'No forced login for the signing/receiving party in any Clear Path product. Magic-link only with single-use token + ~14-day expiry + signed_at/via/ip provenance capture.',
    why: 'Bobby (real Apex principal customer) churned earlier in Apex\'s life specifically over teacher-facing login friction. Receiving party has zero motivation to maintain an account in a vendor\'s system they didn\'t choose — friction floor is "click and sign," anything more is abandonment-shaped. Buyer (principal/counselor/AP) has the relationship; receiving party has a transactional obligation. Applies to: Apex teachers signing post-conference reflections (R4-2), Beacon parents acknowledging crisis notifications, Waypoint parents signing DAEP placements, Origins family-portal participants, future suite products. "More defensible against spoofing" arguments lose to "the feature has to ship and get used" — magic-link record + IP capture is enough provenance to defend; missing signature because teacher never logged in is indefensible. Full login UI is explicitly Tier 2/3, only justified when district contract REQUIRES account-anchored auth. Buyer-side login flow (principal in Apex, counselor in Beacon, AP in Waypoint) unrelated, stays as-is.',
    date: '2026-05-01',
  },
]

for (const d of newDecisions) {
  if (!state.decisions.find(x => x.rule === d.rule)) {
    state.decisions.push({
      id: state.nextDecId++,
      rule: d.rule,
      why: d.why,
      by: SESSION,
      date: d.date,
    })
  } else {
    console.log(`Decision already present — skipping: ${d.rule.slice(0, 60)}…`)
  }
}

// 4. PATCH back
const patchRes = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main`, {
  method: 'PATCH',
  headers: { ...hdrs, 'Prefer': 'return=minimal' },
  body: JSON.stringify({
    value: JSON.stringify(state),
    updated_at: new Date().toISOString(),
  }),
})

if (!patchRes.ok) {
  console.error('PATCH failed:', patchRes.status, await patchRes.text())
  process.exit(1)
}

console.log(`✓ ${SESSION} synced to ops command center`)
console.log(`  - handoffs: ${state.handoffs.length} (next id: ${state.nextHoId})`)
console.log(`  - decisions: ${state.decisions.length} (next id: ${state.nextDecId})`)
