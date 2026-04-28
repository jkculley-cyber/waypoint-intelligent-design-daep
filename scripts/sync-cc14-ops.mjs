// CC14 ops sync — push handoff + 3 new decisions to clearpath-ops command_center
// Run: node scripts/sync-cc14-ops.mjs

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co'
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA'
const hdrs = { apikey: OPS_KEY, Authorization: `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' }

const SESSION = 'Session CC14'
const DATE = '2026-04-28'
const AUTHOR = 'Archer'

const newDecisions = [
  {
    rule: 'Audit-log writes from server-side triggers are fail-loud, not silent-swallow.',
    why: 'CC14 round-1 Navigator audit: Chen named "audit_log silently swallows + zero Navigator mutations are audited" the single most-damaging finding. App-layer audit() had silent-swallow catch{} AND was never called from Navigator. DB-trigger path captures every mutation regardless of origin and cannot be bypassed.',
    date: DATE,
  },
  {
    rule: 'PL/pgSQL trigger functions shared across tables of different shapes must use either nested IF blocks or jsonb-based dynamic field access — never AND-combined conditions referencing table-specific columns.',
    why: 'PL/pgSQL does not short-circuit AND inside IF conditions; field references like OLD.description in such conditions raise "record has no field" when the trigger fires on a table without that column. Migration 068 fixed Navigator audit trigger via nested IFs; the jsonb (->> "fieldname") pattern is the maximally defensive form.',
    date: DATE,
  },
  {
    rule: 'Source migration files are NOT ground truth for production database schema. Probe via supabase.from(table).select(column).limit(1) before assuming a column exists.',
    why: 'CC14 discovery: production audit_log has (user_id NOT NULL FK, changes JSONB) but migration 035 source declares (actor_id, actor_role, old_values, new_values). audit.js had been silently rejecting every Waypoint audit write since 035 was applied (~70 days). The fail-loud trigger pattern surfaced it for the first time. Schema drift outside source-controlled migrations is invisible behind silent-swallow patterns.',
    date: DATE,
  },
]

const handoff = {
  session: SESSION,
  date: DATE,
  author: AUTHOR,
  focus: 'Navigator round-1 adversarial audit + T1+T2 patches + smoke 7/7 + audit_log shape divergence discovery',
  done: [
    'Three-voice adversarial audit on Navigator: Sam Ortega (Panorama poaching Lincoln HS), Marsha Wilkerson (Title-I AP), Reyes+Chen (IDEA/Title VI plaintiff + district CIO). Marsha verdict: 42% — "Not Ready."',
    'Six convergent findings caught by 2+ voices: 10-day SPED rule unenforced, parent-notice honor-system, audit log silent-swallow, disproportionality lacks race/SPED disaggregation, escalation engine ranks-not-routes, free-text editable post-hoc.',
    'Migration 066: manifestation_determinations table + 10-day SPED trigger (RAISE EXCEPTION P0001 with IDEA 34 CFR §300.530 message) + parent_notified_method enum + parent_contact_notes + server-set timestamp trigger + reason_history/description_history JSONB + race_ethnicity CHECK + cumulative-days view + audit triggers.',
    'Migration 067: corrective audit-trigger fix after discovering production audit_log schema diverged from migration 035 source. Production has (user_id, changes JSONB); 035 declared (actor_id, old_values, new_values). audit.js + useEntityAuditTrail also patched.',
    'Migration 068: PL/pgSQL nested-IF fix — AND does not short-circuit inside IF conditions, field refs in unreached AND-branches still get evaluated.',
    'T2 UI: useDisproportionalityByRace hook with OCR risk-index + severity buckets + small-cell suppression at n<10; reason-history viewer modal; Hearing Packet single-click PDF (8 sections, FERPA-watermarked); Escalation Engine pre-flight panel with DUPLICATE/PRIOR FAILURE chips.',
    '7/7 smoke tests pass via scripts/smoke-test-066.mjs against production Lone Star ISD demo (authenticated as admin@lonestar-isd.org).',
    'Three new decisions logged: fail-loud audit triggers; PL/pgSQL trigger gotcha; production schema is not source-of-truth.',
  ],
  next: [
    'Round-2 adversarial audit on Navigator — calibrate post-T1+T2 score; expected mid-50s to low 60s.',
    '5-min UI walkthrough of Disproportionality by-race + Hearing Packet PDF + Escalation Engine duplicate detection.',
    'Cloudflare Pages routing recheck (CC13 carryover, untouched today).',
    'Navigator T3 backlog: SIS integration, mobile-first quick-referral, RLS function-based policies, CSV import limits, Effectiveness reframe, SOC 2.',
  ],
}

async function main() {
  // 1. GET current state
  const r = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main&select=value,updated_at&order=updated_at.desc&limit=1`, { headers: hdrs })
  const rows = await r.json()
  if (!rows.length) { console.log('No ops state row found, aborting'); return }
  const state = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value

  // 2. Add handoff if not present (dedupe by session label)
  if (!state.handoffs.find(h => h.session === SESSION)) {
    handoff.id = state.nextHoId++
    state.handoffs.push(handoff)
    console.log(`Added handoff: ${SESSION}`)
  } else {
    console.log(`Handoff ${SESSION} already exists, skipping`)
  }

  // 3. Add decisions if not present (dedupe by rule prefix)
  for (const d of newDecisions) {
    const key = d.rule.slice(0, 60)
    if (!state.decisions.find(x => x.rule.startsWith(key))) {
      state.decisions.push({ id: state.nextDecId++, rule: d.rule, why: d.why, by: SESSION, date: d.date })
      console.log(`Added decision: "${key}…"`)
    } else {
      console.log(`Decision already present: "${key}…"`)
    }
  }

  // 4. PATCH back
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
