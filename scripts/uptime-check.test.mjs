/* Offline tests for the X-2 monitor's assertion engine (no network).
 * Run: node scripts/uptime-check.test.mjs
 *
 * The point of these: prove the monitor would actually have CAUGHT the real
 * incidents. A monitor nobody has tested against a known failure is a monitor
 * you're trusting on faith. */
import { evaluate, CHECKS } from './uptime-check.mjs';

let pass = 0, fail = 0;
const fails = [];
const ok = (c, label) => { if (c) pass++; else { fail++; fails.push(label); } };

const html = (body) => ({ status: 200, contentType: 'text/html; charset=utf-8', body, bytes: Buffer.byteLength(body) });
const json = (body = '{}') => ({ status: 200, contentType: 'application/json', body, bytes: Buffer.byteLength(body) });
const check = (name) => CHECKS.find((c) => c.name === name);

/* ── The real incidents ── */

// CC31: marketing domain served the Waypoint APP. 200, valid HTML, "up".
const cc31Body = '<!doctype html><html><head><title>Waypoint DAEP</title></head><body><div id="root"></div></body></html>';
ok(!evaluate(check('marketing-home'), html(cc31Body)).ok,
   'CC31: serving the Waypoint app at the marketing domain is CAUGHT');
ok(evaluate(check('marketing-home'), html(cc31Body)).problems.some((p) => /FORBIDDEN/.test(p)),
   'CC31: failure names the forbidden text');
// and a healthy homepage passes
ok(evaluate(check('marketing-home'), html('<html><body><h1>Clear Path Education Group</h1> Texas K-12</body></html>')).ok,
   'healthy marketing homepage passes');

// B-2: /api/* fell through to the SPA and returned HTML instead of JSON.
ok(!evaluate(check('api-ping'), html('<html><body>homepage</body></html>')).ok,
   'B-2: /api/ping returning HTML is CAUGHT');
ok(evaluate(check('api-ping'), json('{"ok":true}')).ok,
   'B-2: /api/ping returning JSON passes');

// A status-only monitor would have passed both of the above — prove ours doesn't.
ok(!evaluate(check('marketing-home'), html(cc31Body)).ok && !evaluate(check('api-ping'), html('x')).ok,
   'both CC31 and B-2 fail despite HTTP 200 (status-only monitoring is insufficient)');

/* ── SPA fallback detection ── */
const fallback = { status: 200, contentType: 'text/html; charset=utf-8', body: 'x'.repeat(136780), bytes: 136780 };
ok(!evaluate(check('store'), fallback).ok, 'SPA fallback on /store is CAUGHT');
ok(evaluate(check('store'), fallback).problems.some((p) => /fallback|route does not exist|missing expected/.test(p)),
   'fallback failure is explained');

/* ── Leak regression guards (the 2026-07-22 bundle leak) ── */
const pdf = { status: 200, contentType: 'application/pdf', body: 'x'.repeat(10070778), bytes: 10070778 };
ok(!evaluate(check('leak-guard-bundle-4'), pdf).ok,
   'LEAK: a served paid PDF is CAUGHT');
ok(evaluate(check('leak-guard-bundle-4'), pdf).problems.some((p) => /purge the Cloudflare cache/i.test(p)),
   'LEAK: failure tells you to purge the CDN cache (the actual remediation)');
ok(evaluate(check('leak-guard-bundle-4'), fallback).ok,
   'LEAK: SPA fallback means the file is gone — passes');
ok(evaluate(check('leak-guard-bundle-4'), { status: 404, contentType: 'text/html', body: 'nope', bytes: 4 }).ok,
   'LEAK: a 404 also means gone — passes');

/* ── Supabase reachability ── */
ok(evaluate(check('supabase-ops'), { status: 401, contentType: 'application/json', body: '{}', bytes: 2 }).ok,
   'Supabase 401 is healthy (reachable, just unauthenticated)');
ok(evaluate(check('supabase-ops'), { status: 404, contentType: 'application/json', body: '{}', bytes: 2 }).ok,
   'Supabase 404 is healthy');
ok(!evaluate(check('supabase-ops'), { status: 503, contentType: 'text/html', body: 'down', bytes: 4 }).ok,
   'Supabase 503 is CAUGHT');

/* ── Transport failures ── */
ok(!evaluate(check('store'), { error: 'timeout after 15000ms' }).ok, 'timeout is CAUGHT');
ok(evaluate(check('store'), { error: 'timeout after 15000ms' }).problems[0].includes('request failed'),
   'timeout failure is explained');
ok(!evaluate(check('marketing-home'), { error: 'ENOTFOUND' }).ok, 'DNS failure is CAUGHT');

/* ── Status handling ── */
ok(!evaluate(check('store'), { status: 500, contentType: 'text/html', body: 'err', bytes: 3 }).ok, '500 is CAUGHT');
ok(!evaluate(check('activate'), html('<html>no input here</html>')).ok,
   'activate without the key input is CAUGHT (customers could not activate)');
ok(evaluate(check('activate'), html('<html><input id="key-input"></html>')).ok,
   'activate with the key input passes');

/* ── Config sanity ── */
ok(CHECKS.length >= 12, `watches enough surfaces (${CHECKS.length})`);
ok(new Set(CHECKS.map((c) => c.name)).size === CHECKS.length, 'check names are unique');
ok(CHECKS.every((c) => /^https:\/\//.test(c.url)), 'every check uses https');
ok(CHECKS.every((c) => c.expect && Object.keys(c.expect).length > 0),
   'every check asserts something beyond reachability');
ok(CHECKS.some((c) => c.expect.bodyExcludes?.includes('Waypoint DAEP')),
   'the CC31 signature is explicitly guarded');
ok(CHECKS.filter((c) => c.critical).length >= 4, 'critical surfaces are flagged');
// No check may require auth — a probe that needs a credential can die of its own
// stale secret, which is itself the X-2 failure mode.
ok(!JSON.stringify(CHECKS).match(/apikey|authorization|bearer|password|service_role/i),
   'no check carries a credential');

console.log(`\nPASS ${pass}  FAIL ${fail}`);
if (fails.length) { console.log('FAILURES:'); fails.forEach((f) => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);
