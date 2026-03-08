// Cloudflare Pages Function: /api/welcome
// Fires a welcome email via the Waypoint send-notification Edge Function.
//
// POST { email, source }
// source: 'demo_request' | 'pilot_application' | 'chat_widget'
//
// Always returns HTTP 200 — email failures must not break form UX.
// Set in CF Pages dashboard:
//   SUPABASE_URL            = https://kvxecksvkimcgwhxxyhw.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = <service role key>

const SOURCE_TO_TEMPLATE = {
  demo_request:       'welcome_demo_request',
  pilot_application:  'welcome_pilot_application',
  chat_widget:        'welcome_demo_request',
}

const SOURCE_TO_SUBJECT = {
  demo_request:      "You're on our list — here's what's next",
  pilot_application: "We received your Waypoint Founding District application",
  chat_widget:       "You're on our list — here's what's next",
}

export async function onRequestPost({ request, env }) {
  let email, source
  try {
    const body = await request.json()
    email  = (body.email  || '').trim()
    source = (body.source || '').trim()
  } catch (_) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  if (!email || !SOURCE_TO_TEMPLATE[source]) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const template = SOURCE_TO_TEMPLATE[source]
  const subject  = SOURCE_TO_SUBJECT[source]

  try {
    const supabaseUrl    = env.SUPABASE_URL    || 'https://kvxecksvkimcgwhxxyhw.supabase.co'
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('[welcome] SUPABASE_SERVICE_ROLE_KEY not set')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({ to: email, subject, template, data: { email } }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[welcome] send-notification failed (${res.status}): ${text}`)
    }
  } catch (err) {
    console.error('[welcome] Unexpected error:', err)
  }

  // Always 200 — never break the form
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
