// CC15 post-closeout ops sync — push the 3 post-closeout decisions to ops command_center.
// (The CC15 handoff entry already landed via sync-cc15-ops.mjs; this only adds decisions.)
// Run: node scripts/sync-cc15-postcloseout.mjs

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co'
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'
const hdrs = { apikey: OPS_KEY, Authorization: `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' }

const SESSION = 'Session CC15 (post-closeout)'
const DATE = '2026-04-29'

const newDecisions = [
  {
    rule: 'Scripts that mutate audited tables must signInWithPassword as a real user, not run with service-role-only auth.',
    why: 'CC15 walkthrough seed: service-role-only auth failed audit_log_user_id_fkey on every INSERT/UPDATE because migration 068 sentinel UUID (00000000-...) is not seeded in auth.users. signInWithPassword as admin@lonestar-isd.org resolves auth.uid() to a real profile and the seed succeeds. Until sentinel UUID is seeded, treat service-role as read-only on audited tables. Same trap will hit any cron, batch import, or background worker.',
    date: DATE,
  },
  {
    rule: 'Closing-process commit step in CLAUDE.md must explicitly include git push to origin/main. Local commits do not deploy.',
    why: 'CC15 closeout committed CC14 + CC15 + sync helper to local main but never pushed; Cloudflare Pages auto-deploys on push to origin/main, so production was running pre-CC14 build for 24+ hours. CC14 commit had the same omission. Verification step (post-push): confirm Cloudflare Pages deploy success via gh run list or curl-fetch a deployed asset chunk and grep for a distinctive new identifier. Applies to every Cloudflare Pages-hosted property in the suite.',
    date: DATE,
  },
  {
    rule: 'Walkthrough seed scripts use markered free-text fields for precise cleanup + idempotency guards on subsequent runs.',
    why: 'Pattern: session-tagged sentinel string in a free-text column (parent_contact_notes, notes); existence check before insert (skip if present); --clean arg filters by the marker for precise removal; seed remains idempotent after partial failures. Reusable for Beacon, Apex, Toolkit walkthroughs. Generalizes CC8 seeder cleanup rule (filter by tag, never tenant-wide). Reference impl: scripts/seed-cc15-walkthrough.mjs.',
    date: DATE,
  },
]

async function main() {
  const r = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main&select=value,updated_at&order=updated_at.desc&limit=1`, { headers: hdrs })
  const rows = await r.json()
  if (!rows.length) { console.log('No ops state row, aborting'); return }
  const state = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value

  for (const d of newDecisions) {
    const key = d.rule.slice(0, 60)
    if (!state.decisions.find(x => x.rule.startsWith(key))) {
      state.decisions.push({ id: state.nextDecId++, rule: d.rule, why: d.why, by: SESSION, date: d.date })
      console.log(`Added decision: "${key}…"`)
    } else {
      console.log(`Decision already present: "${key}…"`)
    }
  }

  const patch = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main`, {
    method: 'PATCH',
    headers: { ...hdrs, Prefer: 'return=minimal' },
    body: JSON.stringify({ value: JSON.stringify(state), updated_at: new Date().toISOString() }),
  })
  if (!patch.ok) {
    const txt = await patch.text()
    throw new Error(`PATCH failed: ${patch.status} ${txt}`)
  }
  console.log(`✓ ops command_center synced (${state.handoffs.length} handoffs, ${state.decisions.length} decisions total)`)
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1) })
