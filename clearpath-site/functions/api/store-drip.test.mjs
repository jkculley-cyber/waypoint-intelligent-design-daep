/* Offline tests for the store-drip nudge planner (pure logic, no network).
 * Run: node clearpath-site/functions/api/store-drip.test.mjs
 *
 * The customer-protection cases are a REGRESSION GUARD for a real incident:
 * on 2026-07-19 this drip emailed a paying Beacon customer a
 * "we haven't seen your payment" nudge because she re-registered while
 * demoing the store to her district. */
import { computeStoreNudges, parseRegistration } from './store-drip.js';

let pass = 0, fail = 0;
const fails = [];
const ok = (c, label) => { if (c) pass++; else { fail++; fails.push(label); } };
const eq = (a, b, label) => ok(JSON.stringify(a) === JSON.stringify(b), `${label} (got ${JSON.stringify(a)} want ${JSON.stringify(b)})`);

const DAY = 86400000;
const NOW = Date.parse('2026-07-22T12:00:00Z');
const ago = (d) => new Date(NOW - d * DAY).toISOString();
const emptyState = () => ({ sent: {}, optout: [] });
const lead = (over = {}) => ({
  id: 1, name: 'Test', email: 'buyer@somedistrict.org',
  referrer: 'REGISTER: Campus Leadership Complete System ($52)',
  created_at: ago(5), ...over,
});

// ── parseRegistration ──
eq(parseRegistration('REGISTER: Beacon (monthly_$8)').product, 'Beacon', 'parses product');
eq(parseRegistration('REGISTER: Campus Leadership Complete System ($52)').amount, '$52', 'parses amount');
ok(parseRegistration('not a registration') === null, 'rejects non-registration referrer');
ok(parseRegistration('') === null, 'rejects empty referrer');

// ── age window ──
const planOf = (leads, extra = {}) =>
  computeStoreNudges({ leads, state: emptyState(), now: NOW, customerEmails: [], ...extra });
eq(planOf([lead({ created_at: ago(0) })]).length, 0, 'too new (0d) not nudged');
eq(planOf([lead({ created_at: ago(1) })]).length, 0, 'too new (1d) not nudged');
eq(planOf([lead({ created_at: ago(2) })]).length, 1, 'nudges at 2d');
eq(planOf([lead({ created_at: ago(15) })]).length, 1, 'nudges at 15d boundary');
eq(planOf([lead({ created_at: ago(16) })]).length, 0, 'too old (16d) not nudged');

// ── idempotency / opt-out ──
eq(computeStoreNudges({
  leads: [lead()], now: NOW, customerEmails: [],
  state: { sent: { 'buyer@somedistrict.org|campus leadership complete system': ago(1) }, optout: [] },
}).length, 0, 'already-sent marker suppresses');
eq(computeStoreNudges({
  leads: [lead()], now: NOW, customerEmails: [],
  state: { sent: {}, optout: ['buyer@somedistrict.org'] },
}).length, 0, 'opt-out suppresses');
eq(planOf([lead(), lead({ id: 2 })]).length, 1, 'dedupes same email|product');

// ── REGRESSION: existing paying customers are never dunned ──
const nicole = lead({ email: 'nhill@magnoliaisd.org', referrer: 'REGISTER: Beacon (monthly_$8)', created_at: ago(6) });
eq(planOf([nicole]).length, 1, 'control: without license list, the customer WOULD be nudged (the bug)');
eq(planOf([nicole], { customerEmails: ['nhill@magnoliaisd.org'] }).length, 0,
   'REGRESSION: active-license holder is NOT nudged');
eq(planOf([nicole], { customerEmails: ['NHill@MagnoliaISD.org'] }).length, 0,
   'license match is case-insensitive');
eq(planOf([nicole], { customerEmails: [null, undefined, ''] }).length, 1,
   'null/empty license emails do not accidentally suppress everyone');
// a customer buying a DIFFERENT product is still protected (deliberate: a
// missed nudge is recoverable, a wrongly-dunned customer is not)
eq(planOf([lead({ email: 'nhill@magnoliaisd.org' })], { customerEmails: ['nhill@magnoliaisd.org'] }).length, 0,
   'customer is protected across products (deliberate conservatism)');
// non-customers still get nudged
eq(planOf([lead({ email: 'stranger@gmail.com' })], { customerEmails: ['nhill@magnoliaisd.org'] }).length, 1,
   'non-customer still nudged');

// ── junk emails ──
eq(planOf([lead({ email: '' })]).length, 0, 'empty email skipped');
eq(planOf([lead({ email: 'not-an-email' })]).length, 0, 'malformed email skipped');
eq(planOf([lead({ email: 'someone@example.com' })]).length, 0, 'placeholder @example. domain skipped');
eq(planOf([lead({ email: 'someone@test.io' })]).length, 0, 'placeholder @test. domain skipped');
eq(planOf([lead({ referrer: 'DEMO REQUEST' })]).length, 0, 'non-REGISTER referrer skipped');

console.log(`\nPASS ${pass}  FAIL ${fail}`);
if (fails.length) { console.log('FAILURES:'); fails.forEach((f) => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);
