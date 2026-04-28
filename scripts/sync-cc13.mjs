// One-shot sync of CC13 handoff + decisions to the ops command center.

const OPS_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co';
const OPS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhicHVxYXFwY2JpeHhvZGJsYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk4MDQsImV4cCI6MjA4Nzk0NTgwNH0.9Rhmz-FLUXnEQXpRCkg3G2ppzPxs2DinaYDmdD_wvPA';
const hdrs = { apikey: OPS_KEY, Authorization: `Bearer ${OPS_KEY}`, 'Content-Type': 'application/json' };

const SESSION = 'Session CC13';
const DATE = '2026-04-28';
const AUTHOR = 'Archer';

const HANDOFF = {
  session: SESSION,
  date: DATE,
  author: AUTHOR,
  focus: 'Round-4 adversarial audit + ~20 fixes shipped + Cloudflare Pages routing blocker',
  done: [
    'Round-4 audit: Marcia 82->84% "buy. Confidently. Ship and call it 1.0." SCUTA priority list collapsed. Adversary lawyer on record: "record is admissible; weight is for the jury." Daubert framing withdrawn as wrong question; Rule 803(6) standard now passes.',
    'Tier 1 from round-4 (5 fixes shipped d6daedc): sync-status copy honest about local vs cloud confirm; PDF footer dual-timestamp clarity; SQL CHECK constraint on pdf_attestations.generated_at +/- 5min from now() blocks fabricated timestamps even from service-role key holder; Crisis picker fuzzy-match Levenshtein "Did you mean DeShawn Williams?"; Safari/Firefox banner explaining backup-folder feature is Chromium-only',
    'Tier 2 Beacon-side (e7da177): PWA cache-bust banner via vite.config.js build-stamp + version.json poll + "New version available" toast + service-worker SKIP_WAITING; lost-license recovery flow with "Forgot your key?" link -> modal -> POST to /api/recover-license -> Resend email with anti-enumeration',
    'Returning-customer signin flow (3d53855): /setup?signin=1 reframes as sign-in not trial + restore-from-backup .bcnbkp button',
    'Crisis picker walk-in fix (0662f54): "+ Add new student: NAME" inline option creates real student record, removes redundant suicide admin_action step, adds disposition step',
    'Parent + admin notification draft wording (187d502): no longer prints form-fill time as if it were incident time. Parent reads "today" or "on DATE"; admin separates Incident occurred from Documented',
    '$79/school year -> $79/year copy update across Beacon and marketing site',
    'Attestation chain works end-to-end now (71f2a06): client UUID + server-set generated_at + Prefer=return=minimal solves anon-INSERT-only RLS friction. Verified HTTP 201 against live ops Supabase',
    'CHECK constraint with NOT VALID applied to pdf_attestations.generated_at; verified blocking forgery via curl (23514)',
    'verify.clearpathedgroup.com subdomain provisioned: DNS CNAME + Pages custom domain Active. Page renders correctly with marketing chrome stripped',
    'Migrated cpeg-site deploy workflow from legacy cloudflare/pages-action@v1 to cloudflare/wrangler-action@v3',
  ],
  next: [
    'BLOCKER (first thing tomorrow): Cloudflare Pages routing recheck. curl https://clearpathedgroup.com/api/ping. If marketing HTML returned, execute Option A (delete + recreate cpeg-site Pages project, re-add custom domains and env vars). ~10 min',
    'Set RESEND_API_KEY env var on cpeg-site Production (encrypted secret) for /api/recover-license to actually send emails',
    'Mobile crisis-log experience (Marcia round 4 ask) - PWA mobile layout audit, touch targets, one-thumb crisis modal',
    'Vera Beacon user-guide rewrite covering CC10-13 features (overdue)',
    'TX-NDPA finalization (CC10/11/12/13 carryover)',
    'Tier 3 district-readiness backlog: cloud mode + district admin + SSO (SCUTA top fear); RFC-3161 / bonded TSA integration; voice capture (CC11)',
  ],
};

const DECISIONS = [
  {
    rule: 'License recovery for lost-key scenarios goes through email-back-to-buyer, not in-app self-service',
    why: 'License + email pair IS the encryption secret for .bcnbkp backups. In-app "show me my key" would defeat encryption. Email back to address on file is the right channel; Resend send is fail-soft and anti-enumeration. Closes SCUTA round-4 wedge "lost license = permanent data loss."',
    date: DATE,
  },
  {
    rule: 'PDF attestation chain: client-generated UUID + server-set generated_at + CHECK constraint enforcing ±5 min from now()',
    why: 'PostgREST Prefer=return=representation was incompatible with anon-INSERT-only RLS. Switched to Prefer=return=minimal + client UUID + omit generated_at from client INSERT body so server DEFAULT now() sets it authoritatively. Verify URL surfaces server timestamp. CHECK constraint with NOT VALID grandfathers existing rows; blocks fabricated past timestamps even from service-role-key holder. Verified HTTP 201 via curl + 23514 on backdated forgery attempt.',
    date: DATE,
  },
  {
    rule: 'Verify-attestation lives on dedicated subdomain verify.clearpathedgroup.com, not the marketing domain',
    why: 'Closes round-4 SCUTA + lawyer Q28 framing about "vendor witnessing themselves on marketing domain." Cloudflare Pages middleware redirects subdomain root to /verify-attestation; CSS standalone-mode strips marketing chrome. Reusable pattern for Apex/Toolkit verification endpoints.',
    date: DATE,
  },
  {
    rule: 'Cloudflare Pages legacy cloudflare/pages-action@v1 is deprecated; silently fails to register new Pages Functions on existing projects',
    why: 'Functions present at project init route correctly; new functions added later silently fall through to static-asset fallback. Migrate any new deploy chain to cloudflare/wrangler-action@v3 + wrangler pages deploy. If still stuck, recreate the Pages project. CC13 burned ~30 min diagnosing this.',
    date: DATE,
  },
  {
    rule: 'PWA cache-bust pattern: build emits version.json, page polls + shows "New version available" toast',
    why: 'Standard PWA upgrade pattern. Replaces "users must clear browser data" support footgun. Reusable for Apex, Investigator Toolkit, Waypoint admin. Build-stamp via vite.config.js plugin; service worker honors SKIP_WAITING postMessage; per-version dismiss key. Marcia (CC12 round 4): "going to make support tickets miserable at scale."',
    date: DATE,
  },
];

async function main() {
  const res = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main&select=value&order=updated_at.desc&limit=1`, { headers: hdrs });
  if (!res.ok) {
    console.error('GET failed:', res.status, await res.text());
    process.exit(1);
  }
  const rows = await res.json();
  if (!rows.length) { console.error('No ops state'); process.exit(1); }
  const stateRaw = rows[0].value;
  const state = typeof stateRaw === 'string' ? JSON.parse(stateRaw) : stateRaw;
  console.log(`Loaded: ${state.handoffs?.length} handoffs, ${state.decisions?.length} decisions`);

  if (!state.handoffs.find(h => h.session === SESSION)) {
    state.handoffs.push({ id: state.nextHoId++, ...HANDOFF });
    console.log(`+ handoff "${SESSION}"`);
  } else {
    console.log(`= "${SESSION}" already present`);
  }

  for (const d of DECISIONS) {
    if (!state.decisions.find(x => x.rule === d.rule)) {
      state.decisions.push({ id: state.nextDecId++, ...d, by: SESSION });
      console.log(`+ decision: ${d.rule.slice(0, 60)}...`);
    } else {
      console.log(`= already present: ${d.rule.slice(0, 60)}...`);
    }
  }

  const patchRes = await fetch(`${OPS_URL}/rest/v1/command_center?key=eq.main`, {
    method: 'PATCH',
    headers: { ...hdrs, Prefer: 'return=minimal' },
    body: JSON.stringify({ value: JSON.stringify(state), updated_at: new Date().toISOString() }),
  });
  if (!patchRes.ok) {
    console.error('PATCH failed:', patchRes.status, await patchRes.text());
    process.exit(1);
  }
  console.log(`OK — synced. ${state.handoffs.length} handoffs, ${state.decisions.length} decisions.`);
}

main().catch(e => { console.error(e); process.exit(1); });
