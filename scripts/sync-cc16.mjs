// CC16 ops sync — push CC16 handoff + 5 new decisions to clearpath-ops.pages.dev
// command_center state. Runs once at session close per CLAUDE.md procedure.

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

const SESSION = 'Session CC16'

// 2. Handoff entry
if (!state.handoffs.find(h => h.session === SESSION)) {
  state.handoffs.push({
    id: state.nextHoId++,
    session: SESSION,
    date: '2026-04-30',
    author: 'Archer',
    focus: 'Round-3 adversarial audit + Tier 1+2 patches → Navigator 1.0 ship-ready',
    done: [
      'Hearing Packet PDF Unicode fix (pdfSafe helper for non-WinAnsi chars ≤≥→←)',
      'Ethan referral seed extension — surfaces him in Escalation queue for prior-failure walkthrough',
      'Round-3 adversarial multi-voice audit (4 voices in parallel)',
      'Verdicts: Marsha 72→84% ship-it, Reyes IDEA DEFENDABLE/Title VI TENUOUS, Chen conditional w/ 4 conditions, Sam 58/42→60/40',
      'Tier 1+2 patches: items 1–7 of round-3 closure (#8 Escalation caching deferred)',
      'Migration 070 — race_ethnicity reconciliation + backfill + PEIMS variant normalization + NOT NULL',
      'Migration 071 — sentinel UUID seed in auth.users + profiles',
      'Migration 072 — reason_history + description_history JSONB integrity CHECK',
      'TrendCell amber pill for "insufficient" (closes 3-voice convergent C1)',
      'ParentNotifyCell timezone-aware lag math + TZ tooltip (closes Marsha N3)',
      'Implausible parent-notify audit banner (closes Sam #3)',
      'Schema-drift CI tripwire (scripts/check-schema-drift.mjs + workflow)',
      'Migrations 070, 071, 072 applied to production',
      'Discovery: Disproportionality by-race silently broken since shipped — now functional',
    ],
    next: [
      '5-min visual walkthrough of CC16 patches against post-deploy app',
      'Manually trigger schema-drift workflow to confirm CI config',
      'CLAUDE.md closing-checklist update (push step + verify-deploy step)',
      'Item #8 Escalation pagination + risk-score caching (during pilot, half-day)',
      'Cloudflare Pages routing recheck (CC13 carryover)',
    ],
  })
} else {
  console.log(`${SESSION} handoff already present — skipping insert`)
}

// 3. New decisions
const newDecisions = [
  {
    rule: 'Constraint-tightening migrations must include a normalization/coercion step BEFORE VALIDATE, not just NULL backfill.',
    why: 'Migration 070 first failed VALIDATE (23514) because production had PEIMS letter codes (H, B), PEIMS numeric codes (1-5), and natural-language variants (Hispanic/Latino, African American) that didn\'t match the canonical enum. Pattern: probe → backfill NULL → normalize known variants → coerce remaining unmappable to sentinel → ADD CONSTRAINT NOT VALID → VALIDATE. Reusable for any free-text → enum boundary.',
    date: '2026-04-30',
  },
  {
    rule: 'Source migration files reaffirmed NOT ground truth — third drift discovery in three weeks.',
    why: 'CC14 audit_log shape, CC15 audit.js entity_id, CC16 race column. Migration 006 renamed race_ethnicity → race; later migrations + app code never followed; Disproportionality by-race silently bucketed everyone into not_specified. Drift fix migrations must be defensive (handle all column-name states). pg_dump-vs-source audits should become recurring discipline.',
    date: '2026-04-30',
  },
  {
    rule: 'Schema-drift CI tripwire pattern: probe column existence on app-load-bearing tables via PostgREST .select(cols).limit(0).',
    why: 'Not a full schema diff. A focused tripwire on 8 audited tables. Missing/renamed columns return PostgREST 4xx and fail CI. Cost <2 hrs; would have caught audit_log shape divergence and race column rename within a day. Reusable for Beacon, Apex, ops site.',
    date: '2026-04-30',
  },
  {
    rule: 'Sentinel UUID for service-role audit fallback is seeded as a real auth.users row with non-loginable password, NOT closed by dropping the FK.',
    why: 'Preserves FK as safety check for non-sentinel user_id values. Idempotent ON CONFLICT DO NOTHING. Matching profiles row labels writes as "System (Audit Sentinel)". After 071 applied, service-role / cron / batch-import succeeds.',
    date: '2026-04-30',
  },
  {
    rule: 'JSONB integrity CHECK constraints: required-keys + monotonic time-ordering + future-stamp rejection for any history-array column.',
    why: 'Migration 072 closes Reyes #1 — direct-SQL backdating attack on reason_history. NOT VALID/VALIDATE pattern grandfathers existing data. Doesn\'t reach immutable audit_edit_log table bar (T3). Reusable for Beacon session-note edits, Apex observation revisions, Meridian transition revisions.',
    date: '2026-04-30',
  },
]

let added = 0
for (const d of newDecisions) {
  if (!state.decisions.find(x => x.rule === d.rule)) {
    state.decisions.push({ id: state.nextDecId++, rule: d.rule, why: d.why, by: SESSION, date: d.date })
    added++
  }
}

// 4. PATCH back
const patchRes = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main`, {
  method: 'PATCH',
  headers: { ...hdrs, 'Prefer': 'return=minimal' },
  body: JSON.stringify({ value: JSON.stringify(state), updated_at: new Date().toISOString() }),
})

if (!patchRes.ok) {
  console.error(`PATCH failed (${patchRes.status}):`, await patchRes.text())
  process.exit(1)
}

console.log(`✓ Synced CC16: ${state.handoffs.length} handoffs total, ${added} new decisions added (${state.decisions.length} total)`)
