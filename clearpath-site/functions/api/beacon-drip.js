// Cloudflare Pages Function: /api/beacon-drip
//
// Beacon trial-nurture + license-renewal email engine. Called once a day by
// a GitHub Actions cron (see .github/workflows/beacon-drip-cron.yml) — Pages
// Functions have no scheduler of their own.
//
// What it sends (via Resend, from support@clearpathedgroup.com):
//   Trial drip, keyed off ops demo_leads (utm_source=beacon), stopped the
//   moment the email holds ANY Beacon license:
//     welcome  — day 0   "your first 10 minutes"
//     day3     — day 3   the 80/20 ring + crisis docs
//     day10    — day 10  4 days left, what activating keeps
//     day13    — day 13  trial ends tomorrow
//   Renewal, keyed off ops product_licenses (product=beacon, status=active):
//     renewal_30 — expires within 30 days
//     renewal_7  — expires within 7 days
//
// Idempotency: sent-markers per (email, stage) live in the ops command_center
// KV table under key 'beacon_drip_log' — no new tables, no DDL. If several
// drip stages come due at once (catch-up after downtime), only the LATEST is
// sent and the earlier ones are marked, so nobody gets four emails in one
// morning. Leads older than 15 days on first sight are skipped entirely.
//
// Auth: requires header  x-cron-secret: <CRON_SECRET env>.
// Dry run: POST /api/beacon-drip?dry=1  → returns the send plan as JSON,
// sends nothing, writes nothing. Use this to verify before going live.
//
// Required env (Cloudflare Pages -> cpeg-site -> Settings -> Variables):
//   OPS_SUPABASE_SERVICE_ROLE_KEY   (already set for /api/verify-attestation)
//   RESEND_API_KEY                  (already set for /api/recover-license)
//   CRON_SECRET                     (NEW — random string, same value stored
//                                    as the DRIP_CRON_SECRET GitHub secret)

const OPS_DEFAULT_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co';
const DEFAULT_FROM = 'Clear Path Education Group <support@clearpathedgroup.com>';
const STATE_KEY = 'beacon_drip_log';
const MAX_SENDS_PER_RUN = 50;
const STORE_URL = 'https://clearpathedgroup.com/store.html#card-beacon';
const APP_URL = 'https://beacon.clearpathedgroup.com';

const DAY_MS = 86400000;

// Drip stages in order. dueAt = days since trial signup.
const DRIP_STAGES = [
  { key: 'welcome', dueAt: 0 },
  { key: 'day3', dueAt: 3 },
  { key: 'day10', dueAt: 10 },
  { key: 'day13', dueAt: 13 },
];
const LEAD_MAX_AGE_DAYS = 15; // older than this on first sight → never drip

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex' },
  });
}

/* ─── Email templates ─── */

const FOOTER_TEXT = `
—
Clear Path Education Group, LLC · support@clearpathedgroup.com
You're receiving this because you started a Beacon trial. Reply "stop" and we'll never email you again.`;

const footerHtml = `<p style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;margin-top:24px">
Clear Path Education Group, LLC · <a href="mailto:support@clearpathedgroup.com">support@clearpathedgroup.com</a><br>
You're receiving this because you started a Beacon trial. Reply "stop" and we'll never email you again.</p>`;

function wrapHtml(inner) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.55;color:#1a2332;max-width:560px">${inner}${footerHtml}</body></html>`;
}

function firstName(name) {
  return (name || '').trim().split(/\s+/)[0] || 'there';
}

const TEMPLATES = {
  welcome: (lead) => ({
    subject: 'Welcome to Beacon — your first 10 minutes',
    text: `Hi ${firstName(lead.name)},

Welcome to Beacon. Here's the fastest path to "this is worth it":

1. Import your caseload — Students -> Import CSV. Name, grade, teacher, tier. Two minutes.
2. Log one session — open a student -> Log Session. Thirty seconds, and it auto-logs your time.
3. Look at the ring — the dashboard's 80/20 gauge is now tracking your SB 179 compliance for you.

Everything stays on your device — nothing is sent to any server. That's the point.

Your trial runs 14 days. After that it's $79/year ($8/month), and everything you log during the trial stays exactly where it is.

Questions? Just reply — this inbox is read by a person.

Kim
Clear Path Education Group${FOOTER_TEXT}`,
    html: wrapHtml(`<p>Hi ${firstName(lead.name)},</p>
<p>Welcome to Beacon. Here's the fastest path to "this is worth it":</p>
<ol>
<li><strong>Import your caseload</strong> — Students → Import CSV. Name, grade, teacher, tier. Two minutes.</li>
<li><strong>Log one session</strong> — open a student → Log Session. Thirty seconds, and it auto-logs your time.</li>
<li><strong>Look at the ring</strong> — the dashboard's 80/20 gauge is now tracking your SB 179 compliance for you.</li>
</ol>
<p>Everything stays on your device — nothing is sent to any server. That's the point.</p>
<p>Your trial runs 14 days. After that it's <strong>$79/year</strong> ($8/month), and everything you log during the trial stays exactly where it is.</p>
<p>Questions? Just reply — this inbox is read by a person.</p>
<p>Kim<br>Clear Path Education Group</p>`),
  }),

  day3: (lead) => ({
    subject: 'The two things counselors keep Beacon for',
    text: `Hi ${firstName(lead.name)},

Three days in — two features worth trying this week if you haven't:

1. The 80/20 ring. Every session you log feeds it automatically. When your principal asks about SB 179 compliance, you export the report instead of reconstructing a semester from memory.

2. Crisis documentation. The red "Crisis Now" button walks you through a structured workflow (suicide screen, threat assessment, abuse report) and produces a tamper-evident, independently verifiable PDF. It's documentation that holds up when it matters most.

Open Beacon: ${APP_URL}

Reply if anything is confusing — I read every message.

Kim${FOOTER_TEXT}`,
    html: wrapHtml(`<p>Hi ${firstName(lead.name)},</p>
<p>Three days in — two features worth trying this week if you haven't:</p>
<p><strong>1. The 80/20 ring.</strong> Every session you log feeds it automatically. When your principal asks about SB 179 compliance, you export the report instead of reconstructing a semester from memory.</p>
<p><strong>2. Crisis documentation.</strong> The red "Crisis Now" button walks you through a structured workflow (suicide screen, threat assessment, abuse report) and produces a tamper-evident, independently verifiable PDF. It's documentation that holds up when it matters most.</p>
<p><a href="${APP_URL}">Open Beacon →</a></p>
<p>Reply if anything is confusing — I read every message.</p>
<p>Kim</p>`),
  }),

  day10: (lead) => ({
    subject: '4 days left on your Beacon trial',
    text: `Hi ${firstName(lead.name)},

Your trial ends in about 4 days. What activating keeps:

- Everything you've logged — students, sessions, time entries, notes. Nothing is deleted either way; the trial just stops accepting new entries when it ends.
- Automatic encrypted backups to your OneDrive/Drive folder.
- The compliance ring, crisis documentation, CREST portfolio, and every report.

$79 for the year (or $8/month). Pay via Zelle on the store page and your license key arrives by email, usually the same day:
${STORE_URL}

Kim${FOOTER_TEXT}`,
    html: wrapHtml(`<p>Hi ${firstName(lead.name)},</p>
<p>Your trial ends in about 4 days. What activating keeps:</p>
<ul>
<li><strong>Everything you've logged</strong> — students, sessions, time entries, notes. Nothing is deleted either way; the trial just stops accepting new entries when it ends.</li>
<li><strong>Automatic encrypted backups</strong> to your OneDrive/Drive folder.</li>
<li>The compliance ring, crisis documentation, CREST portfolio, and every report.</li>
</ul>
<p><strong>$79 for the year</strong> (or $8/month). Pay via Zelle on the store page and your license key arrives by email, usually the same day:</p>
<p><a href="${STORE_URL}">Get your license →</a></p>
<p>Kim</p>`),
  }),

  day13: (lead) => ({
    subject: 'Your Beacon trial ends tomorrow',
    text: `Hi ${firstName(lead.name)},

Tomorrow your trial switches to read-only: you'll still be able to see and export everything you logged, but new entries pause until a license is activated.

Keeping it is simple — $79/year via Zelle on the store page, license key by email, paste it into Settings -> License, and you're back in under a minute:
${STORE_URL}

If Beacon wasn't the right fit, no hard feelings — I'd genuinely value one reply telling me what was missing.

Kim${FOOTER_TEXT}`,
    html: wrapHtml(`<p>Hi ${firstName(lead.name)},</p>
<p>Tomorrow your trial switches to read-only: you'll still be able to see and export everything you logged, but new entries pause until a license is activated.</p>
<p>Keeping it is simple — <strong>$79/year</strong> via Zelle on the store page, license key by email, paste it into Settings → License, and you're back in under a minute:</p>
<p><a href="${STORE_URL}">Get your license →</a></p>
<p>If Beacon wasn't the right fit, no hard feelings — I'd genuinely value one reply telling me what was missing.</p>
<p>Kim</p>`),
  }),

  renewal_30: (lic) => ({
    subject: 'Your Beacon license renews soon',
    text: `Hi ${firstName(lic.customer_name)},

Your Beacon license expires on ${new Date(lic.expires_at).toLocaleDateString()} — about a month out.

Renewing is the same as buying: $79 via Zelle on the store page. Your license key stays the same, so there's nothing to re-enter and no interruption to your data:
${STORE_URL}

Thanks for a year of Beacon.

Kim${FOOTER_TEXT}`,
    html: wrapHtml(`<p>Hi ${firstName(lic.customer_name)},</p>
<p>Your Beacon license expires on <strong>${new Date(lic.expires_at).toLocaleDateString()}</strong> — about a month out.</p>
<p>Renewing is the same as buying: <strong>$79</strong> via Zelle on the store page. Your license key stays the same, so there's nothing to re-enter and no interruption to your data:</p>
<p><a href="${STORE_URL}">Renew →</a></p>
<p>Thanks for a year of Beacon.</p>
<p>Kim</p>`),
  }),

  renewal_7: (lic) => ({
    subject: 'Beacon renewal — one week left',
    text: `Hi ${firstName(lic.customer_name)},

Quick reminder: your Beacon license expires on ${new Date(lic.expires_at).toLocaleDateString()}. After that, Beacon goes read-only (your data stays safe and viewable) until the renewal lands.

$79 via Zelle on the store page — your key stays the same:
${STORE_URL}

Kim${FOOTER_TEXT}`,
    html: wrapHtml(`<p>Hi ${firstName(lic.customer_name)},</p>
<p>Quick reminder: your Beacon license expires on <strong>${new Date(lic.expires_at).toLocaleDateString()}</strong>. After that, Beacon goes read-only (your data stays safe and viewable) until the renewal lands.</p>
<p><strong>$79</strong> via Zelle on the store page — your key stays the same:</p>
<p><a href="${STORE_URL}">Renew →</a></p>
<p>Kim</p>`),
  }),
};

/* ─── Ops Supabase helpers ─── */

async function opsFetch(env, path, init = {}) {
  const url = `${env.OPS_SUPABASE_URL || OPS_DEFAULT_URL}/rest/v1/${path}`;
  const key = env.OPS_SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  return res;
}

async function loadState(env) {
  const res = await opsFetch(env, `command_center?key=eq.${STATE_KEY}&select=value`);
  if (!res.ok) throw new Error(`state load failed: ${res.status}`);
  const rows = await res.json();
  if (rows.length === 0) return { exists: false, state: { sent: {}, optout: [] } };
  try {
    const parsed = JSON.parse(rows[0].value);
    return { exists: true, state: { sent: parsed.sent || {}, optout: parsed.optout || [] } };
  } catch {
    return { exists: true, state: { sent: {}, optout: [] } };
  }
}

async function saveState(env, state, exists) {
  const body = JSON.stringify({ key: STATE_KEY, value: JSON.stringify(state), updated_at: new Date().toISOString() });
  const res = exists
    ? await opsFetch(env, `command_center?key=eq.${STATE_KEY}`, { method: 'PATCH', body, headers: { Prefer: 'return=minimal' } })
    : await opsFetch(env, 'command_center', { method: 'POST', body, headers: { Prefer: 'return=minimal' } });
  if (!res.ok) throw new Error(`state save failed: ${res.status} ${await res.text().catch(() => '')}`);
}

async function sendEmail(env, to, { subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RECOVERY_FROM_EMAIL || DEFAULT_FROM,
      to: [to],
      reply_to: 'support@clearpathedgroup.com',
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text().catch(() => '')}`);
}

const isRealEmail = (e) =>
  typeof e === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) &&
  !/@example\.|@test\.|@beacon\.local/i.test(e);

/* ─── Plan computation (pure) ─── */

export function computePlan({ leads, licenses, state, now }) {
  const plan = [];
  const licensedEmails = new Set(
    licenses.map((l) => (l.customer_email || '').toLowerCase()).filter(Boolean)
  );
  const optout = new Set((state.optout || []).map((e) => e.toLowerCase()));

  // Dedupe leads by email, keeping the EARLIEST signup (that's when the
  // 14-day clock started; re-submitting the form doesn't restart the drip).
  const byEmail = new Map();
  for (const lead of leads) {
    const email = (lead.email || '').toLowerCase();
    if (!isRealEmail(email)) continue;
    const prev = byEmail.get(email);
    if (!prev || (lead.created_at || '') < (prev.created_at || '')) byEmail.set(email, lead);
  }

  for (const [email, lead] of byEmail) {
    if (licensedEmails.has(email) || optout.has(email)) continue;
    const created = new Date(lead.created_at || 0).getTime();
    if (!created) continue;
    const ageDays = (now - created) / DAY_MS;
    const sent = state.sent[email] || {};
    if (ageDays > LEAD_MAX_AGE_DAYS && Object.keys(sent).length === 0) continue; // stale lead, never dripped — leave alone
    const due = DRIP_STAGES.filter((s) => ageDays >= s.dueAt && !sent[s.key]);
    if (due.length === 0) continue;
    const toSend = due[due.length - 1]; // latest due wins; earlier ones marked skipped
    plan.push({
      kind: 'drip',
      email,
      stage: toSend.key,
      markAlso: due.slice(0, -1).map((s) => s.key),
      lead,
    });
  }

  for (const lic of licenses) {
    const email = (lic.customer_email || '').toLowerCase();
    if (!isRealEmail(email) || optout.has(email)) continue;
    if (lic.status !== 'active' || !lic.expires_at) continue;
    const daysLeft = (new Date(lic.expires_at).getTime() - now) / DAY_MS;
    if (daysLeft <= 0) continue;
    const sent = state.sent[email] || {};
    if (daysLeft <= 7 && !sent.renewal_7) {
      plan.push({ kind: 'renewal', email, stage: 'renewal_7', markAlso: sent.renewal_30 ? [] : ['renewal_30'], lead: lic });
    } else if (daysLeft <= 30 && !sent.renewal_30 && !sent.renewal_7) {
      plan.push({ kind: 'renewal', email, stage: 'renewal_30', markAlso: [], lead: lic });
    }
  }

  return plan.slice(0, MAX_SENDS_PER_RUN);
}

/* ─── Handler ─── */

export async function onRequestPost({ request, env }) {
  if (!env.CRON_SECRET) {
    return jsonResponse(503, { error: 'CRON_SECRET not configured — set it in Cloudflare Pages env.' });
  }
  if (request.headers.get('x-cron-secret') !== env.CRON_SECRET) {
    return jsonResponse(401, { error: 'unauthorized' });
  }
  if (!env.OPS_SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) {
    return jsonResponse(503, { error: 'missing OPS_SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY' });
  }

  const dry = new URL(request.url).searchParams.get('dry') === '1';

  let leads = [];
  let licenses = [];
  try {
    const [leadsRes, licRes] = await Promise.all([
      opsFetch(env, 'demo_leads?utm_source=eq.beacon&select=name,email,created_at&order=created_at.asc'),
      opsFetch(env, 'product_licenses?product=eq.beacon&select=customer_email,customer_name,status,expires_at'),
    ]);
    if (!leadsRes.ok) throw new Error(`demo_leads ${leadsRes.status}`);
    if (!licRes.ok) throw new Error(`product_licenses ${licRes.status}`);
    leads = await leadsRes.json();
    licenses = await licRes.json();
  } catch (err) {
    return jsonResponse(502, { error: `ops fetch failed: ${err.message}` });
  }

  let stateWrap;
  try {
    stateWrap = await loadState(env);
  } catch (err) {
    return jsonResponse(502, { error: err.message });
  }
  const { state, exists } = stateWrap;

  const now = Date.now();
  const plan = computePlan({ leads, licenses, state, now });

  if (dry) {
    return jsonResponse(200, {
      dry: true,
      leads: leads.length,
      licenses: licenses.length,
      planned: plan.map((p) => ({ email: p.email, stage: p.stage, markAlso: p.markAlso })),
    });
  }

  const results = [];
  for (const item of plan) {
    try {
      const tmpl = TEMPLATES[item.stage](item.lead);
      await sendEmail(env, item.email, tmpl);
      const nowIso = new Date().toISOString();
      state.sent[item.email] = state.sent[item.email] || {};
      state.sent[item.email][item.stage] = nowIso;
      for (const skipped of item.markAlso) {
        state.sent[item.email][skipped] = `skipped:${nowIso}`;
      }
      results.push({ email: item.email, stage: item.stage, ok: true });
    } catch (err) {
      results.push({ email: item.email, stage: item.stage, ok: false, error: err.message });
    }
  }

  // Persist markers even on partial failure — successful sends must never repeat.
  if (results.some((r) => r.ok)) {
    try {
      await saveState(env, state, exists);
    } catch (err) {
      return jsonResponse(500, { error: `sent ${results.filter((r) => r.ok).length} but state save failed: ${err.message}`, results });
    }
  }

  return jsonResponse(200, { sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
}
