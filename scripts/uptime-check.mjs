#!/usr/bin/env node
/**
 * X-2 — uptime + CORRECTNESS monitor for every customer-facing surface.
 *
 * Why this asserts on content and not just status codes:
 *   Every real incident in this codebase returned HTTP 200 while broken.
 *   - CC31: cpeg-site was rebuilt with Vite and served the WAYPOINT APP at
 *     clearpathedgroup.com. 200 + valid HTML. The site was "up" — wrong site.
 *   - B-2:  Pages Functions weren't bundled, so /api/* fell through to the SPA
 *     and returned HTML. The endpoint "responded" — with a web page.
 *   - Any nonexistent path returns the SPA fallback (~136KB of homepage HTML).
 *   A status-only monitor catches NONE of these. So every check below asserts
 *   on what came back, not merely that something came back.
 *
 * Design constraints:
 *   - READ-ONLY. No auth, no writes. The probe must never mutate customer data,
 *     and must never depend on a credential that can expire — a monitor that
 *     dies of its own stale secret is itself an X-2 failure.
 *   - STANDALONE. It must not call a Pages Function to do its work (the way the
 *     drip cron does): if the site is down, that Function is down too and could
 *     not report anything. This runs entirely in the Action.
 *   - TRANSIENT-TOLERANT. A failing check is retried after a short delay and
 *     only counts if it fails twice. That kills one-off blips without needing
 *     any persisted state between runs.
 *
 * Usage:
 *   node scripts/uptime-check.mjs           # check, exit 1 if anything is down
 *   node scripts/uptime-check.mjs --json    # machine-readable summary
 *   node scripts/uptime-check.mjs --quiet   # only print failures
 */

const TIMEOUT_MS = 15000;
const RECHECK_DELAY_MS = 20000; // gap before re-testing a failed check
const SPA_FALLBACK_BYTES = 136780; // the homepage served for any unknown path

/* ─── What we watch ───
 * expect:
 *   status        - required HTTP status after redirects (default 200)
 *   contentType   - substring the content-type must contain
 *   bodyContains  - substring(s) the body MUST contain
 *   bodyExcludes  - substring(s) the body MUST NOT contain
 *   notServed     - true = this URL must NOT return real content (leak guard)
 *   minBytes      - body must be at least this large
 */
export const CHECKS = [
  {
    name: 'marketing-home',
    url: 'https://clearpathedgroup.com/',
    critical: true,
    expect: {
      bodyContains: ['Clear Path Education Group'],
      // The exact CC31 signature: the Vite build of the Waypoint app served
      // at the marketing domain. It returned 200 and looked healthy.
      bodyExcludes: ['Waypoint DAEP', '<div id="root"></div>'],
    },
  },
  {
    name: 'api-ping',
    url: 'https://clearpathedgroup.com/api/ping',
    critical: true,
    // B-2: when Functions aren't bundled this returns the SPA's HTML instead.
    expect: { contentType: 'application/json' },
  },
  {
    name: 'api-verify-attestation',
    // Beacon prints this URL inside attested PDFs. A novel hash must return a
    // structured "not found", NOT an HTML page — that distinction is the
    // difference between a working witness and a vaporware claim.
    url: 'https://clearpathedgroup.com/api/verify-attestation?hash=x2monitorprobe000000000000000000000000000000000000000000000000000',
    expect: { contentType: 'application/json', anyStatus: true },
  },
  {
    name: 'verify-attestation-page',
    url: 'https://clearpathedgroup.com/verify-attestation',
    expect: { bodyContains: ['erif'] }, // Verify / verification, case-tolerant
  },
  {
    name: 'store',
    url: 'https://clearpathedgroup.com/store',
    critical: true,
    expect: { bodyContains: ['Zelle'] },
  },
  {
    name: 'activate',
    url: 'https://clearpathedgroup.com/activate',
    critical: true,
    // Customers land here after paying; if the key input is gone they cannot
    // activate anything they've bought.
    expect: { bodyContains: ['key-input'] },
  },
  {
    name: 'waypoint-app',
    url: 'https://waypoint.clearpathedgroup.com/',
    expect: { bodyContains: ['<div id="root"'] },
  },
  {
    name: 'beacon-app',
    url: 'https://beacon.clearpathedgroup.com/',
    expect: { bodyContains: ['<div id="root"'] },
  },
  {
    name: 'investigator-toolkit',
    url: 'https://investigatortoolkit.clearpathedgroup.com/',
    expect: { minBytes: 500 },
  },
  {
    name: 'ops-command-center',
    url: 'https://clearpath-ops.pages.dev/',
    expect: { minBytes: 500 },
  },
  {
    name: 'supabase-waypoint',
    url: 'https://kvxecksvkimcgwhxxyhw.supabase.co/rest/v1/',
    // Unauthenticated: 401/404 is a healthy, reachable PostgREST. Only 5xx or a
    // connection failure means the database tier is actually down.
    expect: { notServerError: true, anyStatus: true },
  },
  {
    name: 'supabase-ops',
    url: 'https://xbpuqaqpcbixxodblaes.supabase.co/rest/v1/',
    // Ops backs licensing — if this is down, /activate fails for every customer.
    expect: { notServerError: true, anyStatus: true },
  },

  /* ─── Leak regression guards ───
   * 2026-07-22: four paid teacher bundles ($7-$12) were publicly downloadable
   * from the deploy root. Removing them from the repo was not enough — the
   * Cloudflare edge cache kept serving two of them for hours afterwards. These
   * assert the files stay gone, at the edge, not just in git. */
  {
    name: 'leak-guard-bundle-1',
    url: 'https://clearpathedgroup.com/downloads/bundles/Bundle%20%231%20Partner%20Activities.pdf',
    expect: { notServed: true },
  },
  {
    name: 'leak-guard-bundle-4',
    url: 'https://clearpathedgroup.com/downloads/bundles/Bundle%20%234%20CFUs.pdf',
    expect: { notServed: true },
  },
];

/* ─── Assertion engine (pure — unit-tested offline) ─── */
export function evaluate(check, res) {
  const e = check.expect || {};
  const problems = [];

  if (res.error) return { ok: false, problems: [`request failed: ${res.error}`] };

  if (e.notServed) {
    // "Gone" means: the SPA fallback, or a 404 — anything but real content.
    const isRealContent =
      res.status === 200 &&
      !/text\/html/i.test(res.contentType || '') &&
      res.bytes > 1000;
    if (isRealContent) {
      problems.push(
        `URL still serves real content (${res.contentType}, ${res.bytes} bytes) — expected it to be gone. If it was just removed, purge the Cloudflare cache.`
      );
    }
    return { ok: problems.length === 0, problems };
  }

  if (!e.anyStatus) {
    const want = e.status || 200;
    if (res.status !== want) problems.push(`status ${res.status}, expected ${want}`);
  }
  if (e.notServerError && res.status >= 500) {
    problems.push(`server error ${res.status}`);
  }
  if (e.contentType && !(res.contentType || '').includes(e.contentType)) {
    problems.push(`content-type "${res.contentType}", expected to contain "${e.contentType}"`);
  }
  for (const s of e.bodyContains || []) {
    if (!(res.body || '').includes(s)) problems.push(`body missing expected text: "${s}"`);
  }
  for (const s of e.bodyExcludes || []) {
    if ((res.body || '').includes(s)) {
      problems.push(`body contains FORBIDDEN text: "${s}" — wrong site is being served`);
    }
  }
  if (e.minBytes && res.bytes < e.minBytes) {
    problems.push(`body only ${res.bytes} bytes, expected >= ${e.minBytes}`);
  }
  // Any HTML page that is byte-identical to the SPA fallback is a missing route.
  if (!e.allowFallback && res.bytes === SPA_FALLBACK_BYTES && !check.url.endsWith('/')) {
    problems.push(`served the ${SPA_FALLBACK_BYTES}-byte SPA fallback — route does not exist`);
  }

  return { ok: problems.length === 0, problems };
}

/* ─── Fetching ─── */
async function probe(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'clearpath-x2-uptime-monitor' },
    });
    // Read as bytes first so the size is accurate for BINARY responses too —
    // text-decoding a PDF and measuring the string inflates the count (a 10MB
    // PDF reported as 16MB), which would put a wrong number in an alert.
    const buf = Buffer.from(await r.arrayBuffer());
    const contentType = r.headers.get('content-type') || '';
    // Only decode to text when it could plausibly be text; no point building a
    // 10MB string out of a PDF just to run substring checks that don't apply.
    const isTextual = /text\/|json|javascript|xml|html/i.test(contentType);
    return {
      status: r.status,
      contentType,
      body: isTextual ? buf.toString('utf8') : '',
      bytes: buf.length,
      ms: Date.now() - started,
    };
  } catch (err) {
    return { error: err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err.message, ms: Date.now() - started };
  } finally {
    clearTimeout(t);
  }
}

async function runCheck(check) {
  const res = await probe(check.url);
  return { check, res, verdict: evaluate(check, res) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─── Optional rich alert. Absent RESEND_API_KEY, the workflow's own failure
 * is the alert (GitHub emails the repo owner) — so this stays zero-config. ─── */
async function sendAlert(failures) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no RESEND_API_KEY (workflow failure is the alert)' };
  const to = process.env.ALERT_EMAIL || 'support@clearpathedgroup.com';
  const lines = failures
    .map((f) => `• ${f.check.name} — ${f.check.url}\n    ${f.verdict.problems.join('\n    ')}`)
    .join('\n\n');
  const text = `${failures.length} production check(s) failing.\n\n${lines}\n\nRun: ${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY || ''}/actions/runs/${process.env.GITHUB_RUN_ID || ''}`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.ALERT_FROM || 'Clear Path Monitor <support@clearpathedgroup.com>',
        to: [to],
        subject: `[X-2] ${failures.length} production check(s) FAILING`,
        text,
      }),
    });
    return { sent: r.ok, reason: r.ok ? `emailed ${to}` : `resend ${r.status}` };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}

/* ─── Main ─── */
async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const quiet = args.includes('--quiet');

  const first = await Promise.all(CHECKS.map(runCheck));
  let failing = first.filter((r) => !r.verdict.ok);

  // Re-test only the failures. Two strikes filters transient blips without
  // persisting any state between runs.
  if (failing.length) {
    if (!asJson) console.log(`\n${failing.length} check(s) failed — re-testing in ${RECHECK_DELAY_MS / 1000}s to rule out a blip...`);
    await sleep(RECHECK_DELAY_MS);
    const second = await Promise.all(failing.map((f) => runCheck(f.check)));
    failing = second.filter((r) => !r.verdict.ok);
  }

  const failingNames = new Set(failing.map((f) => f.check.name));
  const results = first.map((r) => ({
    name: r.check.name,
    url: r.check.url,
    ok: !failingNames.has(r.check.name),
    ms: r.res.ms,
    problems: failingNames.has(r.check.name)
      ? (failing.find((f) => f.check.name === r.check.name)?.verdict.problems ?? r.verdict.problems)
      : [],
  }));

  if (asJson) {
    console.log(JSON.stringify({ ok: failing.length === 0, checked: results.length, failing: failing.length, results }, null, 2));
  } else {
    for (const r of results) {
      if (r.ok && quiet) continue;
      console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(26)} ${String(r.ms).padStart(5)}ms  ${r.url}`);
      for (const p of r.problems) console.log(`      ↳ ${p}`);
    }
    console.log(`\n${results.length - failing.length}/${results.length} checks passing.`);
  }

  if (failing.length) {
    const alert = await sendAlert(failing);
    if (!asJson) console.log(`Alert: ${alert.sent ? 'sent' : 'not sent'} — ${alert.reason}`);
    const criticals = failing.filter((f) => f.check.critical).map((f) => f.check.name);
    if (criticals.length) console.log(`::error::CRITICAL surfaces down: ${criticals.join(', ')}`);
    process.exit(1);
  }
}

// Only run when executed directly, so tests can import the pure parts.
if (process.argv[1] && process.argv[1].endsWith('uptime-check.mjs')) {
  main().catch((err) => {
    console.error('monitor crashed:', err);
    process.exit(1);
  });
}
