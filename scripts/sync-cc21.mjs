// Ops Command Center sync — CC21
// Pushes the CC21 handoff + 1 new decision to the ops Supabase command_center table.

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co';
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA';
const hdrs = { 'apikey': OPS_KEY, 'Authorization': `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' };

const res = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main&select=value&order=updated_at.desc&limit=1`, { headers: hdrs });
const rows = await res.json();
const state = rows.length ? JSON.parse(rows[0].value) : null;
if (!state) { console.log('No ops state found, skipping sync'); process.exit(0); }

const sessionLabel = 'Session CC21';
if (!state.handoffs.find(h => h.session === sessionLabel)) {
  state.handoffs.push({
    id: state.nextHoId++,
    session: sessionLabel,
    date: '2026-05-07',
    author: 'Archer',
    focus: 'Apex paused for new sign-ups on marketing site + Beacon/Navigator promoted + Beacon district plumbing logged as demand-pull (parked until Nicole surfaces Magnolia ISD requirements)',
    done: [
      'Marketing site: Apex Coming Soon across hero carousel, product picker tile, Tech Suite card, Individual Pricing card. Stats bar 5 → 4 live products. How-It-Works copy corrected.',
      'Marketing site: store.html Apex card replaced with Coming Soon notice; Buy-Now Zelle 2-step flow + email-capture form removed. Pricing rail tile updated.',
      'Marketing site: apex.html top Coming Soon banner + Notify Me CTA. Hero/Pricing CTAs replaced with Notify Me + See other products.',
      'Beacon + Navigator amplification: Individual Pricing reorder (Beacon → Investigator → Apex; Beacon now in prime first slot with Most Popular badge + teal glow). Tech Suite reorder (Apex moved from slot 3 → slot 5).',
      'Two commits pushed: b6390dd (marketing site) + 924fc67 (Beacon docs). Cloudflare Pages auto-deployed.',
      'Beacon repo deep-read: db.js adapter is already polymorphic, AuthContext supports both modes, Settings has hidden cloud toggle from CC9. 23 IndexedDB stores, ~14 cloud tables, 8+ stores have no cloud parity. RLS is single-counselor, no district layer.',
      'Path A audit written (4-week scope, district-of-one model, single-counselor RLS preserved): migrations 006-010, /admin/* UI, SSO config for Google/Microsoft, QA matrix on 9 affected pages, risk register.',
      'docs/beacon/path-a-pull-plan.md created — 361-line pull plan, executable when district pulls.',
      'docs/beacon/district-discovery-questions.md created — six questions for Nicole\'s upcoming Magnolia ISD leadership conversation (counselor count, admin-vs-caseload-sharing, SSO, SIS rostering, DPA decision-maker, budget cycle).',
      'DECISIONS.md 2026-05-07 entry: Beacon district plumbing is demand-pull, not push.',
      'Memory updated: project_beacon_district_readiness.md reframed PARKED, MEMORY.md index entry updated.',
    ],
    next: [
      'Wait for Nicole\'s Magnolia ISD conversation (next 1-2 weeks). Six discovery questions guide what comes back.',
      'When discovery answers arrive: execute docs/beacon/path-a-pull-plan.md as-is OR re-spike if answers point to caseload sharing (Path B), SIS rostering, or non-Google/Microsoft SSO.',
      'CC20 Apex carryover: Anthropic credits still depleted; R4-3 deploy verification still blocked; R4-2 testable on past observation; token-budget-per-tier still not built.',
      'Local-mode Beacon hardening (no district context needed): AES-GCM IndexedDB at rest (3-5d), native push (3d), Turnstile on referral form (1d).',
      'TX-NDPA finalization: clearpath-site/dpa.html staged but uncommitted, needs vendor info from user.',
    ],
  });
}

const newDecisions = [
  {
    rule: 'Beacon district plumbing is demand-pull, not push. Cloud-mode multi-tenant build (Path A or Path B) waits until a district contract conversation surfaces specific requirements.',
    why: 'Surfaced 2026-05-07. User explicit: "I am not ready to build beacon for district yet. Keep plan — as nicole shares with district leadership in the next week or so we will get insight on what all they want/need before we build." Prevents ~4 weeks of speculative cloud-mode build that might mismatch what the district actually wants. Aligns with 2026-05-06 cost-discipline lesson — size the build against confirmed customer demand, not presumed requirements. Reinforces data-isolation posture: no sharing of counselor data with admins or peers until a district contract specifies otherwise. Path A pull plan saved at docs/beacon/path-a-pull-plan.md; discovery questions at docs/beacon/district-discovery-questions.md.',
    date: '2026-05-07',
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
