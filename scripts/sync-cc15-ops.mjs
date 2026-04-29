// CC15 ops sync — push handoff + 4 new decisions to clearpath-ops command_center
// Run: node scripts/sync-cc15-ops.mjs

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co'
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'
const hdrs = { apikey: OPS_KEY, Authorization: `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' }

const SESSION = 'Session CC15'
const DATE = '2026-04-29'
const AUTHOR = 'Archer'

const newDecisions = [
  {
    rule: 'Hearing Packet PDF timeline shows free-text fields AS RECORDED at placement/referral time, not their current edited value.',
    why: 'CC15 round-2 audit, Marsha+Reyes converged: hearing officer reading the timeline saw today\'s edited reason; edit-history table buried in appendix was easy to miss. As-of-placement semantics inverts Reyes\'s would-be impeachment angle into the district\'s spoliation defense — the timeline IS the placement-time record, the edit history is disclosed-by-design audit trail. NOT a snapshot/exclude-edits toggle (would weaken Reyes-praised admissibility).',
    date: DATE,
  },
  {
    rule: 'Disproportionality longitudinal trend pattern: current 90-day vs prior 90-day window (days 91-180), per-cohort delta, n<5 suppression.',
    why: 'CC15 round-2 audit, Sam (Panorama poach) + Reyes (OCR investigator). Multi-year longitudinal deferred to T3 (requires enrollment_snapshots table or SIS export). Quarterly cadence is what Navigator\'s data volume actually supports today. Pattern reusable for any future quarterly-cadence trend view.',
    date: DATE,
  },
  {
    rule: 'Escalation Engine bulk-create on prior-failure same-type support: BLOCK by default, override requires reason captured into support notes for audit trail.',
    why: 'CC15 round-2 audit, Marsha D3 + Sam #5 convergent. CC14\'s T2.7 had a passive red warning that allowed proceed-anyway; Marsha called it cosmetic. Block-with-reason-override raises friction without locking out legitimate scenarios; reason text appended to notes as OVERRIDE PRIOR-FAILURE: <reason> closes the loop. Reusable pattern for any "block with documented override" flow.',
    date: DATE,
  },
  {
    rule: 'Client-set timestamps on server-controlled audit columns must RAISE, not silently overwrite. Same principle: silent-overwrite is the fail-mode that produces 8-week shadow-bugs.',
    why: 'CC15 migration 069 + audit.js entity_id guard. Marsha A: integration script could pass wrong field once, never realize, assume system records its provided timestamps. CC14 had already found audit_log shape divergence as 8-week shadow-bug; CC15 found the same fail-mode in parent_notified_at. Reject loudly so callers learn on first call.',
    date: DATE,
  },
]

const handoff = {
  session: SESSION,
  date: DATE,
  author: AUTHOR,
  focus: 'Navigator round-2 audit + T2.5/T2.6/T2.7 + B1-B4 patches + audit.js entity_id fix + migration 069 staged',
  done: [
    'Round-2 adversarial multi-voice audit on Navigator. Marsha 42% → 72% (+30); Sam 65/35 → 58/42 (Navigator gain); Reyes IDEA severe → elevated, Title VI severe → colorable; Chen still conditional pass.',
    'All six round-1 convergent findings closed: 10-day SPED rule, parent notice, audit log, disproportionality disaggregation+longitudinal, escalation block-with-override, reason-history with as-of-placement timeline.',
    'T2.5 Hearing Packet "as-of-placement": timeline shows reason_history[0]/description_history[0] with inline (edited Nx) annotation; edit-history table moved next to timeline.',
    'T2.6 Disproportionality longitudinal: useDisproportionalityByRace fetches current+prior 90d windows in parallel; ▲▼— Trend column on by-race + by-disability tables with n<5 suppression and tooltip.',
    'T2.7 Escalation block-with-override: skipPriorFailures defaults true; override requires reason captured into support notes; one-click "Switch to suggested alternative" via static MTSS map.',
    'B1 reason-history "edited Nx" amber chip on placement list actions cell. B2 risk-trigger chips + score in escalation bulk-create modal pre-flight panel. B3 migration 069 — parent-notice trigger raises P0001 on client-set parent_notified_at. B4 parent-notify lag chip on placements list with same-day → 4+d color escalation.',
    'audit.js entity_id required guard: production audit_log.entity_id is NOT NULL, helper was falling back to null. Fixed to skip + console.error before reaching DB. Verified audit() has zero callers in src/, so Chen\'s CC14 round-1 claim "Waypoint app-layer audit() still broken" was misdiagnosed.',
    'Migration 069 NOT YET applied (Apex PAT returned 401 against Waypoint project). Staged at supabase/migrations/069_navigator_parent_notice_strict.sql + run_069.mjs.',
    'Repo housekeeping: deleted scripts/probe-audit-log.mjs (one-shot diagnostic) + stray nul artifact at repo root.',
    'Four new decisions logged.',
  ],
  next: [
    'Apply migration 069 to production via Waypoint-scoped SB_PAT or SQL Editor paste; re-run smoke-test-066.mjs (8/8 expected post-apply).',
    'Round-3 adversarial audit on Navigator — Beacon went 40 → 58 → 82 → 84; Navigator at 72 after round 2 should land high-70s to low-80s on round 3.',
    '5-min UI walkthrough of CC14 + CC15 changes (Trend column, Hearing Packet PDF, Escalation pre-flight panel, edited-Nx chips, parent-notify lag chips).',
    'Cloudflare Pages routing recheck (CC13 carryover).',
    'Navigator T3 backlog: SIS integration, B5 at-risk-returning view, sentinel UUID seed, CI schema-drift, pg_dump production audit, code-review SOP for shared triggers.',
  ],
}

async function main() {
  const r = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main&select=value,updated_at&order=updated_at.desc&limit=1`, { headers: hdrs })
  const rows = await r.json()
  if (!rows.length) { console.log('No ops state row found, aborting'); return }
  const state = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value

  if (!state.handoffs.find(h => h.session === SESSION)) {
    handoff.id = state.nextHoId++
    state.handoffs.push(handoff)
    console.log(`Added handoff: ${SESSION}`)
  } else {
    console.log(`Handoff ${SESSION} already exists, skipping`)
  }

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
