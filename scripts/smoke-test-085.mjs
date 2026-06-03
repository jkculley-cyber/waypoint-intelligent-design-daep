// Smoke test — migration 085 Navigator audit-chain verification surface.
//
// Verifies, against the live DB, that:
//   1. fn_navigator_verify_chain() returns broken_count=0 for a staff caller.
//   2. fn_navigator_verify_student_history(student) returns per-record rows.
//   3. Both RPCs reject parent/student callers with 42501 (the role gate).
//
// Needs a CURRENT publishable anon key + real demo creds in .env.local
// (the CC29 legacy keys are revoked — this will 401 until refreshed).
//
// Env (with sensible demo defaults):
//   STAFF_EMAIL / STAFF_PASSWORD   — a Navigator staff account (default Lincoln HS admin)
//   PARENT_EMAIL / PARENT_PASSWORD — a parent account (optional; gate test skipped if absent)
//
// Run: node scripts/smoke-test-085.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/\r/g, '').replace(/^["']|["']$/g, '')]
    })
)

const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
if (!URL || !ANON) { console.error('missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'); process.exit(1) }

const STAFF_EMAIL = process.env.STAFF_EMAIL || 'explore-navigator@clearpathedgroup.com'
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'Explore2026!'
const PARENT_EMAIL = process.env.PARENT_EMAIL || ''
const PARENT_PASSWORD = process.env.PARENT_PASSWORD || ''

let pass = 0, fail = 0
const ok = (cond, msg) => { (cond ? (pass++, console.log('  PASS', msg)) : (fail++, console.log('  FAIL', msg))) }

async function asUser(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return c
}

async function main() {
  console.log('085 smoke — staff:', STAFF_EMAIL)
  const staff = await asUser(STAFF_EMAIL, STAFF_PASSWORD)

  // 1. Whole-chain integrity
  const { data: vc, error: vcErr } = await staff.rpc('fn_navigator_verify_chain')
  ok(!vcErr, `verify_chain callable by staff${vcErr ? ' — ' + vcErr.message : ''}`)
  if (vc?.length) {
    const h = vc[0]
    ok(Number(h.broken_count) === 0, `chain broken_count=0 (got ${h.broken_count})`)
    ok(Number(h.total_count) > 0, `chain total_count>0 (got ${h.total_count})`)
    ok(/^[0-9a-f]{64}$/.test(h.head_hash || ''), 'chain head_hash is 64-hex')
  }

  // 2. Per-student cross-check — discover a real student with a placement
  const { data: pl } = await staff.from('navigator_placements').select('student_id').limit(1)
  const studentId = pl?.[0]?.student_id
  if (studentId) {
    const { data: vh, error: vhErr } = await staff.rpc('fn_navigator_verify_student_history', { p_student_id: studentId })
    ok(!vhErr, `verify_student_history callable${vhErr ? ' — ' + vhErr.message : ''}`)
    ok(Array.isArray(vh), `returns rows (${vh?.length ?? 0}) for student ${studentId.slice(0, 8)}`)
    if (vh?.length) {
      const r = vh[0]
      ok('audited' in r && 'history_matches_chain' in r && 'live_value_matches' in r, 'rows carry verdict columns')
    }
  } else {
    console.log('  SKIP per-student check — no placement visible to this staff account')
  }

  // 3. Role gate — parent rejected (42501)
  if (PARENT_EMAIL && PARENT_PASSWORD) {
    const parent = await asUser(PARENT_EMAIL, PARENT_PASSWORD)
    const { error: pErr } = await parent.rpc('fn_navigator_verify_chain')
    ok(pErr && (pErr.code === '42501' || /cannot verify/i.test(pErr.message)), `parent rejected by verify_chain (${pErr?.code || 'no error!'})`)
    const { error: pErr2 } = await parent.rpc('fn_navigator_verify_student_history', { p_student_id: studentId || '00000000-0000-0000-0000-000000000000' })
    ok(pErr2 && (pErr2.code === '42501' || /cannot verify/i.test(pErr2.message)), `parent rejected by verify_student_history (${pErr2?.code || 'no error!'})`)
  } else {
    console.log('  SKIP role-gate test — set PARENT_EMAIL / PARENT_PASSWORD to enable')
  }

  console.log(`\n085 smoke: ${pass} pass / ${fail} fail`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
