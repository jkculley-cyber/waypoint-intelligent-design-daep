// One-shot: repair Explorer ISD admin profile.
//
// Past run of seed_navigator_campus_demo.mjs collided with Explorer ISD's UUID
// (both 22222222-...) and left two orphan profiles (ap@lincoln-hs.demo +
// counselor@lincoln-hs.demo) while wiping the original explore@ admin profile.
// The auth user for explore@clearpathedgroup.com still exists.
//
// This script:
//   1. signs in as explore@clearpathedgroup.com to recover the auth UUID
//   2. deletes the stale ap/counselor profiles from Explorer ISD
//   3. creates the explore admin profile linked to that UUID
//   4. assigns the admin to all 4 Explorer campuses
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=xxx node supabase/fix_explorer_admin.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DISTRICT_ID = '22222222-2222-2222-2222-222222222222'
const HS   = 'bbbb0001-0001-0001-0001-000000000001'
const MS   = 'bbbb0001-0001-0001-0001-000000000002'
const EL   = 'bbbb0001-0001-0001-0001-000000000003'
const DAEP = 'bbbb0001-0001-0001-0001-000000000004'
const ADMIN_EMAIL = 'explore@clearpathedgroup.com'
const ADMIN_PASS  = 'Explore2026!'

// We need an anon client to use signInWithPassword (service-role client can't)
const VITE_ANON = process.env.VITE_SUPABASE_ANON_KEY
if (!VITE_ANON) {
  console.error('Missing VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}
const anonClient = createClient(SUPABASE_URL, VITE_ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('1. Signing in as', ADMIN_EMAIL, 'to recover UUID...')
  const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  })
  if (signInErr) throw new Error(`Sign-in failed: ${signInErr.message}`)
  const adminId = signInData.user.id
  console.log(`   UUID: ${adminId}\n`)

  console.log('2. Listing stale Explorer ISD profiles...')
  const { data: stale } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('district_id', DISTRICT_ID)
  console.log(`   Found ${stale.length} existing rows:`)
  stale.forEach(p => console.log(`     - ${p.email} (${p.role}) ${p.id}`))

  // Delete profile_campus_assignments first (FK), then profiles
  const staleIds = stale.filter(p => p.id !== adminId).map(p => p.id)
  if (staleIds.length) {
    console.log(`\n3. Removing ${staleIds.length} stale profile(s)...`)
    const { error: caErr } = await supabase
      .from('profile_campus_assignments')
      .delete()
      .in('profile_id', staleIds)
    if (caErr) console.warn(`   campus assignments: ${caErr.message}`)

    const { error: pErr } = await supabase
      .from('profiles')
      .delete()
      .in('id', staleIds)
    if (pErr) throw new Error(`profile delete: ${pErr.message}`)
    console.log('   ✓ Cleaned')
  }

  console.log('\n4. Upserting explore@ admin profile...')
  const { error: upErr } = await supabase
    .from('profiles')
    .upsert({
      id: adminId,
      district_id: DISTRICT_ID,
      full_name: 'Explorer Admin',
      email: ADMIN_EMAIL,
      role: 'admin',
      is_active: true,
    }, { onConflict: 'id' })
  if (upErr) throw new Error(`profile upsert: ${upErr.message}`)
  console.log('   ✓ Admin profile linked to Explorer ISD\n')

  console.log('5. Assigning admin to all 4 campuses...')
  for (const campusId of [HS, MS, EL, DAEP]) {
    const { error } = await supabase
      .from('profile_campus_assignments')
      .upsert({ profile_id: adminId, campus_id: campusId }, { onConflict: 'profile_id,campus_id' })
    if (error && !error.message.includes('duplicate')) {
      console.warn(`   warn ${campusId}: ${error.message}`)
    }
  }
  console.log('   ✓ All 4 campuses assigned\n')

  console.log('✅ Explorer ISD admin repaired.')
  console.log(`   ${ADMIN_EMAIL} / ${ADMIN_PASS} → /dashboard (Waypoint + Meridian)`)
}

run().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
