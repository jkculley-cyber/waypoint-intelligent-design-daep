// Ops Command Center sync — CC19
// Pushes the CC19 handoff + 1 new decision to the ops Supabase command_center table.

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co';
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA';
const hdrs = { 'apikey': OPS_KEY, 'Authorization': `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' };

const res = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main&select=value&order=updated_at.desc&limit=1`, { headers: hdrs });
const rows = await res.json();
const state = rows.length ? JSON.parse(rows[0].value) : null;
if (!state) { console.log('No ops state found, skipping sync'); process.exit(0); }

const sessionLabel = 'Session CC19';
if (!state.handoffs.find(h => h.session === sessionLabel)) {
  state.handoffs.push({
    id: state.nextHoId++,
    session: sessionLabel,
    date: '2026-05-06',
    author: 'Archer',
    focus: 'Beacon real-pilot turnaround — Nicole texted 4 asks; all 4 shipped + 3 surfaced refinements; deploy verified live',
    done: [
      'Beacon: contact log gets date/time + click-to-edit (CommunicationsPage)',
      'Beacon: session log edit mode (SessionsPage QuickLogModal + SchedulePage SessionDetailModal)',
      'Beacon: schedule_events store + AddSessionModal "Other event" type with 8 sub-types (DB v5->v6, cloud migration 004 staged)',
      'Beacon: agenda view + text search across sessions+events with date-range filter',
      'Beacon: events color-coded by type (slate/amber/sky/violet/red/green/gray/neutral) + legends',
      'Beacon: session status visible on calendar (Completed/Make-up/Cancelled icons + style)',
      'Bonus: weekly+monthly grids now show student names instead of "Session" fallback',
      '4 Beacon commits pushed; deploy verified live on 51ea39b via bundle scan',
      '1 DECISION logged: schedule_events as separate store (not extending sessions table)',
    ],
    next: [
      'CC18 Apex carryover untouched: R4-3 deploy verify, R4-1 trigger smoke, R4-2 + R4-5, mig 018 idempotency commit',
      'Likely next from Nicole: recurring events; ICS export to include events; Cancelled session should remove auto-logged time entry',
      'Older Waypoint carryover: CC16 walkthrough, schema-drift workflow, CLAUDE.md update, CC13 routing recheck, CC12 verify-attestation',
    ],
  });
}

const newDecisions = [
  {
    rule: 'Calendar entries that aren\'t counseling sessions live in their own schedule_events table/store, not in sessions with a relaxed CHECK constraint.',
    why: 'sessions carries downstream semantics that don\'t apply to events (autoLogTime fires for individual/group only, SOAP-note flow is counseling-specific, status enum doesn\'t map cleanly). Every consumer of sessions would need to learn a new type and filter it (CC8-shape failure-mode propagation). Events have schema headroom they shouldn\'t share. Cost: ~15 lines duplicate query plumbing; zero downstream complexity. Pattern reusable for future Apex/Waypoint calendar entries that aren\'t observations/placements.',
    date: '2026-05-06',
  },
];

for (const d of newDecisions) {
  if (!state.decisions.find(x => x.rule === d.rule)) {
    state.decisions.push({ id: state.nextDecId++, rule: d.rule, why: d.why, by: sessionLabel, date: d.date });
  }
}

const patchRes = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main`, {
  method: 'PATCH',
  headers: { ...hdrs, 'Prefer': 'return=minimal' },
  body: JSON.stringify({ value: JSON.stringify(state), updated_at: new Date().toISOString() }),
});

if (!patchRes.ok) {
  console.error('PATCH failed:', patchRes.status, await patchRes.text());
  process.exit(1);
}

console.log(`Ops sync OK — handoffs=${state.handoffs.length} decisions=${state.decisions.length}`);
