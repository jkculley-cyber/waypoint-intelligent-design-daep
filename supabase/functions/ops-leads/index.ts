// Supabase Edge Function: ops-leads
// Read/update/delete demo_leads on the OPS project (xbpuqaqpcbixxodblaes) for the
// Waypoint Admin console. demo_leads is RLS-locked to anon-INSERT-only (the public
// marketing pages log leads with the anon key but can no longer read them), so the
// admin console must reach the rows through the ops SERVICE ROLE — server-side only,
// never in the client bundle. Caller must be an authenticated waypoint_admin.
//
// Required secrets on the MAIN project (kvxecksvkimcgwhxxyhw):
//   SUPABASE_URL, SUPABASE_ANON_KEY  — already set (used to verify the caller)
//   OPS_SUPABASE_URL                 — https://xbpuqaqpcbixxodblaes.supabase.co
//   OPS_SUPABASE_SERVICE_ROLE_KEY    — ops project service_role key
//
// Body: { action: 'list' } | { action: 'update', id, status } | { action: 'delete', id }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const OPS_URL = Deno.env.get('OPS_SUPABASE_URL')!
const OPS_SERVICE_ROLE_KEY = Deno.env.get('OPS_SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify the caller is an authenticated waypoint_admin.
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await callerClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: profile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'waypoint_admin') {
      return json({ error: 'Only Waypoint admins can access demo leads' }, 403)
    }

    // 2. Perform the requested action against ops demo_leads with the service role.
    const { action, id, status } = await req.json().catch(() => ({}))
    const ops = createClient(OPS_URL, OPS_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    if (action === 'list') {
      const { data, error } = await ops
        .from('demo_leads')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) return json({ error: error.message }, 500)
      return json({ leads: data || [] })
    }

    if (action === 'update') {
      if (!id || !status) return json({ error: 'id and status are required' }, 400)
      const { error } = await ops.from('demo_leads').update({ status }).eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'id is required' }, 400)
      const { error } = await ops.from('demo_leads').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    console.error('ops-leads error:', err)
    return json({ error: (err as Error).message || 'Failed' }, 500)
  }
})
