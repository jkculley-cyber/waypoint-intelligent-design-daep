// Smoke test for migration 066 (Navigator T1+T2)
// Run: node scripts/smoke-test-066.mjs
//
// Uses the service-role key — bypasses RLS but NOT triggers, which is what we want.
// Triggers fire regardless of role.
//
// Tests:
//   1. View navigator_placements_cumulative is queryable
//   2. parent_notified=true without method → P0001 ("TEC §37.009")
//   3. parent_notified_at set server-side, ignores client clock
//   4. Reason update appends to reason_history with actor + timestamp
//   5. SPED 10-day rule blocks placement #N when cumulative would cross 10
//   6. Linked manifestation_determination_id allows the placement through
//   7. audit_log has navigator_placements_created/_updated rows

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Load .env.local
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')]
    })
)

const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON || !SERVICE) { console.error('missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

// Authenticated client (real auth.uid()) — used for mutations so the audit
// trigger gets a valid user_id matching the auth.users FK.
const sb = createClient(URL, ANON, { auth: { persistSession: false } })
// Service-role client — used for read-only setup queries that bypass RLS.
const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })

const DEMO_EMAIL = 'admin@lonestar-isd.org'
const DEMO_PASSWORD = 'Password123!'

async function signIn() {
  const { data, error } = await sb.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
  if (error) throw new Error(`signin failed: ${error.message}`)
  return data.user
}

const log = (...a) => console.log('•', ...a)
const ok  = (msg) => console.log('  \x1b[32m✓\x1b[0m', msg)
const fail = (msg, err) => { console.log('  \x1b[31m✗\x1b[0m', msg, err ? '\n     ' + (err.message || err) : ''); process.exitCode = 1 }

// Find Lone Star ISD demo district + a SPED student with placements
async function setup() {
  const { data: districts } = await svc.from('districts').select('id, name').ilike('name', '%lone star%').limit(1)
  if (!districts?.length) throw new Error('Lone Star ISD demo district not found')
  const districtId = districts[0].id

  const { data: spedStudents } = await svc
    .from('students')
    .select('id, first_name, last_name, is_sped, campus_id')
    .eq('district_id', districtId)
    .eq('is_sped', true)
    .limit(5)
  if (!spedStudents?.length) throw new Error('No SPED students in Lone Star ISD')

  const { data: profiles } = await svc
    .from('profiles')
    .select('id, role, district_id')
    .eq('district_id', districtId)
    .in('role', ['admin', 'principal', 'ap'])
    .limit(1)
  if (!profiles?.length) throw new Error('No admin/principal/ap profile in Lone Star ISD')

  return { districtId, spedStudent: spedStudents[0], profile: profiles[0], allSped: spedStudents }
}

async function cleanup(testIds) {
  // Defer cleanup so audit rows are inspected first; called explicitly at end.
  if (testIds.placementIds.length) {
    await sb.from('navigator_placements').delete().in('id', testIds.placementIds)
  }
  if (testIds.mdrIds.length) {
    await sb.from('manifestation_determinations').delete().in('id', testIds.mdrIds)
  }
}

async function main() {
  console.log('\n\x1b[1mMigration 066 smoke tests\x1b[0m\n')
  const authUser = await signIn()
  log(`Signed in as: ${authUser.email} (auth.uid()=${authUser.id.slice(0,8)}…)`)
  const ctx = await setup()
  log(`District: ${ctx.districtId.slice(0,8)}…`)
  log(`SPED student: ${ctx.spedStudent.first_name} ${ctx.spedStudent.last_name} (${ctx.spedStudent.id.slice(0,8)}…)`)
  log(`Profile assigning placements: ${ctx.profile.id.slice(0,8)}… (${ctx.profile.role})`)
  console.log()

  const testIds = { placementIds: [], mdrIds: [] }

  // ─── Test 1: cumulative-days view is queryable ───
  console.log('\x1b[1m1. View navigator_placements_cumulative\x1b[0m')
  const { data: cumRows, error: cumErr } = await sb
    .from('navigator_placements_cumulative')
    .select('student_id, cumulative_days, placement_count, days_until_mdr_threshold, is_sped')
    .eq('district_id', ctx.districtId)
    .limit(3)
  if (cumErr) fail('view query', cumErr)
  else { ok(`view returned ${cumRows.length} rows`); cumRows.forEach(r => log(`  ${r.student_id.slice(0,8)}… sped=${r.is_sped} days=${r.cumulative_days} threshold_remaining=${r.days_until_mdr_threshold}`)) }

  // ─── Test 2: parent_notified=true without method should be rejected ───
  console.log('\n\x1b[1m2. Parent-notice trigger requires method\x1b[0m')
  const { error: missingMethodErr } = await sb.from('navigator_placements').insert({
    district_id: ctx.districtId,
    campus_id: ctx.spedStudent.campus_id,
    student_id: ctx.spedStudent.id,
    assigned_by: ctx.profile.id,
    placement_type: 'iss',
    start_date: new Date().toISOString().split('T')[0],
    days: 1,
    parent_notified: true,
    // method intentionally omitted
  })
  if (missingMethodErr) {
    if (missingMethodErr.message.includes('parent_notified_method')) ok(`rejected: "${missingMethodErr.message.slice(0, 90)}…"`)
    else fail(`expected method-required error, got: ${missingMethodErr.message}`)
  } else fail('expected rejection but insert succeeded')

  // ─── Test 3a: client-set parent_notified_at is REJECTED (post-migration 069) ───
  console.log('\n\x1b[1m3a. client-set parent_notified_at is rejected (loud, not silent)\x1b[0m')
  // Find a non-SPED student so we don't trip the 10-day rule mid-test
  const { data: nonSpedStudents } = await sb
    .from('students').select('id, campus_id, is_sped')
    .eq('district_id', ctx.districtId).eq('is_sped', false).limit(1)
  const targetStudent = nonSpedStudents?.[0] || ctx.spedStudent
  const fakePast = '2020-01-01T00:00:00.000Z'
  const { error: p3aErr } = await sb.from('navigator_placements').insert({
    district_id: ctx.districtId,
    campus_id: targetStudent.campus_id,
    student_id: targetStudent.id,
    assigned_by: ctx.profile.id,
    placement_type: 'iss',
    start_date: new Date().toISOString().split('T')[0],
    days: 1,
    parent_notified: true,
    parent_notified_method: 'phone_call',
    parent_notified_at: fakePast,  // post-069: server raises instead of overwriting
    parent_contact_notes: 'smoke test #3a',
  }).select('id').single()
  if (p3aErr && /server-controlled|parent_notified_at/i.test(p3aErr.message)) {
    ok(`rejected loudly: "${p3aErr.message.slice(0, 90)}…"`)
  } else if (p3aErr) {
    fail(`expected server-controlled rejection, got: ${p3aErr.message}`)
  } else {
    fail('expected rejection but insert succeeded — migration 069 may not be applied')
  }

  // ─── Test 3b: server sets parent_notified_at when client omits it ───
  console.log('\n\x1b[1m3b. server sets parent_notified_at when client omits it\x1b[0m')
  const { data: p3b, error: p3bErr } = await sb.from('navigator_placements').insert({
    district_id: ctx.districtId,
    campus_id: targetStudent.campus_id,
    student_id: targetStudent.id,
    assigned_by: ctx.profile.id,
    placement_type: 'iss',
    start_date: new Date().toISOString().split('T')[0],
    days: 1,
    parent_notified: true,
    parent_notified_method: 'phone_call',
    parent_contact_notes: 'smoke test #3b',
  }).select('id, parent_notified_at, parent_notified_method').single()
  if (p3bErr) fail('insert without timestamp failed', p3bErr)
  else {
    testIds.placementIds.push(p3b.id)
    const ts = new Date(p3b.parent_notified_at)
    const drift = Math.abs(Date.now() - ts.getTime())
    if (drift < 60_000) ok(`server set parent_notified_at ≈ now() (drift ${drift}ms)`)
    else fail(`expected near-now timestamp, got ${p3b.parent_notified_at}`)
    if (p3b.parent_notified_method === 'phone_call') ok('method preserved')
    else fail(`method drift: got ${p3b.parent_notified_method}`)
  }

  // ─── Test 4: Reason update appends to reason_history ───
  console.log('\n\x1b[1m4. reason_history captures prior value on update\x1b[0m')
  if (testIds.placementIds[0]) {
    const u1 = await sb.from('navigator_placements').update({ reason: 'first version' }).eq('id', testIds.placementIds[0]).select('id, reason').single()
    log(`  update 1: error=${u1.error?.message || 'none'} returned=${u1.data ? 'row' : 'null'}`)
    const u2 = await sb.from('navigator_placements').update({ reason: 'second version (corrected)' }).eq('id', testIds.placementIds[0]).select('id, reason').single()
    log(`  update 2: error=${u2.error?.message || 'none'} returned=${u2.data ? 'row' : 'null'}`)
    const { data: pHist } = await svc.from('navigator_placements')
      .select('reason, reason_history').eq('id', testIds.placementIds[0]).single()
    if (Array.isArray(pHist.reason_history) && pHist.reason_history.length >= 1) {
      ok(`reason_history has ${pHist.reason_history.length} prior version(s); current="${pHist.reason}"`)
      pHist.reason_history.forEach((h, i) => log(`  v${i}: "${h.reason}" @ ${h.changed_at}`))
    } else fail(`expected ≥1 history entry, got ${JSON.stringify(pHist.reason_history)}; current reason="${pHist.reason}"`)
  }

  // ─── Test 5: SPED 10-day rule blocks placement that crosses threshold ───
  console.log('\n\x1b[1m5. SPED 10-day rule blocks placement without MDR\x1b[0m')
  // Pick a SPED student. Insert a 9-day placement first (allowed), then a 2-day (would cross 10).
  const sped = ctx.allSped.find(s => s.id !== targetStudent.id) || ctx.spedStudent
  // Clear any existing placements this SY so we have a deterministic baseline
  const sy = new Date()
  const syStart = new Date(sy.getMonth() >= 7 ? sy.getFullYear() : sy.getFullYear() - 1, 7, 1).toISOString().split('T')[0]
  const { data: existingPlacements } = await sb.from('navigator_placements')
    .select('id, days, placement_type').eq('student_id', sped.id).gte('start_date', syStart)
  const existingDays = (existingPlacements || []).filter(p => ['iss','oss'].includes(p.placement_type)).reduce((s, p) => s + (p.days || 0), 0)
  log(`SPED student ${sped.first_name} ${sped.last_name}: ${existingDays} existing SY days from ${existingPlacements?.length || 0} placements`)

  // Try to insert a placement that would cross 10. If existingDays already >= 10, the next one tests the same rule.
  const newDays = Math.max(11 - existingDays, 1)
  const { error: spedErr } = await sb.from('navigator_placements').insert({
    district_id: ctx.districtId,
    campus_id: sped.campus_id,
    student_id: sped.id,
    assigned_by: ctx.profile.id,
    placement_type: 'oss',
    start_date: new Date().toISOString().split('T')[0],
    days: newDays,
    reentry_plan: 'smoke test re-entry plan',
  })
  if (spedErr) {
    if (spedErr.message.includes('IDEA') || spedErr.message.includes('Manifestation')) ok(`rejected: "${spedErr.message.slice(0, 130)}…"`)
    else fail(`expected IDEA error, got: ${spedErr.message}`)
  } else {
    if (existingDays + newDays > 10) fail(`expected rejection — student would have ${existingDays + newDays} cumulative days`)
    else ok(`accepted (only ${existingDays + newDays} cumulative days; below threshold)`)
  }

  // ─── Test 6: Linked MDR allows placement through ───
  console.log('\n\x1b[1m6. Linked MDR allows the same placement through\x1b[0m')
  const { data: mdr, error: mdrErr } = await sb.from('manifestation_determinations').insert({
    district_id: ctx.districtId,
    campus_id: sped.campus_id,
    student_id: sped.id,
    meeting_date: new Date().toISOString().split('T')[0],
    behavior_description: 'Smoke test MDR — disruption in math class',
    is_manifestation: false,
    decision_rationale: 'Not a manifestation per IEP team review of two-prong test.',
    created_by: ctx.profile.id,
  }).select('id').single()
  if (mdrErr) { fail('MDR insert failed', mdrErr) }
  else {
    testIds.mdrIds.push(mdr.id)
    ok(`MDR created: ${mdr.id.slice(0,8)}…`)

    const { data: p6, error: p6Err } = await sb.from('navigator_placements').insert({
      district_id: ctx.districtId,
      campus_id: sped.campus_id,
      student_id: sped.id,
      assigned_by: ctx.profile.id,
      placement_type: 'oss',
      start_date: new Date().toISOString().split('T')[0],
      days: newDays,
      reentry_plan: 'smoke test #6',
      manifestation_determination_id: mdr.id,
    }).select('id').single()
    if (p6Err) fail('placement with linked MDR was unexpectedly rejected', p6Err)
    else { testIds.placementIds.push(p6.id); ok(`placement accepted with linked MDR`) }
  }

  // ─── Test 7: audit_log has Navigator entries ───
  console.log('\n\x1b[1m7. audit_log captures Navigator mutations\x1b[0m')
  if (testIds.placementIds[0]) {
    // Production audit_log shape: user_id (NOT NULL FK), changes (JSONB combining old + new)
    // Read via service role so we bypass any RLS gating on audit_log SELECT.
    const { data: audits } = await svc.from('audit_log')
      .select('action, entity_type, entity_id, changes, created_at, user_id')
      .eq('entity_type', 'navigator_placements')
      .eq('entity_id', testIds.placementIds[0])
      .order('created_at', { ascending: true })
    if ((audits?.length || 0) >= 2) {
      ok(`${audits.length} audit rows for test placement`)
      audits.forEach(a => log(`  ${a.action} @ ${a.created_at} actor=${a.user_id ? a.user_id.slice(0,8) : '—'}`))
      const updateRow = audits.find(a => a.action === 'navigator_placements_updated' && a.changes?.old?.reason !== a.changes?.new?.reason)
      if (updateRow) ok(`reason change tracked: "${updateRow.changes.old.reason}" → "${updateRow.changes.new.reason}"`)
      else log('  (no reason-change update row — expected if test 4 used a different placement)')
    } else fail(`expected ≥2 audit rows, got ${audits?.length || 0}`)
  }

  // ─── Cleanup ───
  console.log('\n\x1b[1mCleanup\x1b[0m')
  await cleanup(testIds)
  ok(`removed ${testIds.placementIds.length} test placements + ${testIds.mdrIds.length} test MDRs`)

  console.log('\n' + (process.exitCode ? '\x1b[31mFAILED\x1b[0m' : '\x1b[32mALL PASS\x1b[0m') + '\n')
}

main().catch(err => { console.error('\x1b[31mFATAL:\x1b[0m', err.message); process.exit(1) })
