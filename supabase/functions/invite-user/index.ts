// Supabase Edge Function: invite-user
// Creates a single user account and profile. Called from UserManagementPage.
// Uses service role key server-side — never exposed to the client.

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

    // Use caller's token to verify identity and role
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
      return new Response(JSON.stringify({ error: 'Only administrators can invite users' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, fullName, role, districtId, campusIds } = await req.json()

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Email and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // District scoping: regular admin can only invite to their own district
    const targetDistrictId = callerProfile.role === 'waypoint_admin'
      ? districtId
      : callerProfile.district_id

    if (!targetDistrictId) {
      return new Response(JSON.stringify({ error: 'District ID is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role client for admin operations
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Create auth user with invite email
    const { data: newUser, error: createError } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: { full_name: fullName || '', role },
        redirectTo: `https://waypoint.clearpathedgroup.com/reset-password`,
      }
    )

    if (createError) {
      // Check if user already exists
      if (createError.message?.includes('already') || createError.message?.includes('registered')) {
        return new Response(JSON.stringify({ error: 'A user with this email already exists' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw createError
    }

    // Create profile record linked to the new auth user
    if (newUser?.user?.id) {
      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName || '',
          role,
          district_id: targetDistrictId,
          is_active: true,
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('Profile creation failed:', profileError)
        // Auth user was created but profile failed — log but don't fail the request
      }

      // Assign to campuses if provided
      if (campusIds?.length && newUser.user.id) {
        const assignments = campusIds.map((cid: string) => ({
          profile_id: newUser.user.id,
          campus_id: cid,
        }))
        await adminClient
          .from('profile_campus_assignments')
          .upsert(assignments, { onConflict: 'profile_id,campus_id' })
          .then(() => {})
          .catch((err: Error) => console.error('Campus assignment failed:', err))
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invite sent to ${email}`,
        userId: newUser?.user?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('invite-user error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message || 'Failed to invite user' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
