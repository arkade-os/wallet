import { Worker } from '@arkade-os/sdk'

const worker = new Worker()
worker.start().catch(console.error)

const CACHE_NAME = 'arkade-cache-v1'
declare const self: ServiceWorkerGlobalScope

// The first event a service worker gets is install.
// It's triggered as soon as the worker executes, and it's
// only called once per service worker. If you alter your
// service worker script the browser considers it a
// different service worker, and it'll get its own install event.
//
// install event: activate service worker immediately
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(caches.open(CACHE_NAME))
  self.skipWaiting() // activate service worker immediately
})

// activate event: clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName === CACHE_NAME) return
          return caches.delete(cacheName)
        }),
      )
    }),
  )
  // some weird stuff happens if we don't reload the page when
  // the service worker is activated, so we force a reload
  // by sending a message to all clients to reload the page
  self.clients
    .matchAll({
      includeUncontrolled: true,
      type: 'window',
    })
    .then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'RELOAD_PAGE' })
      })
    })
  self.clients.claim() // take control of clients immediately
})

// we can adopt two different strategies for caching:
// 1. cache first: try to get the response from the cache first, then fetch from network
// 2. network first: try to fetch from the network first, then get the response from the cache
//
// due to the fast development of the wallet sdk, we should use network first for now
//
// async function cacheFirst(request) {
//   const cache = await caches.open(CACHE_NAME)
//   const cachedResponse = await cache.match(request)
//   if (cachedResponse) return cachedResponse
//   const response = await fetch(request)
//   cache.put(request, response.clone())
//   return response
// }
// async function networkFirst(request: Request): Promise<Response> {
//   const cache = await caches.open(CACHE_NAME)
//   try {
//     const response = await fetch(request)
//     if (request.method === 'GET') {
//       cache.put(request, response.clone())
//     }
//     return response
//   } catch (error) {
//     const cachedResponse = await cache.match(request)
//     if (!cachedResponse) throw new Error('No cached response found')
//     return cachedResponse
//   }
// }

// fetch event: use network first, then cache
// self.addEventListener('fetch', (event: FetchEvent) => {
//   event.respondWith(networkFirst(event.request))
// })

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'RELOAD_WALLET') {
    // reload the wallet when the service worker receives a message to reload
    event.waitUntil(worker.reload().catch(console.error))
  }
})

// Push notification event: display notification when received
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push event received:', event)

  let data: any = {}

  try {
    const rawData = event.data?.text()
    console.log('[SW] Raw push data:', rawData)
    data = event.data?.json() || {}
    console.log('[SW] Parsed push data:', data)
  } catch (error) {
    console.error('[SW] Failed to parse push notification data:', error)
    data = { title: 'New Notification', body: event.data?.text() || '' }
  }

  const { title, body, icon, badge, tag, data: payload, actions } = data

  const notificationOptions: any = {
    body: body || '',
    tag: tag || 'arkade-notification',
    data: payload || {},
    vibrate: [200, 100, 200],
    requireInteraction: true, // Force notification to show even when tab is focused
  }

  // Add actions if provided
  if (actions && Array.isArray(actions)) {
    notificationOptions.actions = actions
  }

  console.log('[SW] Showing notification:', title, notificationOptions)
  event.waitUntil(
    self.registration
      .showNotification(title || 'Arkade Wallet', notificationOptions)
      .then(() => {
        console.log('[SW] ✅ Notification displayed successfully')
      })
      .catch((error) => {
        console.error('[SW] ❌ Failed to show notification:', error)
      }),
  )
})

// Notification click event: handle when user clicks notification
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  // Handle action clicks
  if (event.action) {
    if (event.action === 'view') {
      event.waitUntil(self.clients.openWindow('/wallet'))
    }
  } else {
    // Default action: open wallet
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/wallet') && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/wallet')
        }
      }),
    )
  }
})
