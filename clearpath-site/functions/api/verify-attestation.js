// Cloudflare Pages Function: /api/verify-attestation
// Looks up a Beacon-generated PDF's content hash against the ops Supabase
// `pdf_attestations` table and returns the attestation row if found.
//
// GET /api/verify-attestation?hash=<64-hex>
//   200 { found: true, row: { id, counselor_id, document_kind, generated_at } }
//   404 { found: false }
//   400 { error: "..." } — bad hash format
//   500 { error: "..." } — service-role key not configured / Supabase down
//
// Required Cloudflare Pages env (Settings -> Variables and Secrets -> Production):
//   OPS_SUPABASE_URL              (default: https://xbpuqaqpcbixxodblaes.supabase.co)
//   OPS_SUPABASE_SERVICE_ROLE_KEY (REQUIRED, store as ENCRYPTED secret)
//
// The service-role key is necessary because the pdf_attestations table has
// anon-INSERT-only RLS (counselors can write, no one but service-role can
// read). This is the right model — anon SELECT would let anyone enumerate
// hashes by counselor_id.

const OPS_DEFAULT_URL = 'https://xbpuqaqpcbixxodblaes.supabase.co';
const HASH_REGEX = /^[0-9a-f]{64}$/;

// Cache successful lookups 60s edge-side. Keeps Supabase load down when a
// reviewer hits refresh while reading the report. Not-found results are NOT
// cached (we want to retry quickly if the row was just inserted).
const SUCCESS_CACHE_SECONDS = 60;

function jsonResponse(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Robots-Tag': 'noindex',
      ...(extraHeaders || {}),
    },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const rawHash = (url.searchParams.get('hash') || '').trim().toLowerCase();

  if (!rawHash) {
    return jsonResponse(400, { error: 'Missing hash query parameter.' });
  }
  if (!HASH_REGEX.test(rawHash)) {
    return jsonResponse(400, { error: 'Invalid hash. Expected 64 lowercase hex characters.' });
  }

  const opsUrl = env.OPS_SUPABASE_URL || OPS_DEFAULT_URL;
  const serviceRoleKey = env.OPS_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return jsonResponse(500, { error: 'Verification service is not configured. Contact support@clearpathedgroup.com.' });
  }

  // Manual fetch with AbortController timeout. AbortSignal.timeout is
  // supported on workerd but Cloudflare Pages' build pipeline has been
  // observed to silently drop functions that reference newer-spec APIs;
  // an explicit AbortController is universally safe.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  let supabaseRes;
  try {
    supabaseRes = await fetch(
      `${opsUrl}/rest/v1/pdf_attestations?content_hash=eq.${encodeURIComponent(rawHash)}&select=id,counselor_id,document_kind,generated_at&order=generated_at.asc&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      }
    );
  } catch (err) {
    clearTimeout(timeoutId);
    return jsonResponse(502, { error: 'Could not reach attestation registry. Try again in a moment.' });
  }
  clearTimeout(timeoutId);

  if (!supabaseRes.ok) {
    const detail = await supabaseRes.text().catch(() => '');
    return jsonResponse(502, {
      error: 'Attestation registry returned an error.',
      status: supabaseRes.status,
      detail: detail.slice(0, 200),
    });
  }

  const rows = await supabaseRes.json().catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) {
    return jsonResponse(404, { found: false });
  }

  // Return the EARLIEST matching attestation. If a counselor regenerated the
  // PDF later, multiple rows may exist with the same hash — the first
  // registration is the one with chain-of-custody value. Cache 60s via
  // Cache-Control headers — Cloudflare's edge will honor these without us
  // needing to manually call the Cache API (which has been flaky in Pages
  // Functions builds in recent weeks).
  const row = rows[0];
  return jsonResponse(200, { found: true, row }, {
    'Cache-Control': `public, max-age=${SUCCESS_CACHE_SECONDS}, s-maxage=${SUCCESS_CACHE_SECONDS}`,
  });
}
