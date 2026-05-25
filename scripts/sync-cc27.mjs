// CC27 ops Command Center sync
// Pushes the CC27 handoff + 2 new decisions to ops Supabase command_center table.

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co'
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'
const hdrs = { apikey: OPS_KEY, Authorization: `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' }

const SESSION = 'Session CC27'
const DATE = '2026-05-25'

const res = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main&select=value&order=updated_at.desc&limit=1`, { headers: hdrs })
const rows = await res.json()
const state = rows.length ? JSON.parse(rows[0].value) : null
if (!state) { console.log('No ops state found, skipping sync'); process.exit(0) }

// Handoff
if (!state.handoffs.find(h => h.session === SESSION)) {
  state.handoffs.push({
    id: state.nextHoId++,
    session: SESSION,
    date: DATE,
    author: 'Archer',
    focus: 'CC26 Tier 2 backlog cleared in one bundled PR — schema-drift CI extended to row-invariants, hero carousel deduped, Waypoint demo lead capture live and verified end-to-end',
    done: [
      'PR #8 merged (71af15d → a611ce4) — all 3 deploy/CI workflows green on merge commit',
      'scripts/check-schema-drift.mjs extended with REQUIRED_ROWS section — audit sentinel UUID is now a CI tripwire; passes 14/14 (13 column-shapes + 1 row-invariant)',
      'clearpath-site/index.html hero carousel deduped to 1 high-intent CTA per slide (8 → 4 buttons)',
      'clearpath-site/waypoint.html #demo replaced inline creds with 6-field lead-capture form (Name/Email/Phone/District/Role/Size); on submit fires 3 parallel POSTs (Formspree + ops demo_leads + send-notification welcome_demo_request); creds + Open Waypoint button reveal inline post-submit',
      'send-notification welcome_demo_request template personalized with {name} (matches welcome_navigator_demo; redeploy optional polish)',
      'End-to-end test lead verified live: demo_leads HTTP 201 + Formspree HTTP 200 + Resend message ID 23afb976-... + both emails landed in user inbox',
      '(Side quest, not Waypoint code) DAEP_Student_Tracker_2026-2027 v17 → v18 deep audit: 20 fixes (1,902 _xludf prefix cells, 3 arrayformula sheets, circular ref in Placements!AG, never-CSE\'d Quick Entry!B8, calendar→school day math); 22,386 formulas verified clean in real Excel 365; seeded v18_DEMO with 15 students/18 placements/30 logs/5 packets/5 levels/3 separations',
      '2 DECISIONS.md entries: CI row-invariants pattern + lead-gate vs one-click trade by buyer cycle length',
    ],
    next: [
      'Tier 1 #1: probe verify-and-backup-audit-chain gateway (T3 Phase 2 carryover from CC24)',
      'Tier 1 #2: ship Phase 3 UI "Chain Integrity" page reading audit_chain_backup_state (independent of gateway)',
      '(Optional) Redeploy send-notification Edge Function via Dashboard to activate {name} on welcome email',
    ],
  })
}

// Decisions
const newDecisions = [
  {
    rule: 'Schema-drift CI checks both column-shape AND required-row presence. Load-bearing seed rows (audit sentinel UUIDs, baseline configuration, required FK targets) are CI tripwires alongside columns. Demo/sample data does NOT belong in REQUIRED_ROWS — those are intentionally add/remove. Only rows that silently break a load-bearing flow when absent.',
    why: 'CC26 spent multiple rounds debugging audit sentinel drift because column-only checks couldn\'t catch a missing row. ~30-line CI extension prevents the next round. Pattern reusable for any Clear Path product\'s sentinel patterns (Apex principal_zero, Beacon counselor_zero, future Meridian baseline configs).',
    date: DATE,
  },
  {
    rule: 'Long-cycle B2B demo CTAs (Waypoint, Navigator) are lead-gated; short-cycle individual-purchase products (Beacon, Investigator Toolkit) stay one-click. Refines CC25 one-click-to-creds rule by buyer cycle length. >2 weeks cycle → lead-gate; ≤2 weeks (individual self-service) → one-click. Apex when it unpauses gets a waitlist form.',
    why: 'Waypoint inline-creds was leaving lead intel on the table — every sandbox visitor left zero CRM trace. Form-gated approach mirrors Navigator pattern (3 parallel POSTs to Formspree + ops demo_leads + send-notification welcome_demo_request). ~10% bounce trade is right for Marlene-class buyers who need 30-day nurture sequences. Three identical-shape forms is the extract cue; at N=2 per-product variation makes extraction premature.',
    date: DATE,
  },
]
for (const d of newDecisions) {
  if (!state.decisions.find(x => x.rule === d.rule)) {
    state.decisions.push({ id: state.nextDecId++, rule: d.rule, why: d.why, by: SESSION, date: d.date })
  }
}

const patchRes = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main`, {
  method: 'PATCH',
  headers: { ...hdrs, Prefer: 'return=minimal' },
  body: JSON.stringify({ value: JSON.stringify(state), updated_at: new Date().toISOString() }),
})
if (!patchRes.ok) {
  console.error('PATCH failed:', patchRes.status, await patchRes.text())
  process.exit(1)
}
console.log('✓ Ops Command Center synced: handoff + 2 decisions pushed')
