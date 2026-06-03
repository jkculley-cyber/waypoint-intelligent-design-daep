// READ-ONLY diagnostic: is Navigator's audit trail already in the 081 hash chain?
//
// Confirms (or refutes) the hypothesis that fn_navigator_audit_trigger writes
// into the shared audit_log, which 081's trg_audit_log_mirror already mirrors
// into the hash-chained audit_edit_log. No writes. No RPC role-gated calls.
//
// Run: node scripts/verify-navigator-chain-state.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/\r/g, '').replace(/^["']|["']$/g, '')]
    })
)

const URL = env.VITE_SUPABASE_URL
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SVC) { console.error('missing url/svc'); process.exit(1) }

const svc = createClient(URL, SVC, { auth: { persistSession: false } })

const NAV = ['navigator_referrals', 'navigator_placements', 'navigator_supports', 'manifestation_determinations']

async function countBy(table, col, val) {
  const { count, error } = await svc.from(table)
    .select('*', { count: 'exact', head: true })
    .eq(col, val)
  if (error) return { err: error.message }
  return { count }
}

async function main() {
  // 0. liveness / auth check
  const probe = await svc.from('audit_edit_log').select('seq', { count: 'exact', head: true })
  if (probe.error) {
    console.log('AUTH/PROBE FAILED:', probe.error.message)
    console.log('(legacy key likely revoked per CC29 — need current sb_secret_ service key)')
    process.exit(2)
  }
  console.log('audit_edit_log total rows:', probe.count)

  const alTotal = await svc.from('audit_log').select('id', { count: 'exact', head: true })
  console.log('audit_log total rows:', alTotal.count)

  console.log('\nPer-entity_type presence (audit_log -> audit_edit_log):')
  for (const e of NAV) {
    const al = await countBy('audit_log', 'entity_type', e)
    const ae = await countBy('audit_edit_log', 'entity_type', e)
    console.log(`  ${e.padEnd(30)} audit_log=${JSON.stringify(al)}  audit_edit_log=${JSON.stringify(ae)}`)
  }

  // sample a navigator audit_edit_log row to inspect chain columns + changes shape
  const sample = await svc.from('audit_edit_log')
    .select('seq, entity_type, action, prev_row_hash, row_hash, changes')
    .in('entity_type', NAV)
    .order('seq', { ascending: false })
    .limit(1)
  if (sample.error) { console.log('sample err:', sample.error.message) }
  else if (sample.data?.length) {
    const r = sample.data[0]
    console.log('\nMost-recent navigator audit_edit_log row:')
    console.log('  seq:', r.seq, '| entity_type:', r.entity_type, '| action:', r.action)
    console.log('  prev_row_hash:', r.prev_row_hash ? r.prev_row_hash.slice(0, 20) + '...' : '(null)')
    console.log('  row_hash     :', r.row_hash ? r.row_hash.slice(0, 20) + '...' : '(null)')
    console.log('  changes keys :', r.changes ? Object.keys(r.changes) : '(null)')
    // does the chained snapshot carry the edit-history JSONB?
    const newObj = r.changes?.new || r.changes?.old
    if (newObj) {
      const histKeys = Object.keys(newObj).filter(k => k.endsWith('_history'))
      console.log('  *_history fields captured in chained snapshot:', histKeys.length ? histKeys : '(none on this row)')
    }
  } else {
    console.log('\nNO navigator rows found in audit_edit_log.')
  }
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1) })
