const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co';
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA';
const hdrs = { 'apikey': OPS_KEY, 'Authorization': `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' };

const res = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main&select=value&order=updated_at.desc&limit=1`, { headers: hdrs });
const rows = await res.json();
if (!rows.length) { console.log('No ops state found, skipping sync'); process.exit(0); }
const state = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;

const sessionLabel = 'Session CC25';
const today = '2026-05-19';

if (!state.handoffs.find(h => h.session === sessionLabel)) {
  state.handoffs.push({
    id: state.nextHoId++,
    session: sessionLabel,
    date: today,
    author: 'Archer',
    focus: 'Marketing-site demo funnel cleanup — PR #1 merged to main, Cloudflare redeployed, user verified fix live.',
    done: [
      'Replaced 8 mailto-disguised / login-wall demo CTAs across index.html, navigator.html, waypoint.html, store.html, ttess-observation-tracker.html with real form / anchor links that surface sandbox creds within one click.',
      'Added new #demo section to waypoint.html inlining Explorer ISD sandbox credentials with one-click Open Demo button.',
      'Wired Navigator demo form to POST in parallel to Formspree + ops demo_leads + new welcome_navigator_demo email template; user deployed Edge Function via Supabase Dashboard.',
      'Removed duplicate "View Live Demo" hero CTA on navigator.html (both ended at same destination; only one delivered creds).',
      'Fixed bogus ap@lincoln-hs.demo credential reference (account never existed) → real Explorer ISD sandbox account.',
      'Cleaned up stale Apex trial link on TTESS page → matches Apex "Notify Me" pattern while Apex is paused.',
      'Canonicalized Navigator demo URLs to extensionless /navigator#pilot.',
      'PR #1 merged to main (commit 02ff610) via squash; Cloudflare auto-deployed; user verified fix live with hard refresh.'
    ],
    next: [
      'CC24 carryover (still blocking hourly audit-chain backup): probe verify-and-backup-audit-chain gateway, ship supabase/config.toml verify_jwt=false, re-run smoke-test-082.',
      'CC24 Phase 3 UI — Waypoint Admin "Chain Integrity" page reading audit_chain_backup_state (gateway-independent).',
      'Yellow items deferred from CC25: Beacon district-adoption mailto at beacon-product.html:240 (user wants left as-is until Beacon needs to scale); Apex waitlist form for the 5 "Notify Me" mailto\'s (defer until Apex unpauses); hero carousel CTA cleanup on index.html (currently duplicates product cards below).',
      'Optional: add lead-capture form to waypoint.html#demo to mirror Navigator pattern if Waypoint demo-explorer volume becomes a useful pipeline signal.'
    ]
  });
}

const newDecisions = [{
  rule: 'Every "demo" or "try" CTA on the marketing site must land users on credentials within one click — no mailto: demo buttons, no links that dump users at the live-app login wall without sandbox creds surfaced.',
  why: 'CC25 audit found 8 violations across index.html, waypoint.html, navigator.html, and ttess-observation-tracker.html that produced login-wall bounces and email-client interruptions exactly when the lead was hottest. Acceptable patterns: form-gated (Navigator), inline-creds (Waypoint #demo), license-gated download (Beacon/Investigator). Sandbox creds shown publicly must be Explorer ISD (explore@clearpathedgroup.com / Explore2026!), never Lone Star ISD (curated for internal walkthroughs). Account names in marketing copy must exist in docs/demo-accounts.md or supabase/seed_sandbox.mjs.',
  date: today
}];

for (const d of newDecisions) {
  if (!state.decisions.find(x => x.rule === d.rule)) {
    state.decisions.push({ id: state.nextDecId++, rule: d.rule, why: d.why, by: sessionLabel, date: d.date });
  }
}

const patch = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main`, {
  method: 'PATCH',
  headers: { ...hdrs, 'Prefer': 'return=minimal' },
  body: JSON.stringify({ value: JSON.stringify(state), updated_at: new Date().toISOString() })
});

console.log('PATCH status:', patch.status);
console.log('handoffs now:', state.handoffs.length, '· decisions now:', state.decisions.length);
