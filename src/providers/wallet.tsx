import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  ArkNote,
  ServiceWorkerWallet,
  NetworkName,
  SingleKey,
  MnemonicIdentity,
  AssetDetails,
  WalletBalance,
  IVtxoManager,
  migrateWalletRepository,
  getMigrationStatus,
  rollbackMigration,
  IndexedDBWalletRepository,
  IndexedDBContractRepository,
  type Identity,
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
import { hasMnemonic, getMnemonic, deriveNostrKeyFromMnemonic } from '../lib/mnemonic'
import { calcBatchLifetimeMs, calcNextRollover } from '../lib/wallet'
import { setLoadingStatus } from '../lib/loadingStatus'
import { hex } from '@scure/base'
import * as secp from '@noble/secp256k1'
import { ConfigContext } from './config'
import { defaultPassword, getDelegateUrlForNetwork, maxPercentage } from '../lib/constants'
import { AssetIconApprovalManager } from '../lib/assetIconApproval'
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
import { Indexer } from '../lib/indexer'
import { IndexedDbSwapRepository, migrateToSwapRepository, Network } from '@arkade-os/boltz-swap'

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 5_000
const MESSAGE_BUS_INIT_TIMEOUT_MS = 30_000

interface InitSvcWorkerWalletParams {
  arkServerUrl: string
  esploraUrl?: string
  identity: Identity
  skipMigration?: boolean
  retryCount?: number
  maxRetries?: number
  delegatorUrl?: string
}

const defaultWallet: Wallet = {
  network: '',
  nextRollover: 0,
}

export type WalletAuthState = 'unknown' | 'passwordless' | 'locked' | 'authenticated'

interface WalletContextProps {
  initWallet: (credentials: { mnemonic?: string; privateKey?: Uint8Array }) => Promise<void>
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
  const { setNoteInfo, noteInfo, setDeepLinkInfo, deepLinkInfo, setLnurlInfo } = useContext(FlowContext)
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
  const reinitInProgress = useRef(false)
  const initAbortRef = useRef<AbortController | null>(null)
  const reinitSvcWalletRef = useRef<((identity: Identity) => Promise<void>) | null>(null)

  // Each init gets its own AbortSignal; lock/reset aborts the current signal
  // with 'lock-reset' so stale paths can decide whether to tear down the SW.
  // A new init aborts the previous with 'init', which means "abandon, don't clear".
  const startInitSession = (): AbortSignal => {
    initAbortRef.current?.abort('init')
    initAbortRef.current = new AbortController()
    return initAbortRef.current.signal
  }

  const abortInitSession = () => {
    initAbortRef.current?.abort('lock-reset')
    initAbortRef.current = null
  }

  const clearIfLockReset = async (svcWallet: ServiceWorkerWallet, signal: AbortSignal) => {
    if (!signal.aborted || signal.reason !== 'lock-reset') return
    try {
      await svcWallet.clear()
    } catch (err) {
      consoleError(err, 'Error clearing stale service worker wallet')
    }
  }

  const removeServiceWorkerMessageHandler = (handler = swMessageHandlerRef.current) => {
    if (!handler) return
    navigator.serviceWorker.removeEventListener('message', handler)
    if (swMessageHandlerRef.current === handler) swMessageHandlerRef.current = undefined
  }

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

  const devMnemonic = import.meta.env.VITE_DEV_MNEMONIC as string | undefined
  const devNsec = import.meta.env.VITE_DEV_NSEC as string | undefined
  const isDevAutoInit = import.meta.env.DEV && (Boolean(devMnemonic) || Boolean(devNsec))
  const [devAutoInitFailed, setDevAutoInitFailed] = useState(false)

  // dev-only: auto-initialize wallet from VITE_DEV_MNEMONIC / VITE_DEV_NSEC, bypassing onboarding and unlock
  useEffect(() => {
    if (!isDevAutoInit || devAutoInitFailed) return
    if (initialized) return
    if (!aspInfo.url) return

    const autoInit = async () => {
      try {
        if (devMnemonic) await initWallet({ mnemonic: devMnemonic })
        else if (devNsec) await initWallet({ privateKey: nsecToPrivateKey(devNsec) })
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

    if (!wallet.pubkey) {
      setAuthState('authenticated')
      return
    }

    let cancelled = false
    setAuthState('unknown')

    const detectPasswordState = async () => {
      if (hasMnemonic()) {
        try {
          await getMnemonic(defaultPassword)
          return true // passwordless
        } catch {
          return false // has custom password
        }
      }
      return noUserDefinedPassword()
    }

    detectPasswordState()
      .then((noPassword) => {
        if (!cancelled) setAuthState(noPassword ? 'passwordless' : 'locked')
      })
      .catch(() => {
        if (!cancelled) setAuthState('locked')
      })

    return () => {
      cancelled = true
    }
  }, [wallet.pubkey])

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
    if (!deepLinkInfo?.appId) return
    switch (deepLinkInfo?.appId) {
      case 'boltz':
        navigate(Pages.AppBoltz)
        break
      case 'lendasat':
        navigate(Pages.AppLendasat)
        break
      case 'satora':
        navigate(Pages.AppSatora)
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

  const initSvcWorkerWallet = async (params: InitSvcWorkerWalletParams): Promise<boolean> => {
    const signal = startInitSession()
    return runInitAttempt(signal, params.identity, params)
  }

  // Retries inherit the signal minted by the top-level call so a lock/reset
  // that fires between retries is observable via signal.aborted.
  const runInitAttempt = async (
    signal: AbortSignal,
    identity: Identity,
    params: InitSvcWorkerWalletParams,
  ): Promise<boolean> => {
    const { arkServerUrl, esploraUrl, skipMigration = false, retryCount = 0, maxRetries = 2, delegatorUrl } = params
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
        settlementConfig: { vtxoThreshold: wallet.thresholdMs ? Math.floor(wallet.thresholdMs / 1000) : 1 },
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

      const vtxoMgr = await svcWallet.getVtxoManager()
      const { walletInitialized } = await svcWallet.getStatus()

      // Single checkpoint before any state/listener commits. Migration and
      // getVtxoManager/getStatus are side-effect-free w.r.t. React/DOM, so
      // running them after an abort is wasteful but safe.
      if (signal.aborted) {
        await clearIfLockReset(svcWallet, signal)
        return false
      }

      setSvcWallet(svcWallet)
      setVtxoManager(vtxoMgr)
      setInitialized(walletInitialized)

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

      if (swMessageHandlerRef.current) {
        removeServiceWorkerMessageHandler(swMessageHandlerRef.current)
      }
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessages)
      swMessageHandlerRef.current = handleServiceWorkerMessages

      // ping the service worker wallet status every 1 second
      if (statusPingInterval.current) clearInterval(statusPingInterval.current)
      let consecutivePingFailures = 0
      let pingInProgress = false
      statusPingInterval.current = setInterval(async () => {
        if (pingInProgress) return
        pingInProgress = true
        try {
          const statusTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('status ping timed out')), 3_000),
          )
          const { walletInitialized } = await Promise.race([svcWallet.getStatus(), statusTimeout])
          consecutivePingFailures = 0
          if (!signal.aborted) setInitialized(walletInitialized)
        } catch (err) {
          consoleError(err, 'Error pinging wallet status')
          consecutivePingFailures++
          // Guard with signal so a stale in-flight ping from a dead session
          // cannot clear the new session's interval or trigger a reinit.
          if (consecutivePingFailures >= 3 && !signal.aborted) {
            clearInterval(statusPingInterval.current)
            reinitSvcWalletRef.current?.(identity)
          }
        } finally {
          pingInProgress = false
        }
      }, 1_000)

      // Renew expiring coins on startup (non-delegate mode only).
      // When delegation is enabled, the SDK's VtxoManager auto-delegates
      // via onContractEvent, so no wallet-side call is needed.
      if (!config.delegate) {
        vtxoMgr.renewVtxos().catch(() => {})
      }
      return true
    } catch (err) {
      if (signal.aborted) return false

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
        if (signal.aborted) return false
        return runInitAttempt(signal, identity, { ...params, retryCount: retryCount + 1 })
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

  const isMainnet = (network: NetworkName | string): boolean =>
    network !== 'testnet' && network !== 'mutinynet' && network !== 'signet' && network !== 'regtest'

  const initWallet = async (credentials: { mnemonic?: string; privateKey?: Uint8Array }) => {
    const arkServerUrl = aspInfo.url
    const network = aspInfo.network as NetworkName
    const esploraUrl = getRestApiExplorerURL(network)

    let identity: Identity
    let pubkey: string

    const delegatorUrl = config.delegate ? getDelegateUrlForNetwork(network).url : undefined

    if (credentials.mnemonic) {
      const mnemonicIdentity = MnemonicIdentity.fromMnemonic(credentials.mnemonic, { isMainnet: isMainnet(network) })
      identity = mnemonicIdentity
      pubkey = hex.encode(await mnemonicIdentity.compressedPublicKey())
      const secret = deriveNostrKeyFromMnemonic(credentials.mnemonic, isMainnet(network))
      setLnurlInfo(secret)
      updateConfig({ ...config, pubkey })
    } else if (credentials.privateKey) {
      identity = SingleKey.fromPrivateKey(credentials.privateKey)
      pubkey = hex.encode(secp.getPublicKey(credentials.privateKey))
      setLnurlInfo(credentials.privateKey)
      updateConfig({ ...config, pubkey })
    } else {
      throw new Error('Either mnemonic or privateKey must be provided')
    }

    const didInit = await initSvcWorkerWallet({
      identity,
      arkServerUrl,
      esploraUrl,
      delegatorUrl,
    })
    if (!didInit) return
    updateWallet({ ...wallet, network, pubkey })
    setInitialized(true)
  }

  const unlockWallet = async (password: string) => {
    try {
      if (hasMnemonic()) {
        const mnemonic = await getMnemonic(password)
        setAuthState('authenticated')
        await initWallet({ mnemonic })
      } else {
        const privateKey = await getPrivateKey(password)
        setAuthState('authenticated')
        await initWallet({ privateKey })
      }
    } catch (err) {
      setAuthState('locked')
      if (err instanceof DOMException) throw new Error('Invalid password')
      throw err instanceof Error ? err : new Error('Invalid password')
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
    const identity = svcWallet.identity as Identity
    const arkServerUrl = aspInfo.url
    const esploraUrl = getRestApiExplorerURL(aspInfo.network as NetworkName) ?? ''
    const delegatorUrl = delegateEnabled ? getDelegateUrlForNetwork(aspInfo.network as Network).url : undefined
    await initSvcWorkerWallet({
      identity,
      arkServerUrl,
      esploraUrl,
      delegatorUrl,
      skipMigration: true,
    })
  }

  // Self-heal when the SW dies: re-run setup with the existing identity so
  // SwapsProvider and other consumers re-bind via setSvcWallet, instead of
  // reloading the page (which would discard FlowProvider state and UI context).
  // Identity is passed in by the caller because the setInterval that triggers
  // reinit captures this closure from the render before svcWallet state was
  // populated.
  const reinitSvcWallet = async (identity: Identity) => {
    if (reinitInProgress.current) return
    reinitInProgress.current = true
    try {
      const arkServerUrl = aspInfo.url
      const esploraUrl = getRestApiExplorerURL(aspInfo.network as NetworkName) ?? ''
      const delegatorUrl = config.delegate ? getDelegateUrlForNetwork(aspInfo.network as Network).url : undefined
      const initialized = await initSvcWorkerWallet({
        identity,
        arkServerUrl,
        esploraUrl,
        delegatorUrl,
        skipMigration: true,
      })
      if (!initialized) return
    } catch (err) {
      consoleError(err, 'SW reinit failed; falling back to full reload')
      window.location.reload()
    } finally {
      reinitInProgress.current = false
    }
  }

  useEffect(() => {
    reinitSvcWalletRef.current = reinitSvcWallet
  })

  const lockWallet = async () => {
    abortInitSession()
    if (!svcWallet) throw new Error('Service worker not initialized')
    if (statusPingInterval.current) clearInterval(statusPingInterval.current)
    statusPingInterval.current = undefined
    clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = undefined
    removeServiceWorkerMessageHandler()
    await svcWallet.clear()
    setAuthState('locked')
    setInitialized(false)
    setDataReady(false)
    hasLoadedOnce.current = false
  }

  const resetWallet = async () => {
    abortInitSession()
    if (statusPingInterval.current) clearInterval(statusPingInterval.current)
    statusPingInterval.current = undefined
    clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = undefined
    removeServiceWorkerMessageHandler()
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
