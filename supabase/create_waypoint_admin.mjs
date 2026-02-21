// Create a Waypoint internal admin user (district_id = NULL, role = 'waypoint_admin')
// Run AFTER migration 026 has been applied.
//
// Required env vars:
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key
//   SUPABASE_URL               — Supabase project URL (optional, defaults below)
//
// Usage (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
//   node supabase/create_waypoint_admin.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.')
  console.error('Set it via: $env:SUPABASE_SERVICE_ROLE_KEY="your-key"')
  process.exit(1)
}

// Read credentials from CLI args or env
const email    = process.argv[2] || process.env.WAYPOINT_ADMIN_EMAIL    || 'admin@waypoint.internal'
const password = process.argv[3] || process.env.WAYPOINT_ADMIN_PASSWORD || 'Waypoint2025!'
const fullName = process.argv[4] || process.env.WAYPOINT_ADMIN_NAME     || 'Waypoint Admin'

console.log(`Creating Waypoint admin user: ${email}`)

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  // 1. Create auth user
  const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    console.error('Failed to create auth user:', authError.message)
    process.exit(1)
  }

  const userId = userData.user.id
  console.log(`✓ Auth user created: ${userId}`)

  // 2. Insert profile with district_id = NULL and role = waypoint_admin
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id:          userId,
      district_id: null,
      email,
      full_name:   fullName,
      role:        'waypoint_admin',
      is_active:   true,
    })

  if (profileError) {
    console.error('Failed to create profile:', profileError.message)
    console.error('The auth user was created (ID:', userId, '). Clean it up manually if needed.')
    process.exit(1)
  }

  console.log(`✓ Profile created with role = waypoint_admin`)
  console.log()
  console.log('Login credentials:')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log()
  console.log('Navigate to /waypoint-admin after logging in.')
}

run().catch(err => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})
