import { Worker } from '@arklabs/wallet-sdk'
import { vtxosRepository } from './lib/db'

const worker = new Worker(vtxosRepository)
worker.start().catch(console.error)

const CACHE_NAME = 'arkade-cache-v1'
declare const self: ServiceWorkerGlobalScope

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
  self.clients.claim() // take control of clients immediately
})

// we can adopt two different strategies for caching:
// 1. cache first: try to get the response from the cache first, then fetch from network
// 2. network first: try to fetch from the network first, then get the response from the cache
//
// due to the fast development of the wallet-sdk, we should use network first for now
//
// async function cacheFirst(request) {
//   const cache = await caches.open(CACHE_NAME)
//   const cachedResponse = await cache.match(request)
//   if (cachedResponse) return cachedResponse
//   const response = await fetch(request)
//   cache.put(request, response.clone())
//   return response
// }

async function networkFirst(request: RequestInfo): Promise<Response> {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch (error) {
    const cachedResponse = await cache.match(request)
    if (!cachedResponse) throw new Error('No cached response found')
    return cachedResponse
  }
}

// fetch event: use network first, then cache
self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(networkFirst(event.request))
})
