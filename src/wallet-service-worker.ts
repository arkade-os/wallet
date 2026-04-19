import { ArkadeSwapsMessageHandler, IndexedDbSwapRepository } from '@arkade-os/boltz-swap'
import {
  IndexedDBWalletRepository,
  IndexedDBContractRepository,
  MessageBus,
  WalletMessageHandler,
  MnemonicIdentity,
  SingleKey,
  ReadonlySingleKey,
  Wallet,
  ReadonlyWallet,
  RestArkProvider,
  RestDelegatorProvider,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { gitCommit } from './_gitCommit'

// Health-check ping: responds via MessageChannel so the main thread can
// detect if this worker is alive before attempting full initialization.
// Must be registered before any other code that could fail.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'PING' && event.ports?.[0]) {
    event.ports[0].postMessage({ type: 'PONG' })
  }
})

const walletRepository = new IndexedDBWalletRepository()
const contractRepository = new IndexedDBContractRepository()
const swapRepository = new IndexedDbSwapRepository()

// Allow the page to force activation of a newly installed worker.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting())
  }
})

const worker = new MessageBus(walletRepository, contractRepository, {
  messageHandlers: [new WalletMessageHandler(), new ArkadeSwapsMessageHandler(swapRepository)],
  tickIntervalMs: 5000,
  messageTimeoutMs: 60_000,
  buildServices: async (config: any) => {
    const arkProvider = new RestArkProvider(config.arkServer.url)
    const storage = { walletRepository, contractRepository }
    const delegatorProvider = config.delegatorUrl ? new RestDelegatorProvider(config.delegatorUrl) : undefined

    if ('mnemonic' in config.wallet) {
      const identity = MnemonicIdentity.fromMnemonic(config.wallet.mnemonic, {
        isMainnet: config.wallet.isMainnet,
      })
      const wallet = await Wallet.create({
        identity,
        arkServerUrl: config.arkServer.url,
        arkServerPublicKey: config.arkServer.publicKey,
        indexerUrl: config.indexerUrl,
        esploraUrl: config.esploraUrl,
        storage,
        delegatorProvider,
        settlementConfig: config.settlementConfig,
        watcherConfig: config.watcherConfig,
      })
      return { wallet, arkProvider, readonlyWallet: wallet }
    }

    if ('privateKey' in config.wallet) {
      const identity = SingleKey.fromHex(config.wallet.privateKey)
      const wallet = await Wallet.create({
        identity,
        arkServerUrl: config.arkServer.url,
        arkServerPublicKey: config.arkServer.publicKey,
        indexerUrl: config.indexerUrl,
        esploraUrl: config.esploraUrl,
        storage,
        delegatorProvider,
        settlementConfig: config.settlementConfig,
        watcherConfig: config.watcherConfig,
      })
      return { wallet, arkProvider, readonlyWallet: wallet }
    }

    if ('publicKey' in config.wallet) {
      const identity = ReadonlySingleKey.fromPublicKey(hex.decode(config.wallet.publicKey))
      const readonlyWallet = await ReadonlyWallet.create({
        identity,
        arkServerUrl: config.arkServer.url,
        arkServerPublicKey: config.arkServer.publicKey,
        indexerUrl: config.indexerUrl,
        esploraUrl: config.esploraUrl,
        storage,
        delegatorProvider,
        watcherConfig: config.watcherConfig,
      })
      return { readonlyWallet, arkProvider }
    }

    throw new Error('Missing wallet identity in configuration')
  },
})
worker.start().catch(console.error)

const CACHE_NAME = 'arkade-cache-v1'
declare const self: ServiceWorkerGlobalScope

// The first event a service worker gets is install.
// It's triggered as soon as the worker executes, and it's
// only called once per service worker. If you alter your
// service worker script the browser considers it a
// different service worker, and it'll get its own install event.
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      // activate service worker immediately
      console.log(`Activating service worker ${gitCommit}`)
      return self.skipWaiting()
    }),
  )
})

// activate event: clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  // claim clients immediately so that the new
  // service worker starts controlling the page
  event.waitUntil(self.clients.claim())

  // delete old caches
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
