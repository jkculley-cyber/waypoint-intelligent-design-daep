// Seed reason_history on 2-3 active Lone Star ISD placements so the CC15
// walkthrough has rows that trigger the B1 amber "edited Nx" chip.
//
// Direct UPDATE of reason_history alone bypasses the trigger's append logic
// (the audit trigger only appends when OLD.reason IS DISTINCT FROM NEW.reason).
// We're synthesizing a history that mimics what real edits would produce.
//
// Cleanup: pass `--clean` to revert reason_history to [] on the seeded rows.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
// Use anon key + signin as admin so the audit trigger gets a real auth.uid()
// for the audit_log FK. (Service-role would bypass RLS but the trigger writes
// auth.uid() = NULL, which fails the FK because the sentinel UUID isn't seeded.)
const sb = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { error: signinErr } = await sb.auth.signInWithPassword({
  email: 'admin@lonestar-isd.org', password: 'Password123!',
})
if (signinErr) { console.error(`signin failed: ${signinErr.message}`); process.exit(1) }

const LONE_STAR = '11111111-1111-1111-1111-111111111111'
const CLEAN = process.argv.includes('--clean')

// Resolve admin profile.id for the changed_by actor — real UUID so the PDF +
// modal resolve to a name instead of a UUID prefix.
const { data: admin } = await sb
  .from('profiles').select('id, full_name').eq('role', 'admin').eq('district_id', LONE_STAR).limit(1).maybeSingle()
if (!admin) { console.error('No admin profile in Lone Star ISD'); process.exit(1) }
console.log(`actor: ${admin.full_name} (${admin.id})`)

const today = new Date().toISOString().split('T')[0]
const { data: actives, error } = await sb
  .from('navigator_placements')
  .select('id, students(first_name, last_name), placement_type, start_date, reason, reason_history')
  .eq('district_id', LONE_STAR)
  .is('end_date', null)
  .lte('start_date', today)
  .order('start_date', { ascending: false })
if (error) { console.error('list active failed:', error.message); process.exit(1) }

const targets = (actives || []).slice(0, 3)
console.log(`${CLEAN ? 'CLEANING' : 'SEEDING'} ${targets.length} active placement(s):`)

for (let i = 0; i < targets.length; i++) {
  const p = targets[i]
  const name = p.students ? `${p.students.first_name} ${p.students.last_name}` : '(no name)'

  if (CLEAN) {
    const { error: e } = await sb.from('navigator_placements')
      .update({ reason_history: [] })
      .eq('id', p.id)
    if (e) console.error(`  ✗ ${name} ${p.id}: ${e.message}`)
    else   console.log(`  ✓ cleared history on ${name} (${p.placement_type.toUpperCase()} ${p.start_date})`)
    continue
  }

  // Build a realistic history. Each row: {reason, changed_at, changed_by}.
  // Vary edit count so user sees "edited 1×" / "edited 2×" / "edited 3×".
  const editCount = i + 1  // first row gets 1 prior, second gets 2, third gets 3
  const history = []
  const baseDate = new Date(p.start_date + 'T08:00:00Z').getTime()
  const samples = [
    'Disruption — first version',
    'Disruption + insubordination — added detail after AP review',
    'Disruption + insubordination + classroom safety — third edit per counselor input',
  ]
  for (let h = 0; h < editCount; h++) {
    history.push({
      reason: samples[h],
      changed_at: new Date(baseDate + (h + 1) * 3600 * 1000 * 6).toISOString(),  // staggered hours after placement
      changed_by: admin.id,
    })
  }

  const { error: e } = await sb.from('navigator_placements')
    .update({ reason_history: history })
    .eq('id', p.id)
  if (e) console.error(`  ✗ ${name} ${p.id}: ${e.message}`)
  else   console.log(`  ✓ seeded ${editCount} edit(s) on ${name} (${p.placement_type.toUpperCase()} ${p.start_date})`)
}

// ─── B4 lag chip — red 4+d after scenario ───────────────────────────────────
// Insert a new active OSS placement with start_date 5 days ago + parent_notified=true.
// Trigger sets parent_notified_at = now() (today), so lag = 5d → red label.
console.log('\n=== B4 red-lag scenario (new active placement, start 5d back) ===')
const lagPlacementMarker = 'cc15-walkthrough-red-lag'
if (CLEAN) {
  const { error: e, count } = await sb.from('navigator_placements')
    .delete({ count: 'exact' }).eq('district_id', LONE_STAR).eq('parent_contact_notes', lagPlacementMarker)
  if (e) console.error(`  ✗ cleanup: ${e.message}`)
  else   console.log(`  ✓ removed ${count ?? '?'} red-lag demo placement(s)`)
} else {
  // Idempotency guard — skip if a prior run already seeded one.
  const { data: already } = await sb.from('navigator_placements')
    .select('id').eq('district_id', LONE_STAR).eq('parent_contact_notes', lagPlacementMarker).limit(1).maybeSingle()
  if (already) {
    console.log('  · already seeded (skipping); use --clean to remove')
  } else {
  // Pick a non-SPED student with the fewest existing active placements (least likely to trip 10-day rule).
  const { data: candidates } = await sb.from('students')
    .select('id, first_name, last_name, campus_id, is_sped')
    .eq('district_id', LONE_STAR).eq('is_active', true).eq('is_sped', false).limit(20)
  const target = candidates?.[0]
  if (!target) {
    console.error('  ✗ no non-SPED student available')
  } else {
    const startBack5 = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    const { data: row, error: e } = await sb.from('navigator_placements').insert({
      district_id: LONE_STAR,
      campus_id: target.campus_id,
      student_id: target.id,
      assigned_by: admin.id,
      placement_type: 'oss',
      start_date: startBack5,
      days: 1,
      reason: 'Demo placement for CC15 walkthrough — exercises the 5-day-after parent-notify lag chip (red).',
      parent_notified: true,
      parent_notified_method: 'phone_call',
      parent_contact_notes: lagPlacementMarker,  // marker so cleanup is precise
    }).select('id').single()
    if (e) console.error(`  ✗ insert failed: ${e.message}`)
    else   console.log(`  ✓ ${target.first_name} ${target.last_name}: OSS start=${startBack5}, parent_notified=now() → lag 5d (red)`)
  }
  }
}

// ─── T2.7 prior-failure scenario — discontinued CICO on Ethan Davis ─────────
// Ethan is one of the seeded edit-history students above and shows in Active ISS.
// A discontinued same-type support in the last 90 days makes him appear in the
// Escalation Engine bulk-create modal's PRIOR FAILURE state when CICO is selected.
console.log('\n=== T2.7 prior-failure scenario (discontinued CICO) ===')
const supportMarker = 'cc15-walkthrough-prior-failure'
if (CLEAN) {
  const { error: e, count } = await sb.from('navigator_supports')
    .delete({ count: 'exact' }).eq('district_id', LONE_STAR).eq('notes', supportMarker)
  if (e) console.error(`  ✗ cleanup: ${e.message}`)
  else   console.log(`  ✓ removed ${count ?? '?'} prior-failure demo support(s)`)
} else {
  const { data: alreadySupport } = await sb.from('navigator_supports')
    .select('id').eq('district_id', LONE_STAR).eq('notes', supportMarker).limit(1).maybeSingle()
  if (alreadySupport) {
    console.log('  · already seeded (skipping); use --clean to remove')
  } else {
  const { data: ethan } = await sb.from('students')
    .select('id, first_name, last_name, campus_id')
    .eq('district_id', LONE_STAR).ilike('first_name', 'Ethan').ilike('last_name', 'Davis').limit(1).maybeSingle()
  if (!ethan) {
    console.error('  ✗ Ethan Davis not found')
  } else {
    const startBack60 = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]
    const endBack14  = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
    const { data: row, error: e } = await sb.from('navigator_supports').insert({
      district_id: LONE_STAR,
      campus_id: ethan.campus_id,
      student_id: ethan.id,
      assigned_by: admin.id,
      assigned_to: admin.id,
      support_type: 'cico',
      start_date: startBack60,
      end_date: endBack14,
      status: 'discontinued',
      notes: supportMarker,
    }).select('id').single()
    if (e) console.error(`  ✗ insert failed: ${e.message}`)
    else   console.log(`  ✓ ${ethan.first_name} ${ethan.last_name}: discontinued CICO (started ${startBack60}, ended ${endBack14})`)
  }
  }
}

console.log(`\nDone. ${CLEAN ? 'Walkthrough cleanup complete.' : 'B1 amber chip + B4 red lag chip + T2.7 prior-failure path all primed. Hard-refresh after Cloudflare deploy.'}`)
