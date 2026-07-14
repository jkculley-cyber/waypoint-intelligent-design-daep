// Cloudflare Pages Function: /api/store-register
//
// Emails a store buyer their Zelle payment instructions the moment they
// complete Step 1 (registration) of the 2-step checkout on store.html.
// Without this, a buyer who closes the tab at Step 2 has no record of how
// to pay — the registration lands in Formspree/ops, but the buyer is
// stranded. The /api/store-drip nudge is the backstop if this send fails.
//
// Called fire-and-forget from submitPaidNotification (store.html). Public
// endpoint (it backs a public form); it only ever sends the fixed
// instructions template to the address given, with user-supplied fields
// escaped and length-capped.
//
// Required env (already set on cpeg-site for /api/recover-license):
//   RESEND_API_KEY

const DEFAULT_FROM = 'Clear Path Education Group <support@clearpathedgroup.com>';
const ZELLE_LINK = 'https://enroll.zellepay.com/qr-codes?data=ewogICJ0b2tlbiIgOiAiY2xlYXJwYXRoZWRncm91cCIsCiAgImFjdGlvbiIgOiAicGF5bWVudCIsCiAgIm5hbWUiIDogIkNMRUFSIFBBVEggRURVQ0FUSU9OIEdST1VQLCBMTEMiCn0=';
const QR_URL = 'https://clearpathedgroup.com/zelle-qr.jpg';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex' },
  });
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const isRealEmail = (e) =>
  typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function buildEmail({ name, product, amount }) {
  const first = (name || '').trim().split(/\s+/)[0] || 'there';
  const amt = amount ? `${amount} ` : '';
  const subject = `Your Clear Path order — how to complete your Zelle payment`;
  const text = `Hi ${first},

You're registered for: ${product}

To complete your purchase, send ${amt}via Zelle:

1. On your phone, open this link (it opens Zelle directly):
   ${ZELLE_LINK}
   Or scan the QR code from your banking app: ${QR_URL}
2. The recipient will show as CLEAR PATH EDUCATION GROUP, LLC.
3. Put "${product}" in the Zelle memo.

We'll email your files/license key to this address within one business day of your payment clearing.

Already sent your Zelle? You're all set — no further action needed.

Questions? Just reply — this inbox is read by a person.

Kim
Clear Path Education Group, LLC
—
You're receiving this because you registered a purchase on clearpathedgroup.com. If this wasn't you, ignore this email — nothing was charged.`;
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.55;color:#1a2332;max-width:560px">
<p>Hi ${esc(first)},</p>
<p>You're registered for: <strong>${esc(product)}</strong></p>
<p>To complete your purchase, send ${amount ? `<strong>${esc(amount)}</strong> ` : ''}via Zelle:</p>
<ol>
<li>On your phone, <a href="${ZELLE_LINK}"><strong>tap here to open Zelle directly</strong></a> — or scan the <a href="${QR_URL}">QR code</a> from your banking app.</li>
<li>The recipient will show as <strong>CLEAR PATH EDUCATION GROUP, LLC</strong>.</li>
<li>Put <strong>&quot;${esc(product)}&quot;</strong> in the Zelle memo.</li>
</ol>
<p>We'll email your files/license key to this address within one business day of your payment clearing.</p>
<p>Already sent your Zelle? You're all set — no further action needed.</p>
<p>Questions? Just reply — this inbox is read by a person.</p>
<p>Kim<br>Clear Path Education Group, LLC</p>
<p style="font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;margin-top:24px">You're receiving this because you registered a purchase on clearpathedgroup.com. If this wasn't you, ignore this email — nothing was charged.</p>
</body></html>`;
  return { subject, text, html };
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    return jsonResponse(503, { error: 'RESEND_API_KEY not configured' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'invalid JSON' });
  }

  const email = (body.email || '').trim();
  const name = (body.name || '').trim().slice(0, 80);
  const product = (body.product || '').trim().slice(0, 120);
  const amount = ((body.amount || '').trim().match(/^\$[\d.]{1,8}$/) || [''])[0];

  if (!isRealEmail(email) || !product) {
    return jsonResponse(400, { error: 'email and product required' });
  }

  const { subject, text, html } = buildEmail({ name, product, amount });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RECOVERY_FROM_EMAIL || DEFAULT_FROM,
      to: [email],
      reply_to: 'support@clearpathedgroup.com',
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    return jsonResponse(502, { error: `resend ${res.status}` });
  }
  return jsonResponse(200, { ok: true });
}
