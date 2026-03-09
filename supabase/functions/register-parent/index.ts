// Supabase Edge Function: register-parent
// Allows parents to self-register by verifying against a student record.
// Public endpoint — no auth required.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { district_id, student_id_number, last_name, email, full_name } = await req.json()

    if (!district_id || !student_id_number || !last_name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Verify student exists in this district with matching last name
    const { data: student, error: studentError } = await adminClient
      .from('students')
      .select('id, first_name, last_name')
      .eq('district_id', district_id)
      .ilike('student_id_number', student_id_number.trim())
      .ilike('last_name', last_name.trim())
      .maybeSingle()

    if (studentError) throw studentError

    if (!student) {
      return new Response(
        JSON.stringify({ error: 'No student found matching that ID and last name. Please double-check and try again.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if a parent account with this email already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    let parentProfileId: string

    if (existingProfile) {
      // Account exists — check if already linked to this student
      const { data: existingLink } = await adminClient
        .from('student_guardians')
        .select('id')
        .eq('guardian_id', existingProfile.id)
        .eq('student_id', student.id)
        .maybeSingle()

      if (existingLink) {
        return new Response(
          JSON.stringify({ error: 'An account for this email is already linked to this student. Please log in.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      parentProfileId = existingProfile.id
    } else {
      // Create new auth user via invite (sends set-password email)
      const { data: invite, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email.toLowerCase().trim(),
        {
          data: { full_name: full_name || email, role: 'parent' },
          redirectTo: `${SUPABASE_URL.replace('kvxecksvkimcgwhxxyhw.supabase.co', 'waypoint.clearpathedgroup.com')}/reset-password`,
        }
      )

      if (inviteError) throw inviteError

      // Create profile record
      const { data: newProfile, error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: invite.user.id,
          email: email.toLowerCase().trim(),
          full_name: full_name || email,
          role: 'parent',
          district_id,
        })
        .select('id')
        .single()

      if (profileError) {
        // Clean up auth user if profile insert failed
        await adminClient.auth.admin.deleteUser(invite.user.id).catch(() => {})
        throw profileError
      }

      parentProfileId = newProfile.id
    }

    // Link parent to student as guardian
    const { error: guardianError } = await adminClient
      .from('student_guardians')
      .insert({
        student_id: student.id,
        guardian_id: parentProfileId,
        relationship: 'parent',
        district_id,
      })

    if (guardianError && !guardianError.message?.includes('duplicate')) {
      throw guardianError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: existingProfile
          ? 'Your account has been linked. You can now log in to view your child\'s records.'
          : 'Account created! Check your email for a link to set your password.',
        student_name: `${student.first_name} ${student.last_name}`,
        existing_account: !!existingProfile,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('register-parent error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
