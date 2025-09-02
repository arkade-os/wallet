import { Worker } from '@arkade-os/sdk'
import { vtxosRepository } from './lib/db'

const worker = new Worker(vtxosRepository)
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
