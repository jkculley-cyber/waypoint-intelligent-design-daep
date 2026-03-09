// Supabase Edge Function: invite-staff
// Sends Supabase auth invite emails to staff profiles that have no auth account.
// Called after a staff CSV import completes.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use caller's token to verify their identity and role
    const callerClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await callerClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is admin or waypoint_admin
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role, district_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['admin', 'waypoint_admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { district_id } = await req.json()

    // Waypoint admin can target any district; regular admin can only target their own
    const targetDistrictId = callerProfile.role === 'waypoint_admin'
      ? district_id
      : callerProfile.district_id

    if (!targetDistrictId) {
      return new Response(JSON.stringify({ error: 'district_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role client to query profiles and create invites
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Fetch staff profiles (exclude parent/student/waypoint_admin roles)
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('district_id', targetDistrictId)
      .not('role', 'in', '("parent","student","waypoint_admin")')
      .not('email', 'is', null)

    if (profilesError) throw profilesError

    // Fetch existing auth users for this district to avoid re-inviting
    // We check by listing auth users and comparing emails
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const existingAuthEmails = new Set(
      (authUsers?.users || []).map(u => u.email?.toLowerCase())
    )

    const toInvite = (profiles || []).filter(
      p => p.email && !existingAuthEmails.has(p.email.toLowerCase())
    )

    let invited = 0
    const errors: { email: string; error: string }[] = []

    for (const profile of toInvite) {
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        profile.email,
        {
          data: { full_name: profile.full_name, role: profile.role },
          redirectTo: `${SUPABASE_URL.replace('supabase.co', 'clearpathedgroup.com').replace(/https:\/\/[^.]+\./, 'https://waypoint.')}/reset-password`,
        }
      )

      if (inviteError) {
        // "User already registered" is not a real error — skip
        if (inviteError.message?.includes('already') || inviteError.message?.includes('registered')) {
          // Already has an account; link their profile
          const { data: existingUser } = await adminClient.auth.admin.getUserById(profile.id).catch(() => ({ data: null }))
          if (!existingUser) {
            // Try to find by email
            const matched = authUsers?.users?.find(u => u.email?.toLowerCase() === profile.email.toLowerCase())
            if (matched && matched.id !== profile.id) {
              // Update profile to use the correct auth ID — skip for now, log it
              errors.push({ email: profile.email, error: 'Account exists but profile ID mismatch — update manually' })
            }
          }
        } else {
          errors.push({ email: profile.email, error: inviteError.message })
        }
      } else {
        invited++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_staff: profiles?.length || 0,
        already_active: (profiles?.length || 0) - toInvite.length,
        invited,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
