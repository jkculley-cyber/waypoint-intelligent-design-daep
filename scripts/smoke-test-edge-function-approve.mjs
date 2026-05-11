// Smoke test for the verify-and-approve-override Edge Function.
//
// Run: node scripts/smoke-test-edge-function-approve.mjs
//
// Verifies the function's full code path through a real HTTPS POST. The
// existing scripts/smoke-test-073-079.mjs covers the underlying RPC layer;
// this script proves the Edge Function gateway + document validation +
// caller-scoped RPC dispatch all work end-to-end after the CLI --no-verify-jwt
// redeploy resolved the CC22 INVALID_CREDENTIALS gateway block.
//
// Tests:
//   EF-1  Function rejects same-user approval at function layer (403)
//   EF-2  Function rejects request not in 'pending' status (409)
//   EF-3  http/https URL rejected (422)
//   EF-4  Document missing from Storage rejected (422)
//   EF-5  Empty (0 byte) document rejected (422)
//   EF-7  Happy path: real PDF + cross-user approval flips gate (200) +
//         SHA-256 attestation written + matches locally-computed hash (mig 080)
//   EF-8  Direct RPC bypass rejected — RPC requires attestation (mig 080)
//
// Not testable from outside: the function's MIME whitelist exactly mirrors the
// daep-documents bucket's `allowed_mime_types` policy. Any file that survives
// upload necessarily passes the function's MIME check. The function-layer MIME
// check is genuine defense-in-depth (protects if the bucket policy is ever
// loosened) but cannot be exercised end-to-end without temporarily widening
// the bucket policy.
//
// Requires:
//   .env.local with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
//   Demo users seeded: admin@lonestar-isd.org / hs-principal@lonestar-isd.org (Password123!)
//   Storage bucket: daep-documents

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID, createHash } from 'node:crypto'

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

const FN_URL = `${URL}/functions/v1/verify-and-approve-override`
const BUCKET = 'daep-documents'
const FOLDER = `smoke-test-edge/${randomUUID().slice(0, 8)}`

const REQUESTER_EMAIL = 'admin@lonestar-isd.org'
const REQUESTER_PASS  = 'Password123!'
const APPROVER_EMAIL  = 'hs-principal@lonestar-isd.org'
const APPROVER_PASS   = 'Password123!'

const TEST_PREFIX = 'SMOKE-EF-APPROVE'

const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })

const log  = (...a) => console.log('•', ...a)
const ok   = (m) => console.log('  \x1b[32m✓\x1b[0m', m)
const fail = (m, err) => {
  console.log('  \x1b[31m✗\x1b[0m', m, err ? '\n     ' + (err.message || JSON.stringify(err)) : '')
  process.exitCode = 1
}

async function signIn(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signin ${email} failed: ${error.message}`)
  return { client: c, user: data.user, token: data.session.access_token }
}

async function callFn(token, body) {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { status: res.status, body: json }
}

async function setup(requesterClient, requesterId) {
  const { data: districts } = await svc.from('districts').select('id, name').ilike('name', '%lone star%').limit(1)
  const districtId = districts[0].id

  const { data: students } = await svc.from('students')
    .select('id, campus_id').eq('district_id', districtId).eq('is_active', true).eq('is_sped', false).limit(1)
  const student = students[0]

  let { data: offenses } = await svc.from('offense_codes')
    .select('id').eq('district_id', districtId).eq('is_active', true).limit(1)
  if (!offenses?.length) {
    const fb = await svc.from('offense_codes').select('id').eq('is_active', true).limit(1)
    offenses = fb.data || []
  }
  const offense = offenses[0]

  // Use requester's authenticated client so audit + parent-notice triggers fire correctly.
  const { data: inc, error: incErr } = await requesterClient.from('incidents').insert({
    district_id: districtId,
    campus_id: student.campus_id,
    student_id: student.id,
    reported_by: requesterId,
    incident_date: new Date().toISOString().split('T')[0],
    offense_code_id: offense.id,
    description: `${TEST_PREFIX} edge-function smoke test`,
    consequence_type: 'iss',
    consequence_days: 1,
    status: 'draft',
  }).select('id').single()
  if (incErr) throw new Error(`create incident: ${incErr.message}`)

  const { data: cl, error: clErr } = await requesterClient.from('compliance_checklists').insert({
    district_id: districtId,
    incident_id: inc.id,
    student_id: student.id,
    status: 'in_progress',
  }).select('id').single()
  if (clErr) throw new Error(`create checklist: ${clErr.message}`)

  return { districtId, incidentId: inc.id, checklistId: cl.id }
}

async function requestOverride(requesterClient, checklistId, supportingDocUrl, reasonCategory = 'safety_emergency') {
  const { data, error } = await requesterClient.rpc('fn_request_compliance_override', {
    p_checklist_id: checklistId,
    p_reason_category: reasonCategory,
    p_reason_detail: 'Smoke test for verify-and-approve-override Edge Function — ≥30 chars satisfied.',
    p_supporting_document_url: supportingDocUrl,
  })
  if (error) throw new Error(`request override: ${error.message}`)
  return data  // request id
}

async function uploadFile(path, body, contentType) {
  const { error } = await svc.storage.from(BUCKET).upload(path, body, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`upload ${path}: ${error.message}`)
  return path
}

async function main() {
  console.log('\n\x1b[1mEdge Function smoke (verify-and-approve-override)\x1b[0m\n')
  log(`Function URL: ${FN_URL}`)
  log(`Storage folder: ${BUCKET}/${FOLDER}\n`)

  const requester = await signIn(REQUESTER_EMAIL, REQUESTER_PASS)
  log(`Requester: ${requester.user.email} (${requester.user.id.slice(0,8)}…)`)
  const approver = await signIn(APPROVER_EMAIL, APPROVER_PASS)
  log(`Approver:  ${approver.user.email} (${approver.user.id.slice(0,8)}…)\n`)

  // Track everything we create for cleanup.
  const cleanup = {
    incidents: [],
    checklists: [],
    overrides: [],
    storagePaths: [],
  }

  try {
    // Real document for the happy path
    const realPdfPath = `${FOLDER}/real.pdf`
    const minimalPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000098 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF\n',
      'utf8'
    )
    await uploadFile(realPdfPath, minimalPdf, 'application/pdf')
    cleanup.storagePaths.push(realPdfPath)
    const expectedSha256 = createHash('sha256').update(minimalPdf).digest('hex')
    log(`  expected SHA-256 of real.pdf: ${expectedSha256.slice(0, 16)}…\n`)

    // Empty file
    const emptyPath = `${FOLDER}/empty.pdf`
    await uploadFile(emptyPath, Buffer.alloc(0), 'application/pdf')
    cleanup.storagePaths.push(emptyPath)

    // ========================================================================
    // EF-1: Same-user approval rejected at function layer (403)
    // ========================================================================
    console.log('\x1b[1mEF-1. Same-user approval rejected at function layer (403)\x1b[0m')
    {
      const ctx = await setup(requester.client, requester.user.id)
      cleanup.incidents.push(ctx.incidentId)
      cleanup.checklists.push(ctx.checklistId)

      const reqId = await requestOverride(requester.client, ctx.checklistId, realPdfPath)
      cleanup.overrides.push(reqId)
      log(`  request: ${reqId.slice(0,8)}…`)

      const { status, body } = await callFn(requester.token, { request_id: reqId })
      if (status === 403 && /same-user/i.test(body.error || '')) {
        ok(`rejected: ${status} "${body.error.slice(0, 80)}…"`)
      } else {
        fail(`expected 403 same-user, got ${status} ${JSON.stringify(body)}`)
      }
    }

    // ========================================================================
    // EF-2: Request not in 'pending' status (409)
    // ========================================================================
    console.log('\n\x1b[1mEF-2. Already-approved request rejected (409)\x1b[0m')
    {
      const ctx = await setup(requester.client, requester.user.id)
      cleanup.incidents.push(ctx.incidentId)
      cleanup.checklists.push(ctx.checklistId)

      const reqId = await requestOverride(requester.client, ctx.checklistId, realPdfPath)
      cleanup.overrides.push(reqId)

      // Approve once via approver — should succeed (this is also EF-7's flow, but
      // we replay it here to set up the non-pending state for the second call).
      const first = await callFn(approver.token, { request_id: reqId })
      if (first.status !== 200) {
        fail(`pre-condition: first approval failed ${first.status} ${JSON.stringify(first.body)}`)
      } else {
        log(`  first approval ok (sets non-pending state)`)
        const second = await callFn(approver.token, { request_id: reqId })
        if (second.status === 409 && /already/i.test(second.body.error || '')) {
          ok(`re-approve rejected: ${second.status} "${second.body.error.slice(0, 80)}…"`)
        } else {
          fail(`expected 409 already-approved, got ${second.status} ${JSON.stringify(second.body)}`)
        }
      }
    }

    // ========================================================================
    // EF-3: http/https URL rejected (422)
    // ========================================================================
    console.log('\n\x1b[1mEF-3. External http(s) URL rejected (422)\x1b[0m')
    {
      const ctx = await setup(requester.client, requester.user.id)
      cleanup.incidents.push(ctx.incidentId)
      cleanup.checklists.push(ctx.checklistId)

      const reqId = await requestOverride(
        requester.client, ctx.checklistId,
        'https://example.com/parent-waiver.pdf'
      )
      cleanup.overrides.push(reqId)

      const { status, body } = await callFn(approver.token, { request_id: reqId })
      if (status === 422 && /external URL|Storage path/i.test(body.error || '')) {
        ok(`rejected: ${status} "${body.error.slice(0, 80)}…"`)
      } else {
        fail(`expected 422 external-url, got ${status} ${JSON.stringify(body)}`)
      }
    }

    // ========================================================================
    // EF-4: Document missing from Storage (422)
    // ========================================================================
    console.log('\n\x1b[1mEF-4. Document missing from Storage (422)\x1b[0m')
    {
      const ctx = await setup(requester.client, requester.user.id)
      cleanup.incidents.push(ctx.incidentId)
      cleanup.checklists.push(ctx.checklistId)

      const reqId = await requestOverride(
        requester.client, ctx.checklistId,
        `${FOLDER}/this-file-does-not-exist.pdf`
      )
      cleanup.overrides.push(reqId)

      const { status, body } = await callFn(approver.token, { request_id: reqId })
      if (status === 422 && /not found in Storage/i.test(body.error || '')) {
        ok(`rejected: ${status} "${body.error.slice(0, 80)}…"`)
      } else {
        fail(`expected 422 not-found, got ${status} ${JSON.stringify(body)}`)
      }
    }

    // ========================================================================
    // EF-5: Empty (0-byte) document rejected (422)
    // ========================================================================
    console.log('\n\x1b[1mEF-5. Empty (0-byte) document rejected (422)\x1b[0m')
    {
      const ctx = await setup(requester.client, requester.user.id)
      cleanup.incidents.push(ctx.incidentId)
      cleanup.checklists.push(ctx.checklistId)

      const reqId = await requestOverride(requester.client, ctx.checklistId, emptyPath)
      cleanup.overrides.push(reqId)

      const { status, body } = await callFn(approver.token, { request_id: reqId })
      if (status === 422 && /0 bytes|empty/i.test(body.error || '')) {
        ok(`rejected: ${status} "${body.error.slice(0, 80)}…"`)
      } else {
        fail(`expected 422 empty, got ${status} ${JSON.stringify(body)}`)
      }
    }

    // EF-6 (bad MIME) is intentionally skipped — see header comment.

    // ========================================================================
    // EF-7: Happy path — real PDF + cross-user approval flips gate (200)
    // ========================================================================
    console.log('\n\x1b[1mEF-7. Happy path: cross-user approval succeeds + gate flips\x1b[0m')
    {
      const ctx = await setup(requester.client, requester.user.id)
      cleanup.incidents.push(ctx.incidentId)
      cleanup.checklists.push(ctx.checklistId)

      const reqId = await requestOverride(requester.client, ctx.checklistId, realPdfPath)
      cleanup.overrides.push(reqId)

      const { status, body } = await callFn(approver.token, {
        request_id: reqId,
        approval_notes: 'Approved via smoke test after document verification.',
      })
      if (status === 200 && body.success === true) {
        ok(`200 success — verified ${body.document_verified?.filename} (${body.document_verified?.size_bytes} bytes, ${body.document_verified?.mime})`)

        // Hash returned by function must match what we computed locally
        if (body.document_verified?.sha256 === expectedSha256) {
          ok(`function-returned SHA-256 matches local: ${expectedSha256.slice(0, 16)}…`)
        } else {
          fail(`SHA-256 mismatch: function=${body.document_verified?.sha256?.slice(0,16)}… local=${expectedSha256.slice(0,16)}…`)
        }

        const { data: cl } = await svc.from('compliance_checklists')
          .select('block_overridden, override_request_id')
          .eq('id', ctx.checklistId).single()
        if (cl?.block_overridden === true && cl?.override_request_id === reqId) {
          ok(`checklist gate flipped: block_overridden=true, override_request_id linked`)
        } else {
          fail(`gate-flip check: ${JSON.stringify(cl)}`)
        }

        const { data: orow } = await svc.from('compliance_override_requests')
          .select('approval_status, approved_by, approval_notes, document_sha256, document_size_bytes, document_mime, document_verified_at')
          .eq('id', reqId).single()
        if (orow?.approval_status === 'approved' && orow?.approved_by === approver.user.id) {
          ok(`override row: status=approved, approved_by=approver (${approver.user.id.slice(0,8)}…)`)
        } else {
          fail(`override row check: ${JSON.stringify(orow)}`)
        }
        // Attestation persisted on row (mig 080)
        if (orow?.document_sha256 === expectedSha256
            && orow?.document_size_bytes === minimalPdf.length
            && orow?.document_mime === 'application/pdf'
            && orow?.document_verified_at) {
          ok(`attestation persisted: sha256 + size (${orow.document_size_bytes}b) + mime + verified_at`)
        } else {
          fail(`attestation persistence check: ${JSON.stringify({
            sha256: orow?.document_sha256?.slice(0,16),
            size: orow?.document_size_bytes,
            mime: orow?.document_mime,
            verified_at: orow?.document_verified_at,
          })}`)
        }
      } else {
        fail(`expected 200 success, got ${status} ${JSON.stringify(body)}`)
      }
    }

    // ========================================================================
    // EF-8: Direct RPC bypass rejected — RPC requires attestation (mig 080)
    // ========================================================================
    console.log('\n\x1b[1mEF-8. Direct RPC call without attestation is rejected (mig 080)\x1b[0m')
    {
      const ctx = await setup(requester.client, requester.user.id)
      cleanup.incidents.push(ctx.incidentId)
      cleanup.checklists.push(ctx.checklistId)

      const reqId = await requestOverride(requester.client, ctx.checklistId, realPdfPath)
      cleanup.overrides.push(reqId)

      // Approver calls RPC directly, bypassing the Edge Function. Pre-mig-080
      // this would succeed (no chain-of-custody). After mig-080 it must raise.
      const { error: rpcErr } = await approver.client.rpc('fn_approve_compliance_override', {
        p_request_id: reqId,
        p_approval_notes: 'Direct RPC bypass attempt',
        // attestation params intentionally omitted
      })
      if (rpcErr && /attestation required|TOCTOU|Edge Function/i.test(rpcErr.message)) {
        ok(`bypass rejected: "${rpcErr.message.slice(0, 100)}…"`)
      } else if (rpcErr) {
        fail(`expected attestation-required error, got: ${rpcErr.message}`)
      } else {
        fail('expected RPC rejection but direct approval succeeded — TOCTOU gap NOT closed')
      }
    }
  } finally {
    // ======================================================================
    // Cleanup — preserves audit_log entries (append-only by design)
    // ======================================================================
    console.log('\n\x1b[1mCleanup\x1b[0m')
    if (cleanup.overrides.length) {
      await svc.from('compliance_override_requests').delete().in('id', cleanup.overrides)
    }
    if (cleanup.checklists.length) {
      // Drop override linkage first so we can delete the checklist row.
      await svc.from('compliance_checklists').update({ override_request_id: null }).in('id', cleanup.checklists)
      await svc.from('incidents').update({ compliance_checklist_id: null }).in('id', cleanup.incidents)
      await svc.from('compliance_checklists').delete().in('id', cleanup.checklists)
    }
    if (cleanup.incidents.length) {
      await svc.from('incidents').delete().in('id', cleanup.incidents)
    }
    if (cleanup.storagePaths.length) {
      await svc.storage.from(BUCKET).remove(cleanup.storagePaths)
    }
    ok(`removed ${cleanup.incidents.length} incidents + ${cleanup.checklists.length} checklists + ${cleanup.overrides.length} override requests + ${cleanup.storagePaths.length} storage files`)
    log('audit_log entries preserved (append-only by design)')
  }

  console.log('\n' + (process.exitCode ? '\x1b[31mFAILED\x1b[0m' : '\x1b[32mALL PASS\x1b[0m') + '\n')
}

main().catch(err => {
  console.error('\x1b[31mFATAL:\x1b[0m', err.message)
  process.exit(1)
})
