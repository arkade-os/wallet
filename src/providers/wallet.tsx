import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  ArkNote,
  ServiceWorkerWallet,
  NetworkName,
  SingleKey,
  AssetDetails,
  WalletBalance,
  IVtxoManager,
  migrateWalletRepository,
  getMigrationStatus,
  rollbackMigration,
  IndexedDBWalletRepository,
  IndexedDBContractRepository,
} from '@arkade-os/sdk'
import {
  clearStorage,
  readWalletFromStorage,
  saveWalletToStorage,
  saveAssetMetadataToStorage,
  readAssetMetadataFromStorage,
  CachedAssetDetails,
  ASSET_METADATA_TTL_MS,
} from '../lib/storage'
import { NavigationContext, Pages } from './navigation'
import { getRestApiExplorerURL } from '../lib/explorers'
import { getBalance, getTxHistory, getVtxos, settleVtxos } from '../lib/asp'
import { AspContext } from './asp'
import { NotificationsContext } from './notifications'
import { FlowContext } from './flow'
import { arkNoteInUrl } from '../lib/arknote'
import { deepLinkInUrl } from '../lib/deepLink'
import { consoleError } from '../lib/logs'
import { Tx, Vtxo, Wallet } from '../lib/types'
import { nsecToPrivateKey, getPrivateKey, noUserDefinedPassword } from '../lib/privateKey'
import { calcBatchLifetimeMs, calcNextRollover } from '../lib/wallet'
import { setLoadingStatus } from '../lib/loadingStatus'
import { hex } from '@scure/base'
import * as secp from '@noble/secp256k1'
import { ConfigContext } from './config'
import { getDelegateUrlForNetwork, maxPercentage } from '../lib/constants'
import { AssetIconApprovalManager } from '../lib/assetIconApproval'
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
import { Indexer } from '../lib/indexer'
import { IndexedDbSwapRepository, migrateToSwapRepository, Network } from '@arkade-os/boltz-swap'

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 5_000
const MESSAGE_BUS_INIT_TIMEOUT_MS = 30_000

const defaultWallet: Wallet = {
  network: '',
  nextRollover: 0,
}

export type WalletAuthState = 'unknown' | 'passwordless' | 'locked' | 'authenticated'

interface WalletContextProps {
  initWallet: (seed: Uint8Array) => Promise<void>
  lockWallet: () => Promise<void>
  resetWallet: () => Promise<void>
  settlePreconfirmed: () => Promise<void>
  unlockWallet: (password: string) => Promise<void>
  updateWallet: (w: Wallet | ((prev: Wallet) => Wallet)) => void
  isLocked: () => Promise<boolean>
  reloadWallet: (svcWallet?: ServiceWorkerWallet) => Promise<void>
  restartWallet: (delegateEnabled?: boolean) => Promise<void>
  wallet: Wallet
  walletLoaded: boolean
  svcWallet: ServiceWorkerWallet | undefined
  vtxoManager: IVtxoManager | undefined
  txs: Tx[]
  vtxos: { spendable: Vtxo[]; spent: Vtxo[] }
  balance: WalletBalance['total']
  assetBalances: WalletBalance['assets']
  assetMetadataCache: Map<string, CachedAssetDetails>
  setCacheEntry: (assetId: string, details: AssetDetails) => CachedAssetDetails
  iconApprovalManager: AssetIconApprovalManager
  dataReady: boolean
  loadError: string | null
  dismissLoadError: () => void
  authState: WalletAuthState
  initialized?: boolean
}

export const WalletContext = createContext<WalletContextProps>({
  initWallet: () => Promise.resolve(),
  lockWallet: () => Promise.resolve(),
  resetWallet: () => Promise.resolve(),
  settlePreconfirmed: () => Promise.resolve(),
  unlockWallet: () => Promise.resolve(),
  updateWallet: () => {},
  reloadWallet: () => Promise.resolve(),
  restartWallet: () => Promise.resolve(),
  wallet: defaultWallet,
  walletLoaded: false,
  svcWallet: undefined,
  vtxoManager: undefined,
  isLocked: () => Promise.resolve(true),
  balance: 0,
  assetBalances: [],
  assetMetadataCache: new Map(),
  setCacheEntry: () => ({ cachedAt: 0 }) as CachedAssetDetails,
  iconApprovalManager: new AssetIconApprovalManager(),
  dataReady: false,
  loadError: null,
  dismissLoadError: () => {},
  authState: 'unknown',
  txs: [],
  vtxos: { spendable: [], spent: [] },
})

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { navigate } = useContext(NavigationContext)
  const { setNoteInfo, noteInfo, setDeepLinkInfo, deepLinkInfo } = useContext(FlowContext)
  const { notifyTxSettled } = useContext(NotificationsContext)

  const [txs, setTxs] = useState<Tx[]>([])
  const [balance, setBalance] = useState(0)
  const [wallet, setWallet] = useState(() => readWalletFromStorage() ?? defaultWallet)
  const walletLoaded = true
  const [initialized, setInitialized] = useState<boolean>(false)
  const [svcWallet, setSvcWallet] = useState<ServiceWorkerWallet>()
  const [dataReady, setDataReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [authState, setAuthState] = useState<WalletAuthState>('unknown')
  const [vtxos, setVtxos] = useState<{ spendable: Vtxo[]; spent: Vtxo[] }>({ spendable: [], spent: [] })
  const [assetBalances, setAssetBalances] = useState<WalletBalance['assets']>([])

  const [vtxoManager, setVtxoManager] = useState<IVtxoManager>()

  const hasLoadedOnce = useRef(false)
  const assetMetadataCache = useRef<Map<string, CachedAssetDetails>>(readAssetMetadataFromStorage() ?? new Map())
  const iconApprovalManager = useRef(new AssetIconApprovalManager()).current
  const verifiedAssetsFetched = useRef(false)
  const statusPingInterval = useRef<ReturnType<typeof setInterval>>()
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const swMessageHandlerRef = useRef<(event: MessageEvent) => void>()

  const setCacheEntry = (assetId: string, details: AssetDetails): CachedAssetDetails => {
    const hasIcon = !!details.metadata?.icon
    const moderated =
      hasIcon && !iconApprovalManager.isApproved(assetId)
        ? { ...details, metadata: { ...details.metadata, icon: undefined } }
        : details
    const entry: CachedAssetDetails = { ...moderated, cachedAt: Date.now(), hasIcon }
    assetMetadataCache.current.set(assetId, entry)
    saveAssetMetadataToStorage(assetMetadataCache.current)
    return entry
  }

  // wallet is read synchronously in useState initializer above

  const devNsec = import.meta.env.VITE_DEV_NSEC as string | undefined
  const isDevAutoInit = import.meta.env.DEV && Boolean(devNsec)
  const [devAutoInitFailed, setDevAutoInitFailed] = useState(false)

  // dev-only: auto-initialize wallet from VITE_DEV_NSEC, bypassing onboarding and unlock
  useEffect(() => {
    if (!isDevAutoInit || !devNsec || devAutoInitFailed) return
    if (initialized) return
    if (!aspInfo.url) return

    const autoInit = async () => {
      try {
        const privateKey = nsecToPrivateKey(devNsec)
        await initWallet(privateKey)
        setAuthState('authenticated')
      } catch (err) {
        consoleError(err, 'Dev auto-init failed')
        setDevAutoInitFailed(true)
      }
    }

    autoInit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.url, initialized, devAutoInitFailed])

  useEffect(() => {
    // skip auth check when dev auto-init will handle it
    if (isDevAutoInit && !devAutoInitFailed) {
      if (!initialized) return
      setAuthState('authenticated')
      return
    }

    if (initialized) {
      setAuthState('authenticated')
      return
    }

    let cancelled = false
    setAuthState('unknown')
    noUserDefinedPassword()
      .then((noPassword) => {
        if (!cancelled) setAuthState(noPassword ? 'passwordless' : 'locked')
      })
      .catch(() => {
        if (!cancelled) setAuthState('locked')
      })

    return () => {
      cancelled = true
    }
  }, [wallet.pubkey, initialized, devAutoInitFailed])

  // reload wallet as soon as we have a service worker wallet available
  useEffect(() => {
    if (svcWallet) reloadWallet().catch(consoleError)
  }, [svcWallet])

  // calculate thresholdMs and next rollover
  useEffect(() => {
    if (!initialized || !vtxos || !svcWallet) return
    const computeThresholds = async () => {
      try {
        const allVtxos = await svcWallet.getVtxos({ withRecoverable: true })
        const batchLifetimeMs = await calcBatchLifetimeMs(allVtxos, new Indexer(aspInfo))
        const thresholdMs = Math.floor((batchLifetimeMs * maxPercentage) / 100)
        const nextRollover = await calcNextRollover(vtxos.spendable, svcWallet, aspInfo)
        updateWallet((prev) => ({ ...prev, nextRollover, thresholdMs }))
      } catch (err) {
        consoleError(err, 'Error computing rollover thresholds')
      }
    }
    computeThresholds()
  }, [initialized, vtxos, svcWallet, aspInfo])

  // fetch verified assets list once on startup
  useEffect(() => {
    const verifiedUrl = import.meta.env.VITE_VERIFIED_ASSETS_URL
    if (!verifiedUrl || verifiedAssetsFetched.current) return
    if (!initialized) return
    verifiedAssetsFetched.current = true

    fetch(verifiedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!Array.isArray(data) || !data.every((id) => typeof id === 'string')) {
          throw new Error('Invalid verified assets response')
        }
        iconApprovalManager.setVerifiedAssets(data)
      })
      .catch((err) => consoleError(err, 'Failed to fetch verified assets'))
  }, [initialized])

  // if ark note is present in the URL, decode it and set the note info
  useEffect(() => {
    const dlInfo = deepLinkInUrl()
    if (dlInfo) {
      setDeepLinkInfo(dlInfo)
    }
    const note = arkNoteInUrl()
    if (note) {
      try {
        const { value } = ArkNote.fromString(note)
        setNoteInfo({ note, satoshis: value })
      } catch (err) {
        consoleError(err, 'error decoding ark note ')
      }
    }
    window.location.hash = ''
  }, [])

  useEffect(() => {
    // Precedence is given to NoteInfo, but they are mutually exclusive because depend on window.location.hash
    if (!initialized || !dataReady) return
    if (noteInfo.satoshis) {
      // if voucher present, go to redeem page
      navigate(Pages.NotesRedeem)
      return
    }
    // if app url is present, navigate to it
    switch (deepLinkInfo?.appId) {
      case 'boltz':
        navigate(Pages.AppBoltz)
        break
      case 'lendasat':
        navigate(Pages.AppLendasat)
        break
      case 'lendaswap':
        navigate(Pages.AppLendaswap)
        break
      default:
        navigate(Pages.Wallet)
    }
  }, [initialized, dataReady, noteInfo.satoshis, deepLinkInfo])

  const reloadWallet = async (swWallet = svcWallet) => {
    if (!swWallet) return
    const isFirstLoad = !hasLoadedOnce.current
    if (isFirstLoad) setLoadError(null)
    try {
      if (isFirstLoad) setLoadingStatus('Fetching coins...')
      const vtxos = await getVtxos(swWallet)
      if (isFirstLoad) setLoadingStatus('Fetching transactions...')
      const txs = await getTxHistory(swWallet)
      if (isFirstLoad) setLoadingStatus('Updating balance...')
      const { total, assets } = await getBalance(swWallet)
      // prefetch asset metadata before triggering re-renders
      if (isFirstLoad && assets.length > 0) setLoadingStatus('Loading asset metadata...')
      for (const ab of assets) {
        const cached = assetMetadataCache.current.get(ab.assetId)
        if (cached && Date.now() - cached.cachedAt < ASSET_METADATA_TTL_MS) continue
        try {
          const meta = await swWallet.assetManager.getAssetDetails(ab.assetId)
          if (meta) setCacheEntry(ab.assetId, meta)
        } catch (err) {
          consoleError(err, `error prefetching metadata for ${ab.assetId}`)
        }
      }
      setBalance(total)
      setAssetBalances(assets)
      if (assets.length > 0 && !config.apps.assets.enabled) {
        updateConfig({ ...config, apps: { ...config.apps, assets: { enabled: true } } })
      }
      setVtxos(vtxos)
      setTxs(txs)
      if (!hasLoadedOnce.current) {
        hasLoadedOnce.current = true
        setDataReady(true)
      }
    } catch (err) {
      consoleError(err, 'Error reloading wallet')
      if (!hasLoadedOnce.current) {
        setLoadError('Unable to load wallet data. Check your connection and try again.')
      }
    }
  }

  const dismissLoadError = () => {
    setLoadError(null)
    hasLoadedOnce.current = true
    setDataReady(true)
  }

  const initSvcWorkerWallet = async ({
    arkServerUrl,
    esploraUrl,
    privateKey,
    retryCount = 0,
    maxRetries = 2,
    delegatorUrl,
  }: {
    arkServerUrl: string
    esploraUrl: string
    privateKey: string
    retryCount?: number
    maxRetries?: number
    delegatorUrl?: string
  }) => {
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
        identity: SingleKey.fromHex(privateKey),
        arkServerUrl,
        esploraUrl,
        delegatorUrl,
        storage: { walletRepository, contractRepository },
        serviceWorkerActivationTimeoutMs: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
        messageBusTimeoutMs: MESSAGE_BUS_INIT_TIMEOUT_MS,
        ...(wallet.thresholdMs && {
          settlementConfig: { vtxoThreshold: Math.floor(wallet.thresholdMs / 1000) },
        }),
      })

      // Migration!
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

      const vtxoMgr = await svcWallet.getVtxoManager()
      setSvcWallet(svcWallet)
      setVtxoManager(vtxoMgr)

      // Cancel any pending reload from a previous wallet instance
      clearTimeout(reloadTimerRef.current)

      // handle messages from the service worker
      // we listen for UTXO/VTXO updates to refresh the tx history and balance
      const handleServiceWorkerMessages = (event: MessageEvent) => {
        if (event.data && ['VTXO_UPDATE', 'UTXO_UPDATE'].includes(event.data.type)) {
          // Debounced reload: short delay lets the indexer update its cache.
          // If multiple updates arrive in quick succession, only the last
          // one triggers a reload (avoids redundant fetches).
          clearTimeout(reloadTimerRef.current)
          reloadTimerRef.current = setTimeout(() => reloadWallet(svcWallet), 1000)
        }
      }

      // listen for messages from the service worker
      if (swMessageHandlerRef.current) {
        navigator.serviceWorker.removeEventListener('message', swMessageHandlerRef.current)
      }
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessages)
      swMessageHandlerRef.current = handleServiceWorkerMessages

      // check if the service worker wallet is initialized
      const { walletInitialized } = await svcWallet.getStatus()
      setInitialized(walletInitialized)

      // ping the service worker wallet status every 1 second
      if (statusPingInterval.current) clearInterval(statusPingInterval.current)
      statusPingInterval.current = setInterval(async () => {
        try {
          const { walletInitialized } = await svcWallet.getStatus()
          setInitialized(walletInitialized)
        } catch (err) {
          consoleError(err, 'Error pinging wallet status')
        }
      }, 1_000)

      // Renew expiring coins on startup (non-delegate mode only).
      // When delegation is enabled, the SDK's VtxoManager auto-delegates
      // via onContractEvent, so no wallet-side call is needed.
      if (!config.delegate) {
        vtxoMgr.renewVtxos().catch(() => {})
      }
    } catch (err) {
      const isTimeoutError =
        err instanceof Error &&
        (err.message.includes('Service worker activation timed out') || err.message.includes('MessageBus timed out'))

      if (isTimeoutError && retryCount < maxRetries) {
        // exponential backoff: wait 1s, 2s, 4s, 8s, 16s for each retry
        const delay = Math.pow(2, retryCount) * 1000
        setLoadingStatus('Retrying connection...')
        consoleError(
          new Error(
            `Service worker activation timed out, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
          ),
          'Service worker activation retry',
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        return initSvcWorkerWallet({
          arkServerUrl,
          esploraUrl,
          privateKey,
          retryCount: retryCount + 1,
          maxRetries,
          delegatorUrl,
        })
      }

      // If we are here, either retries are exhausted or it's a different error.
      // When the SW is permanently unresponsive (all retries exhausted), unregister
      // it so the next page load gets a fresh registration instead of reusing the
      // broken activation. This makes the one-time reload recovery effective.
      if (isTimeoutError && retryCount >= maxRetries) {
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

  const initWallet = async (privateKey: Uint8Array) => {
    const arkServerUrl = aspInfo.url
    const network = aspInfo.network as NetworkName
    const esploraUrl = getRestApiExplorerURL(network) ?? ''
    const pubkey = hex.encode(secp.getPublicKey(privateKey))
    updateConfig({ ...config, pubkey })
    const delegatorUrl = config.delegate ? getDelegateUrlForNetwork(network).url : undefined
    await initSvcWorkerWallet({
      privateKey: hex.encode(privateKey),
      arkServerUrl,
      esploraUrl,
      delegatorUrl,
    })
    updateWallet({ ...wallet, network, pubkey })
    setInitialized(true)
  }

  const unlockWallet = async (password: string) => {
    let privateKey: Uint8Array
    try {
      privateKey = await getPrivateKey(password)
    } catch {
      setAuthState('locked')
      throw new Error('Invalid password')
    }

    setAuthState('authenticated')
    try {
      await initWallet(privateKey)
    } catch (err) {
      setAuthState('locked')
      throw err
    }
  }

  /**
   * Reinitialize the service-worker wallet in-place so runtime config changes
   * (e.g., delegate on/off) take effect without forcing a lock/unlock cycle.
   * Keeps local tx/balance state; just rebuilds the SW wallet with the current
   * delegatorUrl flag.
   */
  const restartWallet = async (delegateEnabled = config.delegate) => {
    if (!svcWallet) return
    type HasToHex = { toHex: () => string }
    const identity = svcWallet.identity
    const privateKey =
      typeof (identity as Partial<HasToHex>).toHex === 'function'
        ? (identity as unknown as HasToHex).toHex()
        : undefined
    if (!privateKey) throw new Error('Unable to reinitialize wallet without private key')
    const arkServerUrl = aspInfo.url
    const esploraUrl = getRestApiExplorerURL(aspInfo.network as NetworkName) ?? ''
    const delegatorUrl = delegateEnabled ? getDelegateUrlForNetwork(aspInfo.network as Network).url : undefined
    await initSvcWorkerWallet({
      privateKey,
      arkServerUrl,
      esploraUrl,
      delegatorUrl,
    })
  }

  const lockWallet = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    if (statusPingInterval.current) clearInterval(statusPingInterval.current)
    statusPingInterval.current = undefined
    await svcWallet.clear()
    setAuthState('locked')
    setInitialized(false)
    setDataReady(false)
    hasLoadedOnce.current = false
  }

  const resetWallet = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await clearStorage()
    await svcWallet.clear()
    await svcWallet.walletRepository.clear()
    await svcWallet.contractRepository.clear()
    setDataReady(false)
    hasLoadedOnce.current = false
  }

  const settlePreconfirmed = async () => {
    if (!svcWallet || !vtxoManager) throw new Error('Service worker not initialized')
    await settleVtxos(svcWallet, vtxoManager, aspInfo.dust, wallet.thresholdMs)
    notifyTxSettled()
  }

  const updateWallet = (data: Wallet | ((prev: Wallet) => Wallet)) => {
    setWallet((prev) => {
      const next = typeof data === 'function' ? (data as (prev: Wallet) => Wallet)(prev) : data
      saveWalletToStorage(next)
      return { ...next }
    })
  }

  const isLocked = async () => {
    if (!svcWallet) return true
    try {
      const { walletInitialized } = await svcWallet.getStatus()
      return !walletInitialized
    } catch {
      return true
    }
  }

  return (
    <WalletContext.Provider
      value={{
        authState,
        initWallet,
        isLocked,
        initialized,
        resetWallet,
        settlePreconfirmed,
        unlockWallet,
        updateWallet,
        wallet,
        walletLoaded,
        svcWallet,
        vtxoManager,
        lockWallet,
        restartWallet,
        txs,
        balance,
        assetBalances,
        assetMetadataCache: assetMetadataCache.current,
        setCacheEntry,
        iconApprovalManager,
        dataReady,
        loadError,
        dismissLoadError,
        reloadWallet,
        vtxos: vtxos ?? { spendable: [], spent: [] },
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
