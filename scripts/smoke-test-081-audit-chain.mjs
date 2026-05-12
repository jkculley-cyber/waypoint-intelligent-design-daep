// Smoke test for migration 081 — audit_edit_log WORM mirror with hash chain.
//
// Run: node scripts/smoke-test-081-audit-chain.mjs
//
// Pattern mirrors smoke-test-073-079.mjs:
//   - Anon client + auth.signInWithPassword for audited inserts (so the
//     audit_log row gets a real auth.uid()).
//   - Service-role client for setup queries + lockdown verification (REVOKE
//     should block service_role from direct INSERT/UPDATE/DELETE even with
//     RLS bypass).
//
// Tests:
//   T1  Mirror trigger fires — INSERT into audit_log produces audit_edit_log row
//   T2  Chain link — new row's prev_row_hash == previous chain head's row_hash
//   T3  Hash shape — row_hash is 64-char lowercase hex
//   T4  Chain continues across multiple inserts — second new row links to first
//   T5  fn_verify_audit_edit_log_chain reports 0 broken
//   T6  fn_verify_audit_log_matches_edit_log reports 0 mismatched / 0 orphan
//   T7  Idempotency — fn_append_audit_edit_log on existing row raises P0001
//   T8  Lockdown — direct INSERT into audit_edit_log via service-role is rejected
//   T9  Lockdown — direct UPDATE on audit_edit_log via service-role is rejected
//   T10 Lockdown — direct DELETE on audit_edit_log via service-role is rejected
//
// Cleanup: audit rows are append-only by design. Test rows are tagged with
// action='SMOKE_TEST_081' so they're queryable but stay.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

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
const TEST_ACTION = 'SMOKE_TEST_081'

const log = (...a) => console.log('•', ...a)
const ok = (msg) => console.log('  \x1b[32m✓\x1b[0m', msg)
const fail = (msg, err) => {
  console.log('  \x1b[31m✗\x1b[0m', msg, err ? '\n     ' + (err.message || err) : '')
  process.exitCode = 1
}

async function setup() {
  const { data: districts, error: dErr } = await svc.from('districts')
    .select('id, name').ilike('name', '%lone star%').limit(1)
  if (dErr || !districts?.length) throw new Error('Lone Star ISD demo district not found: ' + (dErr?.message || ''))
  const districtId = districts[0].id

  log('Signing in as', ADMIN_EMAIL)
  const { data: signin, error: sErr } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  })
  if (sErr || !signin?.user) throw new Error('signIn failed: ' + (sErr?.message || ''))
  const userId = signin.user.id

  return { districtId, userId }
}

async function getChainHead() {
  const { data, error } = await svc.from('audit_edit_log')
    .select('seq, row_hash, audit_log_id')
    .order('seq', { ascending: false })
    .limit(1)
  if (error) throw new Error('getChainHead failed: ' + error.message)
  return data?.[0] || null
}

async function insertAuditLogRow(districtId, userId, entityId) {
  // Signed-in user inserts via anon client — same path src/lib/audit.js uses.
  const { data, error } = await sb.from('audit_log').insert({
    district_id: districtId,
    user_id: userId,
    action: TEST_ACTION,
    entity_type: 'smoke_test',
    entity_id: entityId,
    changes: { test: true, ts: new Date().toISOString() },
  }).select('id').single()
  if (error) throw new Error('audit_log insert failed: ' + error.message)
  return data.id
}

async function getMirroredRow(auditLogId) {
  const { data, error } = await svc.from('audit_edit_log')
    .select('seq, audit_log_id, prev_row_hash, row_hash, row_canonical, action, entity_id')
    .eq('audit_log_id', auditLogId)
    .single()
  if (error) throw new Error('audit_edit_log lookup failed: ' + error.message)
  return data
}

async function run() {
  const ctx = await setup()
  log(`District ${ctx.districtId.slice(0, 8)} / user ${ctx.userId.slice(0, 8)}`)

  // T1: Mirror trigger fires
  log('\nT1: Mirror trigger fires on audit_log INSERT')
  const headBefore = await getChainHead()
  const entityId1 = randomUUID()
  let auditId1
  try {
    auditId1 = await insertAuditLogRow(ctx.districtId, ctx.userId, entityId1)
    const mirrored = await getMirroredRow(auditId1)
    if (mirrored.audit_log_id !== auditId1) throw new Error('audit_log_id mismatch')
    if (mirrored.action !== TEST_ACTION) throw new Error('action mismatch')
    if (mirrored.entity_id !== entityId1) throw new Error('entity_id mismatch')
    ok('audit_edit_log row created with matching audit_log_id / action / entity_id')
  } catch (err) {
    fail('mirror trigger', err)
    return
  }

  // T2: Chain link
  log('\nT2: New row links to previous chain head')
  try {
    const mirrored = await getMirroredRow(auditId1)
    const expectedPrev = headBefore?.row_hash || null
    if (mirrored.prev_row_hash !== expectedPrev) {
      throw new Error(`expected prev_row_hash=${expectedPrev}, got ${mirrored.prev_row_hash}`)
    }
    ok(`prev_row_hash = ${expectedPrev?.slice(0, 16) || '<NULL — first row>'}...`)
  } catch (err) {
    fail('chain link', err)
  }

  // T3: Hash shape
  log('\nT3: row_hash is 64-char lowercase hex')
  try {
    const mirrored = await getMirroredRow(auditId1)
    if (!/^[0-9a-f]{64}$/.test(mirrored.row_hash)) {
      throw new Error(`row_hash bad shape: ${mirrored.row_hash}`)
    }
    ok(`row_hash = ${mirrored.row_hash.slice(0, 16)}...`)
  } catch (err) {
    fail('hash shape', err)
  }

  // T4: Chain continues across multiple inserts
  log('\nT4: Second insert links to first new row')
  let auditId2
  try {
    auditId2 = await insertAuditLogRow(ctx.districtId, ctx.userId, randomUUID())
    const first = await getMirroredRow(auditId1)
    const second = await getMirroredRow(auditId2)
    if (second.prev_row_hash !== first.row_hash) {
      throw new Error(`chain link broken: second.prev_row_hash=${second.prev_row_hash}, first.row_hash=${first.row_hash}`)
    }
    if (second.seq !== first.seq + 1) {
      throw new Error(`seq not contiguous: first=${first.seq}, second=${second.seq}`)
    }
    ok(`seq ${first.seq} → ${second.seq}, chain link verified`)
  } catch (err) {
    fail('multi-insert chain', err)
  }

  // T5: fn_verify_audit_edit_log_chain
  log('\nT5: fn_verify_audit_edit_log_chain reports 0 broken')
  try {
    const { data, error } = await sb.rpc('fn_verify_audit_edit_log_chain')
    if (error) throw new Error('RPC failed: ' + error.message)
    const r = Array.isArray(data) ? data[0] : data
    if (r.broken_count > 0 || r.first_broken_seq !== null) {
      throw new Error(`chain has breaks: first=${r.first_broken_seq}, count=${r.broken_count}`)
    }
    if (!/^[0-9a-f]{64}$/.test(r.head_hash)) {
      throw new Error(`head_hash bad shape: ${r.head_hash}`)
    }
    ok(`chain clean — ${r.total_count} rows, head seq ${r.head_seq}, head hash ${r.head_hash.slice(0, 16)}...`)
  } catch (err) {
    fail('chain verify', err)
  }

  // T6: fn_verify_audit_log_matches_edit_log
  log('\nT6: fn_verify_audit_log_matches_edit_log reports clean')
  try {
    const { data, error } = await sb.rpc('fn_verify_audit_log_matches_edit_log')
    if (error) throw new Error('RPC failed: ' + error.message)
    const r = Array.isArray(data) ? data[0] : data
    if (r.unmirrored_count > 0) {
      throw new Error(`unmirrored audit_log rows exist: ${r.unmirrored_count} (first=${r.first_unmirrored_id})`)
    }
    if (r.orphaned_count > 0) {
      throw new Error(`orphaned audit_edit_log rows: ${r.orphaned_count} (first=${r.first_orphaned_audit_log_id})`)
    }
    if (r.mismatched_count > 0) {
      throw new Error(`mismatched canonical: ${r.mismatched_count} (first=${r.first_mismatched_id})`)
    }
    ok(`cross-check clean — audit_log=${r.audit_log_total}, audit_edit_log=${r.audit_edit_log_total}`)
  } catch (err) {
    fail('cross-check verify', err)
  }

  // T7: Idempotency
  log('\nT7: fn_append_audit_edit_log on existing row raises P0001')
  try {
    const { error } = await sb.rpc('fn_append_audit_edit_log', { p_audit_log_id: auditId1 })
    if (!error) throw new Error('expected error, got success')
    if (!/already mirrored/i.test(error.message)) {
      throw new Error('wrong error: ' + error.message)
    }
    ok('rejected with "already mirrored"')
  } catch (err) {
    fail('idempotency', err)
  }

  // T8: Lockdown — direct INSERT via service-role
  log('\nT8: Direct INSERT into audit_edit_log via service-role is rejected')
  try {
    const { error } = await svc.from('audit_edit_log').insert({
      audit_log_id: randomUUID(),
      user_id: ctx.userId,
      action: 'TAMPER',
      entity_type: 'tamper',
      entity_id: randomUUID(),
      audit_created_at: new Date().toISOString(),
      row_canonical: 'tampered',
      row_hash: '0'.repeat(64),
    })
    if (!error) throw new Error('INSERT succeeded — lockdown broken')
    // Expect 42501 (permission denied) or RLS rejection (PGRST or 42501)
    ok(`rejected: ${error.code || ''} ${error.message.slice(0, 80)}`)
  } catch (err) {
    fail('lockdown INSERT', err)
  }

  // T9: Lockdown — direct UPDATE via service-role
  log('\nT9: Direct UPDATE on audit_edit_log via service-role is rejected')
  try {
    const { error, count } = await svc.from('audit_edit_log')
      .update({ row_hash: '0'.repeat(64) })
      .eq('audit_log_id', auditId1)
    if (!error && (count === null || count > 0)) {
      // If count is null but no error, fetch and check
      const after = await getMirroredRow(auditId1)
      if (after.row_hash === '0'.repeat(64)) {
        throw new Error('UPDATE succeeded — lockdown broken')
      }
      // Otherwise the update was silently no-op'd, which is the success case
      ok('rejected (silently no-op via REVOKE)')
    } else if (error) {
      ok(`rejected: ${error.code || ''} ${error.message.slice(0, 80)}`)
    } else {
      ok('rejected (no rows affected)')
    }
  } catch (err) {
    fail('lockdown UPDATE', err)
  }

  // T10: Lockdown — direct DELETE via service-role
  log('\nT10: Direct DELETE on audit_edit_log via service-role is rejected')
  try {
    const { error, count } = await svc.from('audit_edit_log')
      .delete()
      .eq('audit_log_id', auditId1)
    if (!error && (count === null || count > 0)) {
      // If count is null but no error, fetch and check existence
      const after = await svc.from('audit_edit_log')
        .select('audit_log_id').eq('audit_log_id', auditId1).maybeSingle()
      if (!after.data) {
        throw new Error('DELETE succeeded — lockdown broken')
      }
      ok('rejected (silently no-op via REVOKE)')
    } else if (error) {
      ok(`rejected: ${error.code || ''} ${error.message.slice(0, 80)}`)
    } else {
      ok('rejected (no rows affected)')
    }
  } catch (err) {
    fail('lockdown DELETE', err)
  }

  // Final re-verify — ensure none of the lockdown probes corrupted the chain
  log('\nFinal: re-verify chain after lockdown probes')
  try {
    const { data, error } = await sb.rpc('fn_verify_audit_edit_log_chain')
    if (error) throw new Error('RPC failed: ' + error.message)
    const r = Array.isArray(data) ? data[0] : data
    if (r.broken_count > 0) {
      throw new Error(`chain broken after probes — first=${r.first_broken_seq}, count=${r.broken_count}`)
    }
    ok(`chain still clean — ${r.total_count} rows, head seq ${r.head_seq}`)
  } catch (err) {
    fail('final re-verify', err)
  }
}

run().then(() => {
  console.log(process.exitCode ? '\nFAIL' : '\nPASS')
  process.exit(process.exitCode || 0)
}).catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
