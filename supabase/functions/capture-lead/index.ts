// Supabase Edge Function: capture-lead
// Accepts anon-key requests from clearpathedgroup.com.
// 1. Inserts lead into the leads table (via service role)
// 2. Fires a welcome email via send-notification
// Always returns 200 — never breaks form UX.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SOURCE_TO_SUBJECT: Record<string, string> = {
  sandbox_explore:   'Your Waypoint sandbox credentials',
  demo_request:      "You're on our list — here's what's next",
  pilot_application: 'We received your Waypoint Founding District application',
  chat_widget:       "You're on our list — here's what's next",
}

const SOURCE_TO_TEMPLATE: Record<string, string> = {
  sandbox_explore:   'welcome_sandbox_explore',
  demo_request:      'welcome_demo_request',
  pilot_application: 'welcome_pilot_application',
  chat_widget:       'welcome_demo_request',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { name, email, source, district, concern } = await req.json()

    if (!email || !source) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Store lead
    const { error: leadErr } = await supabase.from('leads').insert({
      name: name || null,
      email,
      source,
      district: district || null,
      concern: concern || null,
      status: 'new',
    })
    if (leadErr) console.error('[capture-lead] lead insert error:', leadErr.message)

    // 2. Send welcome email
    const subject  = SOURCE_TO_SUBJECT[source]
    const template = SOURCE_TO_TEMPLATE[source]

    if (subject && template) {
      const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ to: email, subject, template, data: { email, name } }),
      })
      if (!emailRes.ok) {
        const txt = await emailRes.text()
        console.error('[capture-lead] send-notification error:', txt)
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[capture-lead] unexpected error:', err)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
