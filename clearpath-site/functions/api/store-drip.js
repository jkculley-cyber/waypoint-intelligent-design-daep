// Cloudflare Pages Function: /api/store-drip
//
// Registered-but-unpaid store purchase nudge. The store checkout registers
// the buyer (Formspree + ops demo_leads "REGISTER: <product> (<amount>)")
// BEFORE showing the Zelle QR, so some registrations never turn into a
// payment. This sends ONE follow-up with the payment instructions after
// NUDGE_AT_DAYS, then goes quiet.
//
// Stop condition: Kim moves the lead off status 'new' in Waypoint Admin →
// Leads when the Zelle lands (or the lead is dead) — only status=new rows
// are ever nudged. Called daily by the same GitHub Actions cron as
// /api/beacon-drip (.github/workflows/beacon-drip-cron.yml).
//
// Idempotency: sent-markers per (email|product) live in the ops
// command_center KV table under key 'store_drip_log' — no new tables.
// Leads older than 15 days on first sight are skipped entirely.
//
// Auth: requires header  x-cron-secret: <CRON_SECRET env>.
// Dry run: POST /api/store-drip?dry=1  → returns the send plan, sends nothing.
//
// Required env (all already set on cpeg-site for /api/beacon-drip):
//   OPS_SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, CRON_SECRET

const OPS_DEFAULT_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co';
const DEFAULT_FROM = 'Clear Path Education Group <support@clearpathedgroup.com>';
const STATE_KEY = 'store_drip_log';
const MAX_SENDS_PER_RUN = 25;
const NUDGE_AT_DAYS = 2;
const LEAD_MAX_AGE_DAYS = 15; // older than this on first sight → never nudge
const DAY_MS = 86400000;

const ZELLE_LINK = 'https://enroll.zellepay.com/qr-codes?data=ewogICJ0b2tlbiIgOiAiY2xlYXJwYXRoZWRncm91cCIsCiAgImFjdGlvbiIgOiAicGF5bWVudCIsCiAgIm5hbWUiIDogIkNMRUFSIFBBVEggRURVQ0FUSU9OIEdST1VQLCBMTEMiCn0=';
const QR_URL = 'https://clearpathedgroup.com/zelle-qr.jpg';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex' },
  });
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const isRealEmail = (e) =>
  typeof e === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) &&
  !/@example\.|@test\./i.test(e);

// referrer looks like "REGISTER: Campus Leadership Complete System ($52)"
// (older rows: "REGISTER: <product> ()" / "REGISTER: <product> (annual_$79)")
export function parseRegistration(referrer) {
  const m = /^REGISTER:\s*(.+?)\s*(?:\(([^)]*)\))?\s*$/.exec(referrer || '');
  if (!m) return null;
  const amount = ((m[2] || '').match(/\$[\d.]+/) || [''])[0];
  return { product: m[1], amount };
}

function firstName(name) {
  return (name || '').trim().split(/\s+/)[0] || 'there';
}

function buildNudge(lead, reg) {
  const first = firstName(lead.name);
  const amt = reg.amount ? `${reg.amount} ` : '';
  const subject = `Still want ${reg.product}? Your order is waiting`;
  const text = `Hi ${first},

A couple of days ago you registered for ${reg.product} on clearpathedgroup.com, and we haven't seen a matching Zelle payment yet — no worries if life got in the way.

Finishing up takes about a minute:

1. On your phone, open this link (it opens Zelle directly):
   ${ZELLE_LINK}
   Or scan the QR code from your banking app: ${QR_URL}
2. The recipient will show as CLEAR PATH EDUCATION GROUP, LLC.
3. Send ${amt}with "${reg.product}" in the memo.

Your files/license key arrive by email within one business day of the payment clearing.

Already paid? Then it's likely just working its way through the banks — you can ignore this, and reply if it's been more than a business day.

Changed your mind? No problem, and no charge was made. A one-line reply telling us what didn't fit genuinely helps.

Kim
Clear Path Education Group, LLC
—
You're receiving this one-time reminder because you registered a purchase on clearpathedgroup.com. We won't email you about it again.`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.55;color:#1a2332;max-width:560px">
<p>Hi ${esc(first)},</p>
<p>A couple of days ago you registered for <strong>${esc(reg.product)}</strong> on clearpathedgroup.com, and we haven't seen a matching Zelle payment yet — no worries if life got in the way.</p>
<p>Finishing up takes about a minute:</p>
<ol>
<li>On your phone, <a href="${ZELLE_LINK}"><strong>tap here to open Zelle directly</strong></a> — or scan the <a href="${QR_URL}">QR code</a> from your banking app.</li>
<li>The recipient will show as <strong>CLEAR PATH EDUCATION GROUP, LLC</strong>.</li>
<li>Send ${reg.amount ? `<strong>${esc(reg.amount)}</strong> ` : ''}with <strong>&quot;${esc(reg.product)}&quot;</strong> in the memo.</li>
</ol>
<p>Your files/license key arrive by email within one business day of the payment clearing.</p>
<p><strong>Already paid?</strong> Then it's likely just working its way through the banks — you can ignore this, and reply if it's been more than a business day.</p>
<p><strong>Changed your mind?</strong> No problem, and no charge was made. A one-line reply telling us what didn't fit genuinely helps.</p>
<p>Kim<br>Clear Path Education Group, LLC</p>
<p style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;margin-top:24px">You're receiving this one-time reminder because you registered a purchase on clearpathedgroup.com. We won't email you about it again.</p>
</body></html>`;
  return { subject, text, html };
}

/* ─── Ops Supabase helpers (same shape as beacon-drip) ─── */

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

/* ─── Plan computation (pure) ─── */

export function computeStoreNudges({ leads, state, now }) {
  const plan = [];
  const optout = new Set((state.optout || []).map((e) => e.toLowerCase()));
  const seen = new Set(); // dedupe by email|product, earliest registration wins

  for (const lead of leads) {
    const email = (lead.email || '').toLowerCase();
    if (!isRealEmail(email) || optout.has(email)) continue;
    const reg = parseRegistration(lead.referrer);
    if (!reg) continue;
    const key = `${email}|${reg.product.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (state.sent[key]) continue;
    const created = new Date(lead.created_at || 0).getTime();
    if (!created) continue;
    const ageDays = (now - created) / DAY_MS;
    if (ageDays < NUDGE_AT_DAYS || ageDays > LEAD_MAX_AGE_DAYS) continue;
    plan.push({ key, email, lead, reg });
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
    return jsonResponse(503, {
      error: 'missing required env binding(s)',
      missing: [
        !env.OPS_SUPABASE_SERVICE_ROLE_KEY && 'OPS_SUPABASE_SERVICE_ROLE_KEY',
        !env.RESEND_API_KEY && 'RESEND_API_KEY',
      ].filter(Boolean),
    });
  }

  const dry = new URL(request.url).searchParams.get('dry') === '1';

  let leads = [];
  try {
    // status=new means Kim hasn't matched a payment (or triaged it) yet.
    const res = await opsFetch(
      env,
      'demo_leads?referrer=like.REGISTER%3A*&status=eq.new&select=id,name,email,referrer,created_at&order=created_at.asc'
    );
    if (!res.ok) throw new Error(`demo_leads ${res.status}`);
    leads = await res.json();
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

  const plan = computeStoreNudges({ leads, state, now: Date.now() });

  if (dry) {
    return jsonResponse(200, {
      dry: true,
      unpaid_registrations: leads.length,
      planned: plan.map((p) => ({ email: p.email, product: p.reg.product, amount: p.reg.amount })),
    });
  }

  const results = [];
  for (const item of plan) {
    try {
      await sendEmail(env, item.email, buildNudge(item.lead, item.reg));
      state.sent[item.key] = new Date().toISOString();
      results.push({ email: item.email, product: item.reg.product, ok: true });
    } catch (err) {
      results.push({ email: item.email, product: item.reg.product, ok: false, error: err.message });
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
