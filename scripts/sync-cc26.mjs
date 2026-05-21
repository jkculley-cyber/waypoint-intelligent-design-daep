// CC26 ops Command Center sync
// Pushes the CC26 handoff + 1 new decision to ops Supabase command_center table.

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co'
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'
const hdrs = { apikey: OPS_KEY, Authorization: `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' }

const SESSION = 'Session CC26'
const DATE = '2026-05-21'

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
    focus: 'Split sandbox into per-product districts (Explorer ISD = Waypoint+Meridian, Lincoln HS = Navigator) so marketing visitors see distinct products',
    done: [
      'Explorer ISD narrowed to [waypoint, meridian]; navigator orphans cleaned (12 refs + 21 placements + 6 supports)',
      'Lincoln High School district seeded at new UUID 33333333-...; admin explore-navigator@clearpathedgroup.com; 10 students + full Navigator dataset',
      'SandboxCrossSellBanner mounted in AppShell (per-district dismiss key)',
      'LoginPage from-path validated against hasProduct() so stale product URLs no longer hit RequireProduct walls',
      'send-notification welcome_navigator_demo template updated with Lincoln HS subheader + new cred (user redeployed via Dashboard)',
      'Audit sentinel re-seeded in production (was missing despite migration 071 — 4th schema-drift discovery this quarter)',
      'fix_explorer_admin.mjs one-shot repaired Explorer ISD admin profile (past collision had wiped it)',
      '3 PRs merged: #5 split + #6 seed/login fixes + #7 per-district dismiss key',
      '1 DECISIONS.md entry: one product per sandbox; marketing-page creds map 1:1 to product',
    ],
    next: [
      'Extend schema-drift CI to row-level invariants (sentinel UUID, baseline rows) — would have caught this session early',
      'Verify-and-backup-audit-chain gateway still carryover from CC24',
    ],
  })
}

// Decision
const newDecisions = [
  {
    rule: 'One product per sandbox district. Marketing-page demo credentials map 1:1 to the product the page sells. Cross-sell lives on the marketing site, not inside a sandbox a visitor is using to evaluate a single product.',
    why: 'Prior shared-sandbox approach (Explorer ISD with [waypoint, navigator, meridian]) made Navigator and Waypoint feel like tabs in one app instead of distinct purchases. Per-product sandbox districts + an in-app cross-sell banner preserve discovery without polluting the evaluation experience.',
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
console.log('✓ Ops Command Center synced: handoff + 1 decision pushed')
