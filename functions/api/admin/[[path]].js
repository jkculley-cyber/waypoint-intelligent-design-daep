// Cloudflare Pages Function: /api/admin/*  — auth-gated server-side proxy for Waypoint
// operations that require the Waypoint *service_role* / sb_secret_ key.
//
// WHY THIS EXISTS:
// WaypointAdminPage.jsx used to call the Supabase Admin API and the reset-sandbox Edge
// Function directly from the browser using VITE_SUPABASE_SERVICE_ROLE_KEY — which Vite
// inlines into the client bundle, leaking service_role to every visitor. This proxy holds
// the Waypoint secret server-side and only forwards after confirming the caller is a
// Waypoint admin (via the same is_waypoint_admin() RPC used by /api/apex/*).
//
// REQUIRED Pages env vars (Cloudflare Pages → Settings → Functions, NOT VITE_*):
//   WAYPOINT_URL                = https://kvxecksvkimcgwhxxyhw.supabase.co   (default below)
//   WAYPOINT_ANON_KEY           = <new Waypoint anon / publishable key>  (anon is safe server-side)
//   SUPABASE_SERVICE_ROLE_KEY   = <new ROTATED Waypoint service_role / sb_secret_ key>  (server-only)
//
// CLIENT USAGE (replaces direct service_role fetches in WaypointAdminPage.jsx):
//   const token = (await supabase.auth.getSession()).data.session.access_token
//   // reset the Explorer sandbox:
//   fetch('/api/admin/reset-sandbox', { method: 'POST',
//     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//     body: JSON.stringify({ confirm: true }) })
//   // create an auth user when provisioning a district:
//   fetch('/api/admin/users', { method: 'POST',
//     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, password, email_confirm: true }) })

const DEFAULT_WAYPOINT_URL = 'https://kvxecksvkimcgwhxxyhw.supabase.co'

// resource → { methods, target(url) }. Anything else → 403.
const ROUTES = {
  'reset-sandbox': { methods: ['POST'], target: (u) => `${u}/functions/v1/reset-sandbox` },
  users:           { methods: ['POST'], target: (u) => `${u}/auth/v1/admin/users` },
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })

export async function onRequest(context) {
  const { request, env, params } = context
  const method = request.method.toUpperCase()

  // 1. Resolve and validate the requested resource (first path segment).
  const segs = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean)
  const resource = segs[0] || ''
  const route = ROUTES[resource]
  if (!route) return json({ error: 'resource not allowed' }, 403)
  if (!route.methods.includes(method)) return json({ error: 'method not allowed' }, 405)

  // 2. Require a bearer token (the caller's Waypoint session access token).
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return json({ error: 'missing bearer token' }, 401)

  const waypointUrl = env.WAYPOINT_URL || DEFAULT_WAYPOINT_URL
  const anonKey     = env.WAYPOINT_ANON_KEY
  const secret      = env.SUPABASE_SERVICE_ROLE_KEY
  if (!anonKey || !secret) return json({ error: 'proxy not configured' }, 500)

  // 3. Confirm the caller is a Waypoint admin via SECURITY DEFINER RPC (migration 083).
  let isAdmin = false
  try {
    const r = await fetch(`${waypointUrl}/rest/v1/rpc/is_waypoint_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: '{}',
    })
    isAdmin = r.ok && (await r.json()) === true
  } catch (_) {
    return json({ error: 'auth check failed' }, 502)
  }
  if (!isAdmin) return json({ error: 'forbidden' }, 403)

  // 4. Proxy to Waypoint with the server-only secret.
  const upstream = await fetch(route.target(waypointUrl), {
    method,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: await request.text(),
  })
  const bodyText = await upstream.text()
  return new Response(bodyText, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  })
}
