import {
  ServiceWorkerWallet,
  IndexedDBWalletRepository,
  IndexedDBContractRepository,
  migrateWalletRepository,
  getMigrationStatus,
  rollbackMigration,
} from '@arkade-os/sdk'
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
import { IndexedDbSwapRepository, migrateToSwapRepository } from '@arkade-os/boltz-swap'
import { consoleError } from '../../lib/logs'
import { setLoadingStatus } from '../../lib/loadingStatus'
import {
  Unsubscribe,
  WalletEventAdapter,
  WalletRuntimeCreateParams,
  WalletRuntimeEvent,
  WalletRuntimeFactory,
  WalletRuntimeInstance,
} from '../types'

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 5_000
const MESSAGE_BUS_INIT_TIMEOUT_MS = 30_000
const MAX_SETUP_RETRIES = 2

/**
 * PWA wallet runtime: the service-worker wallet path.
 *
 * Encapsulates the service-worker-specific setup that previously lived inline in
 * `src/providers/wallet.tsx` (zombie-SW detection, `ServiceWorkerWallet.setup`,
 * repository migration, activation-timeout retry/backoff). The provider keeps
 * the credential-derived lifecycle and consumes this behind
 * {@link WalletRuntimeFactory}.
 */
const createServiceWorkerWallet = async (
  params: WalletRuntimeCreateParams,
  retryCount = 0,
): Promise<WalletRuntimeInstance> => {
  const { identity, arkServerUrl, esploraUrl, delegatorUrl, settlementConfig, skipMigration = false } = params
  try {
    setLoadingStatus('Starting wallet...')
    const walletRepository = new IndexedDBWalletRepository()
    const contractRepository = new IndexedDBContractRepository()

    // Zombie SW detection and IndexedDB warmup are independent — run them
    // concurrently. The zombie ping timeout is 500ms: alive workers respond
    // in <10ms, so anything slower is dead.
    const zombieCheck = (async () => {
      const existingReg = await navigator.serviceWorker.getRegistration()
      const active = existingReg?.active
      if (active) {
        const alive = await new Promise<boolean>((resolve) => {
          const channel = new MessageChannel()
          const timer = setTimeout(() => {
            channel.port1.close()
            resolve(false)
          }, 500)
          channel.port1.onmessage = (event) => {
            clearTimeout(timer)
            channel.port1.close()
            resolve(event.data?.type === 'PONG')
          }
          active.postMessage({ type: 'PING' }, [channel.port2])
        })
        if (!alive) {
          await existingReg.unregister()
        }
      }
    })()

    await Promise.all([walletRepository.getWalletState(), zombieCheck])
    setLoadingStatus('Connecting to service worker...')

    const svcWallet = await ServiceWorkerWallet.setup({
      serviceWorkerPath: '/wallet-service-worker.mjs',
      identity,
      arkServerUrl,
      esploraUrl,
      delegatorUrl,
      walletMode: 'static',
      storage: { walletRepository, contractRepository },
      serviceWorkerActivationTimeoutMs: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
      messageBusTimeoutMs: MESSAGE_BUS_INIT_TIMEOUT_MS,
      messageTimeouts: {
        SETTLE: 60_000,
        SEND: 60_000,
      },
      settlementConfig,
    })

    if (!skipMigration) {
      setLoadingStatus('Migrating data...')
      try {
        const oldStorage = new IndexedDBStorageAdapter('arkade-service-worker')
        const walletStatus = await getMigrationStatus('wallet', oldStorage)
        if (walletStatus !== 'not-needed') {
          if (walletStatus === 'pending' || walletStatus === 'in-progress') {
            const arkAddress = await svcWallet.getAddress()
            const boardingAddress = await svcWallet.getBoardingAddress()
            try {
              await migrateWalletRepository(oldStorage, svcWallet.walletRepository, {
                offchain: [arkAddress],
                onchain: [boardingAddress],
              })
            } catch (err) {
              await rollbackMigration('wallet', oldStorage)
              throw err
            }
          }
          await migrateToSwapRepository(oldStorage, new IndexedDbSwapRepository())
        }
      } catch (err) {
        consoleError(err, 'Error migrating wallet repository')
      }
    }

    const vtxoManager = await svcWallet.getVtxoManager()

    return {
      wallet: svcWallet,
      vtxoManager,
      serviceWorker: svcWallet.serviceWorker,
      getStatus: () => svcWallet.getStatus(),
      // Updates are pushed by the service worker; data is re-fetched by the
      // provider's reloadWallet, so there is nothing to pull here.
      reload: async () => {},
      clear: () => svcWallet.clear(),
      resetStorage: async () => {
        await svcWallet.walletRepository.clear()
        await svcWallet.contractRepository.clear()
      },
      dispose: () => svcWallet.clear(),
    }
  } catch (err) {
    const isTimeoutError =
      err instanceof Error &&
      (err.message.includes('Service worker activation timed out') || err.message.includes('MessageBus timed out'))

    if (isTimeoutError && retryCount < MAX_SETUP_RETRIES) {
      // exponential backoff: wait 1s, 2s, 4s, 8s, 16s for each retry
      const delay = Math.pow(2, retryCount) * 1000
      setLoadingStatus('Retrying connection...')
      consoleError(
        new Error(
          `Service worker activation timed out, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_SETUP_RETRIES})`,
        ),
        'Service worker activation retry',
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
      return createServiceWorkerWallet(params, retryCount + 1)
    }

    // When the SW is permanently unresponsive (all retries exhausted), unregister
    // it so the next page load gets a fresh registration instead of reusing the
    // broken activation. This makes the one-time reload recovery effective.
    if (isTimeoutError && retryCount >= MAX_SETUP_RETRIES) {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) await reg.unregister()
      } catch {
        // best-effort cleanup
      }
    }

    // Surface the failure so the unlock flow cannot proceed silently without an initialized wallet.
    throw err
  }
}

export const serviceWorkerWalletFactory: WalletRuntimeFactory = {
  create: (params) => createServiceWorkerWallet(params),
}

/**
 * Maps service-worker messages and status pings to runtime wallet events.
 *
 * - `VTXO_UPDATE` / `UTXO_UPDATE` messages → `vtxo-update` / `utxo-update`.
 * - A 1s status ping (3s per-call timeout) → `status` events; after 3
 *   consecutive failures it emits `runtime-dead` and stops, letting the provider
 *   re-init (replacing the old in-provider reinit-on-dead path).
 */
export const serviceWorkerWalletEvents: WalletEventAdapter = {
  subscribe: (_instance, handler): Unsubscribe => {
    const onMessage = (event: MessageEvent) => {
      if (!event.data) return
      if (event.data.type === 'VTXO_UPDATE') handler({ type: 'vtxo-update', newVtxos: event.data.payload?.newVtxos })
      else if (event.data.type === 'UTXO_UPDATE') handler({ type: 'utxo-update', coins: event.data.payload?.coins })
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    let consecutivePingFailures = 0
    let pingInProgress = false
    let pingInterval: ReturnType<typeof setInterval> | undefined = setInterval(async () => {
      if (pingInProgress) return
      pingInProgress = true
      try {
        const statusTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('status ping timed out')), 3_000),
        )
        const { walletInitialized } = await Promise.race([_instance.getStatus(), statusTimeout])
        consecutivePingFailures = 0
        handler({ type: 'status', walletInitialized })
      } catch (err) {
        consoleError(err, 'Error pinging wallet status')
        consecutivePingFailures++
        if (consecutivePingFailures >= 3) {
          if (pingInterval) clearInterval(pingInterval)
          pingInterval = undefined
          handler({ type: 'runtime-dead' })
        }
      } finally {
        pingInProgress = false
      }
    }, 1_000)

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      if (pingInterval) clearInterval(pingInterval)
      pingInterval = undefined
    }
  },

  waitForNextUpdate: (_instance, options): Promise<WalletRuntimeEvent> => {
    const timeoutMs = options?.timeoutMs
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const cleanup = () => {
        navigator.serviceWorker.removeEventListener('message', onMessage)
        if (timer) clearTimeout(timer)
      }
      const onMessage = (event: MessageEvent) => {
        if (!event.data) return
        if (event.data.type === 'VTXO_UPDATE') {
          cleanup()
          resolve({ type: 'vtxo-update' })
        } else if (event.data.type === 'UTXO_UPDATE') {
          cleanup()
          resolve({ type: 'utxo-update' })
        }
      }
      navigator.serviceWorker.addEventListener('message', onMessage)
      if (timeoutMs) {
        timer = setTimeout(() => {
          cleanup()
          reject(new Error('waitForNextUpdate timed out'))
        }, timeoutMs)
      }
    })
  },
}
