// Seed Explorer ISD — Sandbox District
//
// What this does:
//   1. Creates Explorer ISD district with fixed UUID + sandbox flag
//   2. Creates 4 campuses (HS, MS, EL, DAEP) with fixed UUIDs
//   3. Creates sandbox admin auth user (explore@clearpathedgroup.com)
//   4. Creates profile + campus assignments for all 4 campuses
//
// REST API only — no DB password required.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=xxx node supabase/seed_sandbox.mjs

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

const SANDBOX_DISTRICT_ID = '22222222-2222-2222-2222-222222222222'
const SANDBOX_HS          = 'bbbb0001-0001-0001-0001-000000000001'
const SANDBOX_MS          = 'bbbb0001-0001-0001-0001-000000000002'
const SANDBOX_EL          = 'bbbb0001-0001-0001-0001-000000000003'
const SANDBOX_DAEP        = 'bbbb0001-0001-0001-0001-000000000004'
const SANDBOX_ADMIN_EMAIL = 'explore@clearpathedgroup.com'
const SANDBOX_ADMIN_PASS  = 'Explore2026!'

// ─── Create or retrieve an auth user via Supabase Admin API ──────────────────
async function createAuthUser(email, password, fullName, role, districtId) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role, district_id: districtId },
    }),
  })
  const data = await res.json()
  if (data.id) return data.id

  // Already exists — find by listing users
  if (data.msg?.includes('already') || data.message?.includes('already') || res.status === 422) {
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    })
    const listData = await listRes.json()
    const users = listData.users || listData
    const existing = users.find(u => u.email === email)
    if (existing) {
      console.log(`  User ${email} already exists, using existing.`)
      return existing.id
    }
  }

  throw new Error(`Failed to create/find user ${email}: ${JSON.stringify(data)}`)
}

async function run() {
  // ─── 1. Upsert district ──────────────────────────────────────────────────
  console.log('Upserting Explorer ISD district...')
  const { error: distErr } = await supabase
    .from('districts')
    .upsert({
      id: SANDBOX_DISTRICT_ID,
      name: 'Explorer ISD',
      tea_district_id: '999999',
      settings: {
        is_sandbox: true,
        products: ['waypoint', 'navigator', 'meridian'],
        subscription_tier: 'enterprise',
      },
    }, { onConflict: 'id' })
  if (distErr) throw new Error(`District upsert: ${distErr.message}`)
  console.log('  + Explorer ISD district created/updated.')

  // ─── 2. Upsert campuses ──────────────────────────────────────────────────
  console.log('Upserting campuses...')
  const campuses = [
    { id: SANDBOX_HS,   name: 'Explorer High School',    campus_type: 'high',       tea_campus_id: '9990001' },
    { id: SANDBOX_MS,   name: 'Explorer Middle School',  campus_type: 'middle',     tea_campus_id: '9990002' },
    { id: SANDBOX_EL,   name: 'Explorer Elementary',     campus_type: 'elementary', tea_campus_id: '9990003' },
    { id: SANDBOX_DAEP, name: 'Explorer DAEP',           campus_type: 'daep',       tea_campus_id: '9990004' },
  ]
  for (const campus of campuses) {
    const { error } = await supabase
      .from('campuses')
      .upsert({ ...campus, district_id: SANDBOX_DISTRICT_ID }, { onConflict: 'id' })
    if (error) throw new Error(`Campus upsert ${campus.name}: ${error.message}`)
    console.log(`  + ${campus.name}`)
  }

  // ─── 3. Create sandbox admin auth user ──────────────────────────────────
  console.log('\nCreating sandbox admin user...')
  const authId = await createAuthUser(
    SANDBOX_ADMIN_EMAIL,
    SANDBOX_ADMIN_PASS,
    'Explorer Admin',
    'admin',
    SANDBOX_DISTRICT_ID,
  )
  console.log(`  + Auth user: ${authId}`)

  // ─── 4. Upsert profile ───────────────────────────────────────────────────
  console.log('Upserting profile...')
  const { error: profErr } = await supabase
    .from('profiles')
    .upsert({
      id: authId,
      district_id: SANDBOX_DISTRICT_ID,
      full_name: 'Explorer Admin',
      email: SANDBOX_ADMIN_EMAIL,
      role: 'admin',
      is_active: true,
    }, { onConflict: 'id' })
  if (profErr) throw new Error(`Profile upsert: ${profErr.message}`)
  console.log('  + Profile created/updated.')

  // ─── 5. Campus assignments ───────────────────────────────────────────────
  console.log('Assigning admin to all campuses...')
  for (const campusId of [SANDBOX_HS, SANDBOX_MS, SANDBOX_EL, SANDBOX_DAEP]) {
    const { error } = await supabase
      .from('profile_campus_assignments')
      .upsert({ profile_id: authId, campus_id: campusId }, { onConflict: 'profile_id,campus_id' })
      .select()
    // Ignore upsert error if already exists
    if (error && !error.message.includes('duplicate')) {
      console.warn(`  Warning campus assignment ${campusId}: ${error.message}`)
    }
  }
  console.log('  + All campus assignments done.')

  console.log('\n✅ Explorer ISD sandbox seeded successfully!')
  console.log(`   URL:      https://waypoint.clearpathedgroup.com`)
  console.log(`   Email:    ${SANDBOX_ADMIN_EMAIL}`)
  console.log(`   Password: ${SANDBOX_ADMIN_PASS}`)
  console.log('\nRun reset_sandbox.mjs to seed transactional data.')
}

run().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
