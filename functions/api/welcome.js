// Cloudflare Pages Function: /api/welcome
// Fires a welcome email via the Waypoint send-notification Edge Function.
// Also forwards lead data to Formspree so leads appear in your Formspree dashboard.
//
// POST { email, name?, source }
// source: 'demo_request' | 'pilot_application' | 'chat_widget' | 'sandbox_explore'
//
// Always returns HTTP 200 — email failures must not break form UX.
// Set in CF Pages dashboard:
//   SUPABASE_URL            = https://kvxecksvkimcgwhxxyhw.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = <service role key>

const SOURCE_TO_TEMPLATE = {
  demo_request:       'welcome_demo_request',
  pilot_application:  'welcome_pilot_application',
  chat_widget:        'welcome_demo_request',
  sandbox_explore:    'welcome_demo_request',
}

const SOURCE_TO_SUBJECT = {
  demo_request:      "You're on our list — here's what's next",
  pilot_application: "We received your Waypoint Founding District application",
  chat_widget:       "You're on our list — here's what's next",
  sandbox_explore:   "Your Waypoint sandbox credentials",
}

// Formspree form ID — same as the demo form on the site
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xpqjngpp'

export async function onRequestPost({ request, env }) {
  let email, name, source
  try {
    const body = await request.json()
    email  = (body.email  || '').trim()
    name   = (body.name   || '').trim()
    source = (body.source || '').trim()
  } catch (_) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  if (!email || !SOURCE_TO_TEMPLATE[source]) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const template = SOURCE_TO_TEMPLATE[source]
  const subject  = SOURCE_TO_SUBJECT[source]

  // Fire both in parallel — welcome email to prospect + lead capture to Formspree
  const tasks = []

  // 1. Welcome email to the prospect
  const supabaseUrl    = env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co'
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (serviceRoleKey) {
    tasks.push(
      fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({ to: email, subject, template, data: { email, name } }),
      }).catch(err => console.error('[welcome] send-notification error:', err))
    )
  } else {
    console.error('[welcome] SUPABASE_SERVICE_ROLE_KEY not set — skipping welcome email')
  }

  // 2. Lead capture to Formspree (shows up in your Formspree dashboard)
  tasks.push(
    fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        source,
        _subject: `New lead — ${source.replace(/_/g, ' ')} — ${name || email}`,
      }),
    }).catch(err => console.error('[welcome] Formspree lead capture error:', err))
  )

  await Promise.allSettled(tasks)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
