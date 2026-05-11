const CACHE_NAME = 'roadsos-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
]

const EMERGENCY_CONTACTS = {
  india: {
    ambulance: '108',
    police: '100',
    fire: '101',
    emergency: '112'
  },
  general: {
    ambulance: '911',
    police: '911',
  }
}

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('RoadSOS: Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  )
  self.clients.claim()
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // If request is to our API and we're offline, return cached emergency data
  if (url.pathname === '/chat' && event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          reply: `⚠️ You are offline. Here are emergency numbers:\n
🚑 Ambulance: 108\n
🚔 Police: 100\n
🔥 Fire: 101\n
🆘 Emergency: 112\n\n
Please call these numbers immediately. Stay calm and stay safe.`
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // For nearby places when offline
  if (url.pathname === '/nearby') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          places: []
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // For all other requests, try network first then cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})