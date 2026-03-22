// Waypoint Service Worker
// Strategy: network-first everywhere, cache only as offline fallback
// Vite hashes JS/CSS bundles per deploy, so network-first always gets the latest

const CACHE_NAME = 'waypoint-cache-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin (Supabase, Resend, etc.)
  if (request.method !== 'GET') return
  if (url.hostname !== self.location.hostname) return

  // Navigation — network-first, cache fallback for offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone))
          return response
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // JS/CSS — network-first, cache fallback
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Images/fonts — stale-while-revalidate
  if (url.pathname.match(/\.(png|svg|ico|jpg|jpeg|webp|woff2?)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        }).catch(() => null)
        return cached || networkFetch
      })
    )
    return
  }
})
