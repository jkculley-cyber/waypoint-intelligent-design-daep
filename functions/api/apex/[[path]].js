// Cloudflare Pages Function: /api/apex/*  — auth-gated server-side proxy to the Apex project.
//
// WHY THIS EXISTS:
// The Waypoint admin "Apex Panel" used to call the Apex Supabase REST API directly from the
// browser using the Apex *service_role* key (hardcoded in WaypointAdminPage.jsx). That shipped
// the service_role key to every visitor's browser bundle. This proxy holds the Apex secret
// server-side and only forwards requests after confirming the caller is a Waypoint admin.
//
// REQUIRED Pages env vars (set in Cloudflare Pages → Settings → Functions, NOT VITE_*):
//   WAYPOINT_URL        = https://kvxecksvkimcgwhxxyhw.supabase.co   (default below)
//   WAYPOINT_ANON_KEY   = <new Waypoint anon / publishable key>      (anon is safe server-side)
//   APEX_URL            = https://jvjsotlyvrzhsbgcsdfw.supabase.co   (default below)
//   APEX_SECRET         = <new ROTATED Apex service_role / sb_secret_ key>  (server-only)
//
// CLIENT USAGE (replaces apexFetch / direct PATCH in WaypointAdminPage.jsx):
//   const token = (await supabase.auth.getSession()).data.session.access_token
//   // read:
//   fetch('/api/apex/principals?select=id,name,email&order=created_at.desc&limit=50',
//         { headers: { Authorization: `Bearer ${token}` } })
//   // write:
//   fetch(`/api/apex/principals?id=eq.${id}`, {
//     method: 'PATCH',
//     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
//                Prefer: 'return=representation' },
//     body: JSON.stringify({ subscription_status: 'active' }),
//   })

const DEFAULT_WAYPOINT_URL = 'https://kvxecksvkimcgwhxxyhw.supabase.co'
const DEFAULT_APEX_URL     = 'https://jvjsotlyvrzhsbgcsdfw.supabase.co'

// Only these REST resources + methods may be proxied. Anything else → 403.
const ALLOW = {
  principals:      ['GET', 'PATCH'],
  access_requests: ['GET', 'PATCH'],
}

// Edge Functions (functions/v1/*) that may be invoked through this proxy.
const ALLOW_FN = {
  'send-welcome-email': ['POST'],
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })

export async function onRequest(context) {
  const { request, env, params } = context
  const method = request.method.toUpperCase()

  // 1. Resolve and validate the requested resource (first path segment, e.g. "principals")
  const segs = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean)
  const resource = segs[0] || ''
  const isFn = Object.prototype.hasOwnProperty.call(ALLOW_FN, resource)
  const allowedMethods = isFn ? ALLOW_FN[resource] : ALLOW[resource]
  if (!allowedMethods) return json({ error: 'resource not allowed' }, 403)
  if (!allowedMethods.includes(method)) return json({ error: 'method not allowed' }, 405)

  // 2. Require a bearer token (the caller's Waypoint session access token)
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return json({ error: 'missing bearer token' }, 401)

  const waypointUrl = env.WAYPOINT_URL || DEFAULT_WAYPOINT_URL
  const anonKey     = env.WAYPOINT_ANON_KEY
  const apexUrl     = env.APEX_URL || DEFAULT_APEX_URL
  const apexSecret  = env.APEX_SECRET
  if (!anonKey || !apexSecret) return json({ error: 'proxy not configured' }, 500)

  // 3. Confirm the caller is a Waypoint admin via SECURITY DEFINER RPC (migration 083).
  //    The RPC reads auth.uid() from the forwarded token and returns true only for waypoint_admin.
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

  // 4. Proxy to Apex with the server-only secret. Preserve the query string verbatim.
  const search = new URL(request.url).search // e.g. ?id=eq.123&select=...
  const target = isFn
    ? `${apexUrl}/functions/v1/${resource}`
    : `${apexUrl}/rest/v1/${resource}${search}`
  const init = {
    method,
    headers: {
      apikey: apexSecret,
      Authorization: `Bearer ${apexSecret}`,
      'Content-Type': 'application/json',
      Prefer: request.headers.get('Prefer') || '',
    },
  }
  if (method === 'PATCH' || method === 'POST') init.body = await request.text()

  const upstream = await fetch(target, init)
  const bodyText = await upstream.text()
  return new Response(bodyText, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  })
}
