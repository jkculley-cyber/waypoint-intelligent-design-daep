// Cloudflare Pages Function: /api/recover-license
//
// Counselor lost her license key. Beacon's local-mode encryption uses
// PBKDF2(license_key + email) so without the key, her .bcnbkp backup is
// permanently unrecoverable. SCUTA's strongest competitive wedge — they
// pitch this as "Beacon = potentially-permanent data loss vs. SCUTA's
// cloud restore." Close it: a recovery flow that emails the key to the
// address used at purchase.
//
// POST { email }
//   200 { ok: true }   ALWAYS, regardless of whether the email matched.
//                       Anti-enumeration: a stranger probing for valid
//                       customer addresses gets the same response shape
//                       as a real customer. The actual feedback to the
//                       customer is via the email itself.
//   400 { error: "..." } only on malformed input
//   500 { error: "..." } only on misconfiguration
//
// Required env (Cloudflare Pages -> cpeg-site -> Settings -> Variables and Secrets):
//   OPS_SUPABASE_SERVICE_ROLE_KEY   (already set for /api/verify-attestation)
//   RESEND_API_KEY                  (NEW — get from https://resend.com/api-keys)
// Optional:
//   OPS_SUPABASE_URL                (default https://xbpuqaqpcbixxodblaes.supabase.co)
//   RECOVERY_FROM_EMAIL             (default 'Clear Path Education Group <support@clearpathedgroup.com>')

const OPS_DEFAULT_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co';
const DEFAULT_FROM = 'Clear Path Education Group <support@clearpathedgroup.com>';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Robots-Tag': 'noindex',
    },
  });
}

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200;
}

export async function onRequestPost({ request, env }) {
  let email;
  try {
    const body = await request.json();
    email = (body?.email || '').trim().toLowerCase();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }
  if (!isValidEmail(email)) {
    return jsonResponse(400, { error: 'Provide a valid email address.' });
  }

  const opsUrl = env.OPS_SUPABASE_URL || OPS_DEFAULT_URL;
  const serviceRoleKey = env.OPS_SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = env.RESEND_API_KEY;
  const fromEmail = env.RECOVERY_FROM_EMAIL || DEFAULT_FROM;

  if (!serviceRoleKey || !resendKey) {
    // Misconfigured — log to console (Cloudflare logs) but DON'T leak the
    // detail to a probing client. They get the generic 200 below.
    console.error('recover-license: missing OPS_SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY');
    return jsonResponse(200, { ok: true });
  }

  // Look up active licenses for this email. Using ilike for case-insensitive
  // match because some buyers register with mixed case in their email.
  // Manual AbortController instead of AbortSignal.timeout — see notes in
  // verify-attestation.js about Pages Functions build flakiness.
  let licenses = [];
  const lookupController = new AbortController();
  const lookupTimeout = setTimeout(() => lookupController.abort(), 6000);
  try {
    const lookupRes = await fetch(
      `${opsUrl}/rest/v1/product_licenses?customer_email=ilike.${encodeURIComponent(email)}&status=eq.active&select=license_key,product,customer_name,expires_at`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: 'application/json',
        },
        signal: lookupController.signal,
      }
    );
    if (lookupRes.ok) {
      licenses = await lookupRes.json();
    }
  } catch (err) {
    console.error('recover-license: ops lookup failed', err);
  }
  clearTimeout(lookupTimeout);

  if (!Array.isArray(licenses) || licenses.length === 0) {
    // No match — anti-enumeration: still return 200. The would-be attacker
    // gets the same response shape as a real customer.
    return jsonResponse(200, { ok: true });
  }

  // Build the recovery email. Single email lists all active keys for this
  // address (a counselor who bought Beacon AND Investigator Toolkit gets both).
  const customerName = licenses[0]?.customer_name || 'there';
  const keysList = licenses.map((l) => {
    const expires = l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'no expiration';
    const productLabel = ({ beacon: 'Beacon', toolkit: 'Investigator Toolkit', apex: 'Apex' })[l.product] || l.product;
    return `  ${productLabel}: ${l.license_key} (expires ${expires})`;
  }).join('\n');

  const textBody = `Hi ${customerName},

You requested a license key recovery for ${email}.

Your active Clear Path license keys:
${keysList}

To sign in to Beacon: visit https://beacon.clearpathedgroup.com/setup?signin=1
and paste the key into the License Key field.

If you also have a Beacon backup file (.bcnbkp), use the "Restore from
backup file" button on the same page. Decryption needs the license key
above PLUS the email address you used at purchase (${email}).

If you didn't request this recovery, you can ignore this email — the
key only works on a device that already has, or will set up, a Beacon
profile in your name.

Thanks,
Clear Path Education Group
support@clearpathedgroup.com
`;

  const htmlBody = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.55;color:#1a2332;max-width:560px">
<p>Hi ${customerName},</p>
<p>You requested a license key recovery for <strong>${email}</strong>.</p>
<p style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:14px 18px;font-family:'Courier New',monospace;font-size:14px">
${licenses.map((l) => {
  const expires = l.expires_at ? new Date(l.expires_at).toLocaleDateString() : 'no expiration';
  const productLabel = ({ beacon: 'Beacon', toolkit: 'Investigator Toolkit', apex: 'Apex' })[l.product] || l.product;
  return `<strong>${productLabel}:</strong> ${l.license_key} <span style="color:#6b7280">(expires ${expires})</span>`;
}).join('<br>')}
</p>
<p>To sign in to Beacon: <a href="https://beacon.clearpathedgroup.com/setup?signin=1">visit the sign-in page</a> and paste the key into the License Key field.</p>
<p>If you also have a Beacon backup file (<code>.bcnbkp</code>), use the <strong>Restore from backup file</strong> button on the same page. Decryption needs the license key above PLUS the email address you used at purchase (${email}).</p>
<p style="font-size:13px;color:#6b7280">If you didn't request this recovery, you can ignore this email — the key only works on a device that has or will set up a Beacon profile in your name.</p>
<p>Thanks,<br>Clear Path Education Group<br><a href="mailto:support@clearpathedgroup.com">support@clearpathedgroup.com</a></p>
</body></html>`;

  const sendController = new AbortController();
  const sendTimeout = setTimeout(() => sendController.abort(), 6000);
  try {
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Your Clear Path license key',
        text: textBody,
        html: htmlBody,
      }),
      signal: sendController.signal,
    });
    if (!sendRes.ok) {
      console.error('recover-license: Resend send failed', sendRes.status, await sendRes.text().catch(() => ''));
    }
  } catch (err) {
    console.error('recover-license: Resend send threw', err);
  }
  clearTimeout(sendTimeout);

  // Always 200 — see anti-enumeration note above.
  return jsonResponse(200, { ok: true });
}
