// Smoke test for migration 082 + verify-and-backup-audit-chain Edge Function.
//
// Run: node scripts/smoke-test-082-audit-backup.mjs
//
// Tests:
//   T1  State row exists + initial shape (id=1, last_backed_up_seq present)
//   T2  Lock RPC: acquire=true → re-acquire=false → release+complete clears
//   T3  Edge Function invocation returns status='ok' with head_hash+seq
//   T4  State row updated post-run (last_status='ok', last_head_hash set)
//   T5  Storage chain_head.json exists at expected path + parseable + has expected fields
//   T6  Storage rows JSONL exists if new rows were backed up
//   T7  Insert a new audit_log row → re-invoke EF → new run captures the delta
//   T8  Lockdown — anon cannot list bucket objects
//   T9  Lockdown — non-waypoint_admin user cannot SELECT state row

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
const anonOnly = createClient(URL, ANON, { auth: { persistSession: false } })

const ADMIN_EMAIL = 'admin@lonestar-isd.org'
const ADMIN_PASSWORD = 'Password123!'
const TEST_ACTION = 'SMOKE_TEST_082'
const EF_NAME = 'verify-and-backup-audit-chain'

const log = (...a) => console.log('•', ...a)
const ok = (msg) => console.log('  \x1b[32m✓\x1b[0m', msg)
const fail = (msg, err) => {
  console.log('  \x1b[31m✗\x1b[0m', msg, err ? '\n     ' + (err.message || err) : '')
  process.exitCode = 1
}

async function setup() {
  const { data: districts } = await svc.from('districts').select('id, name').ilike('name', '%lone star%').limit(1)
  if (!districts?.length) throw new Error('Lone Star ISD demo district not found')
  const districtId = districts[0].id

  log('Signing in as', ADMIN_EMAIL)
  const { data: signin, error: sErr } = await sb.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  })
  if (sErr || !signin?.user) throw new Error('signIn failed: ' + (sErr?.message || ''))

  return { districtId, userId: signin.user.id, accessToken: signin.session.access_token }
}

async function invokeFunction(accessToken) {
  const res = await fetch(`${URL}/functions/v1/${EF_NAME}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'apikey': ANON,
    },
    body: '{}',
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = { raw: text } }
  return { status: res.status, body }
}

async function insertAuditLogRow(districtId, userId) {
  const { data, error } = await sb.from('audit_log').insert({
    district_id: districtId,
    user_id: userId,
    action: TEST_ACTION,
    entity_type: 'smoke_test',
    entity_id: randomUUID(),
    changes: { test: true, ts: new Date().toISOString() },
  }).select('id').single()
  if (error) throw new Error('audit_log insert failed: ' + error.message)
  return data.id
}

async function run() {
  const ctx = await setup()
  log(`District ${ctx.districtId.slice(0, 8)} / user ${ctx.userId.slice(0, 8)}`)

  // T1: State row shape
  log('\nT1: audit_chain_backup_state singleton row')
  try {
    const { data, error } = await svc.from('audit_chain_backup_state').select('*').eq('id', 1).single()
    if (error) throw error
    if (data.id !== 1) throw new Error('id != 1')
    if (typeof data.last_backed_up_seq !== 'number') throw new Error('last_backed_up_seq missing')
    ok(`row present, last_backed_up_seq=${data.last_backed_up_seq}, last_status=${data.last_status ?? '<null>'}`)
  } catch (err) { fail('state row', err) }

  // T2: Lock RPC behavior (acquire → re-acquire→false → reset)
  log('\nT2: Lock RPC — acquire blocks re-acquire')
  try {
    // Reset state to a known-not-running state first
    await svc.rpc('fn_complete_audit_backup_run', {
      p_status: 'ok',
      p_backed_up_seq: null,
      p_head_hash: null,
      p_head_seq: null,
      p_error: 'smoke reset',
    })

    const { data: got1 } = await svc.rpc('fn_try_acquire_audit_backup_lock')
    if (got1 !== true) throw new Error(`first acquire returned ${got1}, expected true`)

    const { data: got2 } = await svc.rpc('fn_try_acquire_audit_backup_lock')
    if (got2 !== false) throw new Error(`second acquire returned ${got2}, expected false (already running)`)

    // Reset state for the Edge Function call below
    await svc.rpc('fn_complete_audit_backup_run', {
      p_status: 'ok',
      p_backed_up_seq: null,
      p_head_hash: null,
      p_head_seq: null,
      p_error: 'smoke reset after lock test',
    })
    ok('acquire → re-acquire returns false; reset succeeded')
  } catch (err) { fail('lock RPC', err) }

  // T3: Edge Function invocation
  log('\nT3: Invoke Edge Function — expect status=ok')
  let firstRun
  try {
    const r = await invokeFunction(ctx.accessToken)
    if (r.status !== 200) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`)
    if (r.body.status !== 'ok') throw new Error(`status=${r.body.status} body=${JSON.stringify(r.body).slice(0, 200)}`)
    if (!/^[0-9a-f]{64}$/.test(r.body.head_hash || '')) throw new Error('head_hash missing/malformed')
    if (typeof r.body.head_seq !== 'number') throw new Error('head_seq missing')
    firstRun = r.body
    ok(`status=ok, run_id=${r.body.run_id.slice(0, 8)}, head_seq=${r.body.head_seq}, new_rows=${r.body.new_rows_count}`)
  } catch (err) { fail('edge function invoke', err); return }

  // T4: State updated
  log('\nT4: State row updated post-run')
  try {
    const { data } = await svc.from('audit_chain_backup_state').select('*').eq('id', 1).single()
    if (data.last_status !== 'ok') throw new Error(`last_status=${data.last_status}, expected ok`)
    if (data.last_head_hash !== firstRun.head_hash) throw new Error('last_head_hash mismatch')
    if (data.last_head_seq !== firstRun.head_seq) throw new Error('last_head_seq mismatch')
    if (data.last_backed_up_seq !== firstRun.head_seq) throw new Error('last_backed_up_seq mismatch')
    ok(`last_status=ok, last_head_seq=${data.last_head_seq}, last_run_at=${data.last_run_at}`)
  } catch (err) { fail('state update', err) }

  // T5: Storage chain_head.json
  log('\nT5: Storage chain_head.json present + parseable')
  try {
    const path = firstRun.head_path
    if (!path) throw new Error('head_path missing from EF response')
    const { data, error } = await svc.storage.from('audit-edit-log-backups').download(path)
    if (error) throw error
    const text = await data.text()
    const parsed = JSON.parse(text)
    if (parsed.chain_head?.head_hash !== firstRun.head_hash) throw new Error('head_hash mismatch in Storage object')
    if (parsed.integrity_ok !== true) throw new Error('integrity_ok=false in Storage object')
    ok(`object at ${path}, ${text.length} bytes, integrity_ok=true`)
  } catch (err) { fail('storage head', err) }

  // T6: Storage rows JSONL (if backed up)
  log('\nT6: Storage rows JSONL present (if new rows existed)')
  try {
    if (firstRun.new_rows_count === 0) {
      ok('no new rows this run — JSONL skipped by design')
    } else {
      const path = firstRun.rows_path
      const { data, error } = await svc.storage.from('audit-edit-log-backups').download(path)
      if (error) throw error
      const text = await data.text()
      const lines = text.split('\n').filter(Boolean)
      if (lines.length !== firstRun.new_rows_count) {
        throw new Error(`line count ${lines.length} != new_rows_count ${firstRun.new_rows_count}`)
      }
      // Parse first line to confirm shape
      const first = JSON.parse(lines[0])
      if (typeof first.seq !== 'number' || !first.row_hash) throw new Error('first row missing fields')
      ok(`object at ${path}, ${lines.length} JSONL lines`)
    }
  } catch (err) { fail('storage rows', err) }

  // T7: New audit_log row → re-invoke → delta captured
  log('\nT7: New audit_log row → re-invoke EF → delta captured')
  try {
    const auditId = await insertAuditLogRow(ctx.districtId, ctx.userId)
    log(`  inserted audit_log row ${auditId.slice(0, 8)}`)

    // Reset state so we can re-acquire (the prior run left it 'ok' which is acquirable)
    const r = await invokeFunction(ctx.accessToken)
    if (r.status !== 200) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body)}`)
    if (r.body.status !== 'ok') throw new Error(`status=${r.body.status}`)
    if (r.body.new_rows_count < 1) throw new Error(`new_rows_count=${r.body.new_rows_count}, expected >= 1`)
    if (r.body.head_seq <= firstRun.head_seq) throw new Error(`head_seq did not advance: ${firstRun.head_seq} → ${r.body.head_seq}`)
    ok(`delta captured: head_seq ${firstRun.head_seq} → ${r.body.head_seq}, new_rows=${r.body.new_rows_count}`)
  } catch (err) { fail('delta capture', err) }

  // T8: Anon cannot list bucket
  log('\nT8: Anon cannot list audit-edit-log-backups')
  try {
    const { data, error } = await anonOnly.storage.from('audit-edit-log-backups').list('', { limit: 1 })
    // Anon should get either an error or an empty list (RLS hides everything)
    if (data && data.length > 0) {
      throw new Error(`anon listed ${data.length} objects — lockdown broken`)
    }
    ok(`anon list returned 0 objects (RLS hiding) or error: ${error?.message || '<empty>'}`)
  } catch (err) { fail('anon lockdown', err) }

  // T9: Non-waypoint_admin user cannot SELECT state row
  log('\nT9: District admin (non-waypoint_admin) cannot SELECT state row')
  try {
    // admin@lonestar-isd.org is role='admin' (district admin), NOT waypoint_admin
    const { data, error } = await sb.from('audit_chain_backup_state').select('*').eq('id', 1)
    if (data && data.length > 0) {
      throw new Error(`district admin read ${data.length} rows — state RLS broken`)
    }
    ok(`district admin read returned 0 rows (RLS hiding) ${error ? `or error: ${error.message}` : ''}`)
  } catch (err) { fail('state RLS', err) }
}

run().then(() => {
  console.log(process.exitCode ? '\nFAIL' : '\nPASS')
  process.exit(process.exitCode || 0)
}).catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
