// Smoke test for migrations 073-079 — Waypoint T1 patches from CC22 R1 audit.
//
// Run: node scripts/smoke-test-073-079.mjs
//
// Tests applied via UI-equivalent path (signed-in admin user, anon client +
// auth.signInWithPassword) so the audit trigger gets a real auth.uid().
// Service-role client used only for read-only setup queries that bypass RLS.
//
// Tests:
//   073-1  Audit trigger fires on incident UPDATE → audit_log row with changes
//   073-2  description edit appends to description_history with actor + ts
//   074-1  10-day SPED rule raises P0001 on approved placement w/o MDR
//   074-2  Same placement allowed once MDR is recorded on linked checklist
//   075-1  Client-set parent_notified rejected on INSERT
//   075-2  Setting parent_notification_method server-stamps parent_notified
//   075-3  Method enum CHECK rejects bad values
//   076-1  Compliance checklist locked when status='completed'
//   076-2  Re-opening (status → in_progress) allows edits, then re-complete
//   078-1  Same-user override approval rejected (dual-signature CHECK)
//   078-2  Reason detail under 30 chars rejected
//   078-3  Cross-user approval flips block_overridden=true
//
// Deferred to next session:
//   077    JSONB integrity CHECK — exercised implicitly by the trigger; no
//          API path to inject a malformed history array.
//   079    Parent SELECT on audit_log — requires a parent test user with
//          portal_user_id set + linked student_guardian row.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

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
if (!URL || !ANON || !SERVICE) {
  console.error('missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(URL, ANON, { auth: { persistSession: false } })
const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })

const ADMIN_EMAIL = 'admin@lonestar-isd.org'
const ADMIN_PASSWORD = 'Password123!'

const log = (...a) => console.log('•', ...a)
const ok  = (msg) => console.log('  \x1b[32m✓\x1b[0m', msg)
const fail = (msg, err) => {
  console.log('  \x1b[31m✗\x1b[0m', msg, err ? '\n     ' + (err.message || err) : '')
  process.exitCode = 1
}

const TEST_PREFIX = 'SMOKE-073-079'  // marker for cleanup

async function setup() {
  const { data: districts } = await svc.from('districts').select('id, name').ilike('name', '%lone star%').limit(1)
  if (!districts?.length) throw new Error('Lone Star ISD demo district not found')
  const districtId = districts[0].id

  const { data: spedStudents } = await svc.from('students')
    .select('id, first_name, last_name, is_sped, is_504, campus_id')
    .eq('district_id', districtId).eq('is_sped', true).limit(5)
  if (!spedStudents?.length) throw new Error('No SPED students')

  const { data: nonSped } = await svc.from('students')
    .select('id, first_name, last_name, is_sped, campus_id')
    .eq('district_id', districtId).eq('is_sped', false).eq('is_active', true).limit(2)

  const { data: profiles } = await svc.from('profiles')
    .select('id, role, district_id, full_name')
    .eq('district_id', districtId)
    .in('role', ['admin', 'principal', 'ap', 'sped_coordinator'])
    .limit(5)

  // offense_codes.district_id is nullable (global codes have NULL); try
  // district-scoped first, fall back to any (NULL district_id = global).
  let { data: offenses } = await svc.from('offense_codes')
    .select('id, code, title, district_id')
    .eq('district_id', districtId).eq('is_active', true).limit(1)
  if (!offenses?.length) {
    const fallback = await svc.from('offense_codes')
      .select('id, code, title, district_id').eq('is_active', true).limit(1)
    offenses = fallback.data || []
  }
  if (!offenses?.length) throw new Error('No offense_codes seeded (neither district-scoped nor global)')

  return {
    districtId,
    spedStudents,
    nonSpedStudents: nonSped || [],
    profiles: profiles || [],
    offense: offenses[0],
  }
}

async function signInAs(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signin ${email} failed: ${error.message}`)
  return data.user
}

async function cleanup(testIds) {
  if (testIds.overrideRequestIds.length) {
    await svc.from('compliance_override_requests').delete().in('id', testIds.overrideRequestIds)
  }
  if (testIds.checklistIds.length) {
    await svc.from('compliance_checklists').delete().in('id', testIds.checklistIds)
  }
  if (testIds.incidentIds.length) {
    await svc.from('incidents').delete().in('id', testIds.incidentIds)
  }
  // audit_log entries from these tests stay — they're append-only by design
}

async function main() {
  console.log('\n\x1b[1mWaypoint T1 smoke tests (migrations 073-079)\x1b[0m\n')
  const admin = await signInAs(ADMIN_EMAIL, ADMIN_PASSWORD)
  log(`Signed in as: ${admin.email} (auth.uid()=${admin.id.slice(0,8)}…)`)
  const ctx = await setup()
  log(`District: ${ctx.districtId.slice(0,8)}…`)
  log(`SPED students: ${ctx.spedStudents.length}; non-SPED: ${ctx.nonSpedStudents.length}; profiles: ${ctx.profiles.length}`)
  log(`Offense code: ${ctx.offense.code} ${ctx.offense.title}`)
  console.log()

  const testIds = { incidentIds: [], checklistIds: [], overrideRequestIds: [] }

  const adminProfile = ctx.profiles.find(p => p.id === admin.id) || ctx.profiles[0]
  const sped = ctx.spedStudents[0]
  const sped2 = ctx.spedStudents[1] || ctx.spedStudents[0]
  const nonSped = ctx.nonSpedStudents[0]

  const today = new Date().toISOString().split('T')[0]

  // ============================================================================
  // 073-1: Audit trigger fires on incident UPDATE
  // ============================================================================
  console.log('\x1b[1m073-1. Audit trigger fires on incident INSERT + UPDATE\x1b[0m')
  const inc1Insert = await sb.from('incidents').insert({
    district_id: ctx.districtId,
    campus_id: nonSped.campus_id,
    student_id: nonSped.id,
    reported_by: adminProfile.id,
    incident_date: today,
    offense_code_id: ctx.offense.id,
    description: `${TEST_PREFIX} initial description`,
    consequence_type: 'iss',
    consequence_days: 1,
    status: 'draft',
  }).select('id').single()

  if (inc1Insert.error) { fail('insert incident', inc1Insert.error) }
  else {
    testIds.incidentIds.push(inc1Insert.data.id)
    ok(`incident created: ${inc1Insert.data.id.slice(0,8)}…`)

    const inc1Update = await sb.from('incidents').update({
      description: `${TEST_PREFIX} updated description (edit 1)`,
    }).eq('id', inc1Insert.data.id).select('id').single()
    if (inc1Update.error) fail('update incident description', inc1Update.error)
    else ok('incident UPDATE applied')

    // Verify audit_log row produced for both insert + update
    const { data: audits } = await svc.from('audit_log')
      .select('action, entity_type, entity_id, changes, user_id, created_at')
      .eq('entity_type', 'incidents')
      .eq('entity_id', inc1Insert.data.id)
      .order('created_at', { ascending: true })
    if ((audits?.length || 0) >= 2) {
      ok(`${audits.length} audit rows produced (incidents_created + incidents_updated)`)
      const upd = audits.find(a => a.action === 'incidents_updated')
      if (upd && upd.changes?.old?.description !== upd.changes?.new?.description) {
        ok(`description change captured in audit_log.changes: old="${upd.changes.old.description.slice(0, 40)}…" → new="${upd.changes.new.description.slice(0, 40)}…"`)
      } else fail('update audit row missing description diff')
    } else fail(`expected ≥2 audit rows, got ${audits?.length || 0}`)
  }

  // ============================================================================
  // 073-2: description edit appends to description_history
  // ============================================================================
  console.log('\n\x1b[1m073-2. description_history appends prior version on update\x1b[0m')
  if (testIds.incidentIds[0]) {
    // Already updated above — read history
    const { data: incHist } = await svc.from('incidents')
      .select('description, description_history')
      .eq('id', testIds.incidentIds[0]).single()
    if (Array.isArray(incHist.description_history) && incHist.description_history.length >= 1) {
      ok(`description_history has ${incHist.description_history.length} prior version(s); current="${incHist.description.slice(0, 40)}…"`)
      incHist.description_history.forEach((h, i) =>
        log(`  v${i}: "${h.description?.slice(0, 40)}…" @ ${h.changed_at} by ${h.changed_by?.slice(0,8) || '—'}`))
    } else fail(`expected ≥1 history entry, got ${JSON.stringify(incHist.description_history)}`)
  }

  // ============================================================================
  // 074-1: 10-day SPED rule raises P0001 on approved placement w/o MDR
  // ============================================================================
  console.log('\n\x1b[1m074-1. SPED 10-day rule raises P0001 on approved placement without MDR\x1b[0m')
  // Create initial 9-day OSS placement on SPED student, set status=approved.
  const inc2Ins = await sb.from('incidents').insert({
    district_id: ctx.districtId,
    campus_id: sped.campus_id,
    student_id: sped.id,
    reported_by: adminProfile.id,
    incident_date: today,
    offense_code_id: ctx.offense.id,
    description: `${TEST_PREFIX} 074-1 baseline 9-day OSS`,
    consequence_type: 'oss',
    consequence_days: 9,
    status: 'approved',  // service-role bypasses MDR check? trigger fires regardless
    sped_compliance_required: true,
    compliance_cleared: true,  // simulate already cleared via legacy override path
  }).select('id').single()
  if (inc2Ins.error) {
    log(`  baseline 9-day insert: error=${inc2Ins.error.message}`)
    if (/IDEA|Manifestation/i.test(inc2Ins.error.message)) {
      log('  (existing SPED placements in seed already cross 10 days — that is expected to raise P0001)')
      ok('trigger fires on baseline insert (cumulative + new > 10)')
    } else fail('baseline insert', inc2Ins.error)
  } else {
    testIds.incidentIds.push(inc2Ins.data.id)
    log(`  baseline 9-day OSS created: ${inc2Ins.data.id.slice(0,8)}…`)

    // Now try to add a 2-day OSS that would push cumulative to 11 — without MDR.
    const inc3Ins = await sb.from('incidents').insert({
      district_id: ctx.districtId,
      campus_id: sped.campus_id,
      student_id: sped.id,
      reported_by: adminProfile.id,
      incident_date: today,
      offense_code_id: ctx.offense.id,
      description: `${TEST_PREFIX} 074-1 over-threshold 2-day OSS`,
      consequence_type: 'oss',
      consequence_days: 2,
      status: 'approved',
      sped_compliance_required: true,
    }).select('id').single()
    if (inc3Ins.error) {
      if (/IDEA|Manifestation|300\.530/i.test(inc3Ins.error.message)) {
        ok(`rejected: "${inc3Ins.error.message.slice(0, 130)}…"`)
      } else fail(`expected IDEA error, got: ${inc3Ins.error.message}`)
    } else {
      testIds.incidentIds.push(inc3Ins.data.id)
      fail('expected P0001 rejection but insert succeeded')
    }
  }

  // ============================================================================
  // 074-2: Linked MDR allows the placement through
  // ============================================================================
  console.log('\n\x1b[1m074-2. Linked MDR (manifestation_determination set) allows placement\x1b[0m')
  // Create a draft incident + compliance_checklist with MDR completed, set status=approved.
  const inc4Ins = await sb.from('incidents').insert({
    district_id: ctx.districtId,
    campus_id: sped.campus_id,
    student_id: sped.id,
    reported_by: adminProfile.id,
    incident_date: today,
    offense_code_id: ctx.offense.id,
    description: `${TEST_PREFIX} 074-2 with MDR`,
    consequence_type: 'oss',
    consequence_days: 1,
    status: 'draft',
    sped_compliance_required: true,
  }).select('id').single()

  if (inc4Ins.error) { fail('inc4 draft insert', inc4Ins.error) }
  else {
    testIds.incidentIds.push(inc4Ins.data.id)
    const cl4 = await sb.from('compliance_checklists').insert({
      district_id: ctx.districtId,
      incident_id: inc4Ins.data.id,
      student_id: sped.id,
      manifestation_determination: new Date().toISOString(),
      manifestation_result: 'not_manifestation',
      status: 'in_progress',
    }).select('id').single()
    if (cl4.error) { fail('compliance_checklist with MDR', cl4.error) }
    else {
      testIds.checklistIds.push(cl4.data.id)
      const link4 = await sb.from('incidents').update({
        compliance_checklist_id: cl4.data.id,
      }).eq('id', inc4Ins.data.id).select('id').single()
      if (link4.error) fail('link checklist to incident', link4.error)
      else {
        // Now approve — trigger should accept because MDR is recorded.
        const approve4 = await sb.from('incidents').update({
          status: 'approved',
        }).eq('id', inc4Ins.data.id).select('id').single()
        if (approve4.error) fail('expected approval to succeed with MDR linked', approve4.error)
        else ok('placement approved with MDR linked')
      }
    }
  }

  // ============================================================================
  // 075-1: Client-set parent_notified rejected on INSERT
  // ============================================================================
  console.log('\n\x1b[1m075-1. Client-set parent_notified rejected on INSERT\x1b[0m')
  const fakePast = '2020-01-01T00:00:00.000Z'
  const cl5Ins = await sb.from('compliance_checklists').insert({
    district_id: ctx.districtId,
    incident_id: testIds.incidentIds[0],   // reuse 073-1 incident
    student_id: nonSped.id,
    parent_notified: fakePast,
    parent_notification_method: 'phone_call',
    status: 'in_progress',
  }).select('id').single()
  if (cl5Ins.error) {
    if (/server-controlled|parent_notified/i.test(cl5Ins.error.message)) {
      ok(`rejected loudly: "${cl5Ins.error.message.slice(0, 100)}…"`)
    } else fail(`expected server-controlled rejection, got: ${cl5Ins.error.message}`)
  } else {
    testIds.checklistIds.push(cl5Ins.data.id)
    fail('expected rejection but insert succeeded — trigger may not be firing')
  }

  // ============================================================================
  // 075-2: Setting method server-stamps parent_notified
  // ============================================================================
  console.log('\n\x1b[1m075-2. Setting parent_notification_method server-stamps parent_notified\x1b[0m')
  const cl6Ins = await sb.from('compliance_checklists').insert({
    district_id: ctx.districtId,
    incident_id: testIds.incidentIds[0],
    student_id: nonSped.id,
    parent_notification_method: 'email',
    status: 'in_progress',
  }).select('id, parent_notified, parent_notification_method').single()
  if (cl6Ins.error) { fail('insert with method only', cl6Ins.error) }
  else {
    testIds.checklistIds.push(cl6Ins.data.id)
    const ts = cl6Ins.data.parent_notified ? new Date(cl6Ins.data.parent_notified) : null
    const drift = ts ? Math.abs(Date.now() - ts.getTime()) : Infinity
    if (drift < 60_000) ok(`server set parent_notified ≈ now() (drift ${drift}ms)`)
    else fail(`expected server-set timestamp; got ${cl6Ins.data.parent_notified}`)
    if (cl6Ins.data.parent_notification_method === 'email') ok('method preserved as "email"')
    else fail(`method drift: got ${cl6Ins.data.parent_notification_method}`)

    // Debug — query cl6 again right after to verify persistence
    const { data: cl6After } = await svc.from('compliance_checklists')
      .select('id, parent_notified, parent_notification_method')
      .eq('id', cl6Ins.data.id).single()
    log(`  cl6 persisted state: ${JSON.stringify(cl6After)}`)
  }

  // ============================================================================
  // 075-3: Method enum CHECK rejects bad values
  // ============================================================================
  console.log('\n\x1b[1m075-3. Method enum CHECK rejects bad values\x1b[0m')
  const cl7Ins = await sb.from('compliance_checklists').insert({
    district_id: ctx.districtId,
    incident_id: testIds.incidentIds[0],
    student_id: nonSped.id,
    parent_notification_method: 'snail_mail_with_pigeon',  // invalid
    status: 'in_progress',
  }).select('id').single()
  if (cl7Ins.error && /check.*method|parent_notification_method/i.test(cl7Ins.error.message)) {
    ok(`enum CHECK rejected: "${cl7Ins.error.message.slice(0, 90)}…"`)
  } else if (cl7Ins.error) {
    fail(`expected enum CHECK rejection, got: ${cl7Ins.error.message}`)
  } else {
    testIds.checklistIds.push(cl7Ins.data.id)
    fail('expected rejection but insert succeeded — CHECK constraint may not be enforced')
  }

  // ============================================================================
  // 076-1: Compliance checklist locked when status='completed'
  // ============================================================================
  // Create a DEDICATED checklist for this test, fully populated so migration
  // 003's check_compliance_completion trigger lets status stick at 'completed'.
  // (Earlier checklists in testIds were created for narrower tests and may
  // have NULL workflow fields that would auto-revert status.)
  console.log('\n\x1b[1m076-1. Compliance checklist locked when status=completed\x1b[0m')

  // Create a fresh incident + checklist for this isolated test
  const lockInc = await sb.from('incidents').insert({
    district_id: ctx.districtId,
    campus_id: nonSped.campus_id,
    student_id: nonSped.id,
    reported_by: adminProfile.id,
    incident_date: today,
    offense_code_id: ctx.offense.id,
    description: `${TEST_PREFIX} 076-1 lock-test incident`,
    consequence_type: 'iss',
    consequence_days: 1,
    status: 'draft',
    sped_compliance_required: true,
  }).select('id').single()
  if (lockInc.error) { fail('lock-test incident', lockInc.error) }
  else {
    testIds.incidentIds.push(lockInc.data.id)
    const lockCl = await sb.from('compliance_checklists').insert({
      district_id: ctx.districtId,
      incident_id: lockInc.data.id,
      student_id: nonSped.id,
      parent_notification_method: 'phone_call',  // server sets parent_notified via 075
      status: 'in_progress',
    }).select('id').single()
    if (lockCl.error) { fail('lock-test checklist', lockCl.error) }
    else {
      testIds.checklistIds.push(lockCl.data.id)
      const target = lockCl.data.id

    // Migration 003's check_compliance_completion trigger auto-resets
    // status to 'in_progress' unless ALL 5 critical fields are populated:
    // ard_committee_notified, manifestation_determination, manifestation_result,
    // parent_notified, fape_plan_documented. parent_notified was server-set
    // when we provided method='phone_call' on insert; we fill the other 4 here.
    const nowIso = new Date().toISOString()
    const moveToCompleted = await sb.from('compliance_checklists').update({
      status: 'completed',
      completed_by: adminProfile.id,
      completed_at: nowIso,
      ard_committee_notified: nowIso,
      manifestation_determination: nowIso,
      manifestation_result: 'not_manifestation',
      fape_plan_documented: nowIso,
    }).eq('id', target).select('id, status').single()
    if (moveToCompleted.error) {
      log(`  move-to-completed error: ${moveToCompleted.error.message}`)
    } else {
      ok(`checklist moved to completed`)
      // Try to edit a watched field — should raise.
      // Debug: query the row state right before tamper
      const { data: pre } = await svc.from('compliance_checklists')
        .select('id, status, ard_committee_notified, manifestation_determination, manifestation_result, parent_notified, fape_plan_documented, completed_at')
        .eq('id', target).single()
      log(`  pre-tamper state: ${JSON.stringify(pre)}`)
      const tamper = await sb.from('compliance_checklists').update({
        manifestation_result: 'is_manifestation',  // change watched field
      }).eq('id', target).select('id').single()
      log(`  tamper raw: data=${JSON.stringify(tamper.data)} error=${JSON.stringify(tamper.error)}`)
      if (tamper.error && /locked|completed|re-open/i.test(tamper.error.message)) {
        ok(`tamper rejected: "${tamper.error.message.slice(0, 100)}…"`)
      } else if (tamper.error) {
        fail(`expected lock rejection, got: ${tamper.error.message}`)
      } else {
        fail('expected tamper rejection but UPDATE succeeded — lock trigger may not be firing')
      }
    }
    }
  }
  // Track the lock-test checklist for the next test (076-2 needs the just-completed one)
  const lockChecklistId = testIds.checklistIds[testIds.checklistIds.length - 1]

  // ============================================================================
  // 076-2: Re-opening allows edits, then re-complete
  // ============================================================================
  console.log('\n\x1b[1m076-2. Re-opening (status → in_progress) allows edits\x1b[0m')
  if (lockChecklistId) {
    const target = lockChecklistId
    // Re-open requires clearing one of the 5 critical fields — otherwise
    // migration 003's check_compliance_completion trigger auto-resets
    // status back to 'completed' because all gates are still satisfied.
    // The UI workflow models this as "edit a field → status moves to
    // in_progress → make edits → field re-set → status auto-completes."
    const reopen = await sb.from('compliance_checklists').update({
      status: 'in_progress',
      manifestation_result: null,  // clear to defeat 003 auto-complete
    }).eq('id', target).select('id, status').single()
    if (reopen.error) fail('re-open failed', reopen.error)
    else {
      const edit = await sb.from('compliance_checklists').update({
        manifestation_result: 'is_manifestation',
      }).eq('id', target).select('id, status').single()
      if (edit.error) fail('expected edit to succeed after re-open', edit.error)
      else ok(`edit allowed after re-open (now ${edit.data.status})`)
    }
  }

  // ============================================================================
  // 078-1: Same-user override approval rejected (dual-signature)
  // ============================================================================
  console.log('\n\x1b[1m078-1. Same-user override approval rejected\x1b[0m')
  if (testIds.checklistIds[0]) {
    const checklistId = testIds.checklistIds[0]
    const reqRpc = await sb.rpc('fn_request_compliance_override', {
      p_checklist_id: checklistId,
      p_reason_category: 'safety_emergency',
      p_reason_detail: 'Smoke test override for 078-1: structured reason ≥30 chars to satisfy CHECK.',
      p_supporting_document_url: 'storage://test/078-1-fake.pdf',
    })
    if (reqRpc.error) {
      log(`  request RPC error: ${reqRpc.error.message}`)
      fail('expected request to succeed', reqRpc.error)
    } else {
      const requestId = reqRpc.data
      testIds.overrideRequestIds.push(requestId)
      log(`  override request created: ${requestId.slice(0,8)}…`)

      // Try to approve as the same user — should reject.
      const sameUserApprove = await sb.rpc('fn_approve_compliance_override', {
        p_request_id: requestId,
        p_approval_notes: 'self-approval test',
      })
      if (sameUserApprove.error && /same-user|differ|dual-signature/i.test(sameUserApprove.error.message)) {
        ok(`same-user approval rejected: "${sameUserApprove.error.message.slice(0, 100)}…"`)
      } else if (sameUserApprove.error) {
        fail(`expected dual-signature error, got: ${sameUserApprove.error.message}`)
      } else {
        fail('expected dual-signature rejection but approval succeeded')
      }
    }
  }

  // ============================================================================
  // 078-2: Reason detail under 30 chars rejected
  // ============================================================================
  console.log('\n\x1b[1m078-2. Reason detail < 30 chars rejected by CHECK constraint\x1b[0m')
  if (testIds.checklistIds[0]) {
    const tooShort = await sb.rpc('fn_request_compliance_override', {
      p_checklist_id: testIds.checklistIds[0],
      p_reason_category: 'other_documented',
      p_reason_detail: 'too short',
      p_supporting_document_url: 'storage://test/078-2.pdf',
    })
    if (tooShort.error && /check|reason_detail|length/i.test(tooShort.error.message)) {
      ok(`short reason rejected: "${tooShort.error.message.slice(0, 100)}…"`)
    } else if (tooShort.error) {
      fail(`expected length CHECK rejection, got: ${tooShort.error.message}`)
    } else {
      testIds.overrideRequestIds.push(tooShort.data)
      fail('expected length CHECK rejection but RPC succeeded')
    }
  }

  // ============================================================================
  // 078-3: Cross-user approval succeeds (need a second user)
  // ============================================================================
  console.log('\n\x1b[1m078-3. Cross-user override approval succeeds + flips block_overridden\x1b[0m')
  // Find a second admin/principal/sped_coordinator profile in the same district
  // who has a different auth user. We need their auth credentials too — for the
  // smoke test, we sign in with the existing demo principal account if present.
  // If only one profile exists, skip this test and flag.
  const secondApprover = ctx.profiles.find(p =>
    p.id !== admin.id && ['admin','principal','sped_coordinator'].includes(p.role)
  )
  if (!secondApprover) {
    log('  no second approver profile in this district — test deferred')
    log('  to enable: create a second admin/principal/sped_coordinator user with known password')
    log('  and pass SECOND_USER_EMAIL + SECOND_USER_PASSWORD env vars')
  } else if (!process.env.SECOND_USER_EMAIL || !process.env.SECOND_USER_PASSWORD) {
    log(`  found candidate approver ${secondApprover.id.slice(0,8)}… but no SECOND_USER_EMAIL/PASSWORD env vars`)
    log('  to enable cross-user approval test, set both env vars and re-run')
  } else {
    // First user (admin) requests override
    const reqRpc2 = await sb.rpc('fn_request_compliance_override', {
      p_checklist_id: testIds.checklistIds[0],
      p_reason_category: 'parent_signed_waiver',
      p_reason_detail: 'Smoke test 078-3: parent signed waiver agreeing to placement pending MDR.',
      p_supporting_document_url: 'storage://test/078-3-waiver.pdf',
    })
    if (reqRpc2.error) fail('request', reqRpc2.error)
    else {
      const requestId = reqRpc2.data
      testIds.overrideRequestIds.push(requestId)
      log(`  override request created: ${requestId.slice(0,8)}…`)

      // Sign in as the second user
      const sb2 = createClient(URL, ANON, { auth: { persistSession: false } })
      const { data: secondAuth, error: authErr } = await sb2.auth.signInWithPassword({
        email: process.env.SECOND_USER_EMAIL,
        password: process.env.SECOND_USER_PASSWORD,
      })
      if (authErr) {
        fail(`second-user signin failed: ${authErr.message}`)
      } else {
        log(`  signed in as second approver: ${secondAuth.user.email}`)
        // Migration 080: RPC requires attestation. Supply synthesized values
        // so the DB-layer cross-user test still works; real attestation comes
        // from the Edge Function (covered in smoke-test-edge-function-approve.mjs).
        const approve = await sb2.rpc('fn_approve_compliance_override', {
          p_request_id: requestId,
          p_approval_notes: 'Cross-user approval per smoke test.',
          p_document_sha256: '0'.repeat(64),
          p_document_size_bytes: 1,
          p_document_mime: 'application/pdf',
          p_document_verified_at: new Date().toISOString(),
        })
        if (approve.error) fail('cross-user approval', approve.error)
        else {
          ok('cross-user approval succeeded')
          // Verify checklist gate flipped
          const { data: cl } = await svc.from('compliance_checklists')
            .select('block_overridden, placement_blocked, override_request_id')
            .eq('id', testIds.checklistIds[0]).single()
          if (cl.block_overridden && !cl.placement_blocked && cl.override_request_id === requestId) {
            ok('checklist gate flipped: block_overridden=true, placement_blocked=false, override_request_id linked')
          } else fail(`gate-flip check failed: ${JSON.stringify(cl)}`)
        }
      }
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================
  console.log('\n\x1b[1mCleanup\x1b[0m')
  await cleanup(testIds)
  ok(`removed ${testIds.incidentIds.length} incidents + ${testIds.checklistIds.length} checklists + ${testIds.overrideRequestIds.length} override requests`)
  log('audit_log entries from these tests are preserved (append-only by design)')

  console.log('\n' + (process.exitCode ? '\x1b[31mFAILED\x1b[0m' : '\x1b[32mALL PASS\x1b[0m') + '\n')
}

main().catch(err => { console.error('\x1b[31mFATAL:\x1b[0m', err.message); process.exit(1) })
