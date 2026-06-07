import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArkNote,
  NetworkName,
  SingleKey,
  MnemonicIdentity,
  AssetDetails,
  WalletBalance,
  IVtxoManager,
  IWallet,
  Asset,
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
import {
  getBalance,
  getTxHistory,
  getVtxos,
  settleVtxos,
  getReceivingAddresses as getReceivingAddressesFor,
  sendOffChain,
  sendAssets as sendAssetsFor,
  collaborativeExit as collaborativeExitFor,
  collaborativeExitWithFees as collaborativeExitWithFeesFor,
  redeemNotes as redeemNotesFor,
  getInputsToSettle,
} from '../lib/asp'
import { AspContext } from './asp'
import { NotificationsContext } from './notifications'
import { FlowContext } from './flow'
import { arkNoteInUrl } from '../lib/arknote'
import { deepLinkInUrl } from '../lib/deepLink'
import { consoleError } from '../lib/logs'
import { Addresses, Tx, Vtxo, Wallet } from '../lib/types'
import { nsecToPrivateKey, getPrivateKey, noUserDefinedPassword } from '../lib/privateKey'
import { hasMnemonic, getMnemonic, deriveNostrKeyFromMnemonic } from '../lib/mnemonic'
import { calcBatchLifetimeMs, calcNextRollover } from '../lib/wallet'
import { setLoadingStatus } from '../lib/loadingStatus'
import { hex } from '@scure/base'
import * as secp from '@noble/secp256k1'
import { ConfigContext } from './config'
import { defaultPassword, getDelegateUrlForNetwork, maxPercentage } from '../lib/constants'
import { AssetIconApprovalManager } from '../lib/assetIconApproval'
import { Indexer } from '../lib/indexer'
import { Network } from '@arkade-os/boltz-swap'
import { useRuntime } from '../runtime/RuntimeContext'
import {
  Unsubscribe,
  WalletAdvancedActions,
  WalletAssetActions,
  WalletBridgeActions,
  WalletRuntimeCreateParams,
  WalletRuntimeEvent,
  WalletRuntimeInstance,
} from '../runtime/types'

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
  reloadWallet: (options?: { forceRuntimeReload?: boolean }) => Promise<void>
  restartWallet: (delegateEnabled?: boolean) => Promise<void>
  wallet: Wallet
  walletLoaded: boolean
  walletReady: boolean
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
  // Runtime-neutral wallet helpers (replace direct svcWallet calls in screens).
  getReceivingAddresses: () => Promise<Addresses>
  getAvailableBalance: () => Promise<number>
  sendOffchain: (amount: number, address: string) => Promise<string>
  sendAssets: (address: string, assets: Asset[]) => Promise<string>
  collaborativeExit: (amount: number, address: string) => Promise<string>
  collaborativeExitWithFees: (inputAmount: number, outputAmount: number, address: string) => Promise<string>
  redeemNotes: (notes: string[]) => Promise<void>
  // Capability groups for parity-heavy screens and integrations.
  assetManager: WalletAssetActions
  advanced: WalletAdvancedActions
  bridge: WalletBridgeActions
  // Subscribe to runtime wallet update events (replaces direct service-worker
  // message listeners in screens, e.g. the receive payment listener).
  subscribeWalletEvents: (handler: (event: WalletRuntimeEvent) => void) => Unsubscribe
}

const notReady = (): never => {
  throw new Error('Wallet not initialized')
}

const defaultAssetManager: WalletAssetActions = {
  getAssetDetails: () => notReady(),
  issue: () => notReady(),
  reissue: () => notReady(),
  burn: () => notReady(),
  waitForAssetUpdate: () => notReady(),
}

const defaultAdvanced: WalletAdvancedActions = {
  getAllVtxos: () => notReady(),
  getBoardingUtxos: () => notReady(),
  getVtxoManager: () => notReady(),
  getContractManager: () => notReady(),
  getDelegateManager: () => notReady(),
  getInputsToSettle: () => notReady(),
  settleInputs: () => notReady(),
}

const defaultBridge: WalletBridgeActions = {
  getCompressedPublicKey: () => notReady(),
  signTransaction: () => notReady(),
  signMessage: () => notReady(),
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
  walletReady: false,
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
  getReceivingAddresses: () => notReady(),
  getAvailableBalance: () => notReady(),
  sendOffchain: () => notReady(),
  sendAssets: () => notReady(),
  collaborativeExit: () => notReady(),
  collaborativeExitWithFees: () => notReady(),
  redeemNotes: () => notReady(),
  assetManager: defaultAssetManager,
  advanced: defaultAdvanced,
  bridge: defaultBridge,
  subscribeWalletEvents: () => () => {},
})

/**
 * Provider-level access to the raw runtime wallet instance.
 *
 * Per CAPACITOR.plan.md § Wallet Exposure Decision, the raw `IWallet` stays
 * internal to `WalletProvider` and is handed only to provider-level adapters
 * that genuinely need it — in practice the swap factory in `SwapsProvider`.
 * Screens must use {@link WalletContext} helpers and capability groups instead.
 */
const WalletRuntimeContext = createContext<WalletRuntimeInstance | undefined>(undefined)
export const useWalletRuntime = (): WalletRuntimeInstance | undefined => useContext(WalletRuntimeContext)

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const runtime = useRuntime()
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
  const [walletRuntime, setWalletRuntime] = useState<WalletRuntimeInstance>()
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
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const reinitInProgress = useRef(false)
  const initAbortRef = useRef<AbortController | null>(null)
  const reinitWalletRef = useRef<(() => Promise<void>) | null>(null)

  // Each init gets its own AbortSignal; lock/reset aborts the current signal
  // with 'lock-reset' so stale paths can decide whether to tear down the wallet.
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
        await initWallet({ privateKey })
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
      if (await hasMnemonic()) {
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

  // reload wallet as soon as the runtime wallet becomes available
  useEffect(() => {
    if (walletRuntime) reloadWallet().catch(consoleError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletRuntime])

  // Subscribe to runtime wallet events: PWA maps service-worker messages/status;
  // native maps SDK/resume events. Replaces the inline SW message listener,
  // status ping, and reinit-on-dead logic that used to live in this provider.
  useEffect(() => {
    if (!walletRuntime) return
    const unsubscribe = runtime.walletEvents.subscribe(walletRuntime, (event) => {
      switch (event.type) {
        case 'vtxo-update':
        case 'utxo-update':
        case 'reload-needed':
          // Debounced reload: short delay lets the indexer update its cache.
          clearTimeout(reloadTimerRef.current)
          reloadTimerRef.current = setTimeout(() => reloadWallet().catch(consoleError), 1000)
          break
        case 'status':
          setInitialized(event.walletInitialized)
          break
        case 'runtime-dead':
          reinitWalletRef.current?.()
          break
      }
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletRuntime])

  // calculate thresholdMs and next rollover
  useEffect(() => {
    if (!initialized || !vtxos || !walletRuntime) return
    const w = walletRuntime.wallet
    const computeThresholds = async () => {
      try {
        const allVtxos = await w.getVtxos({ withRecoverable: true })
        const batchLifetimeMs = await calcBatchLifetimeMs(allVtxos, new Indexer(aspInfo))
        const thresholdMs = Math.floor((batchLifetimeMs * maxPercentage) / 100)
        const nextRollover = await calcNextRollover(vtxos.spendable, w, aspInfo)
        updateWallet((prev) => ({ ...prev, nextRollover, thresholdMs }))
      } catch (err) {
        consoleError(err, 'Error computing rollover thresholds')
      }
    }
    computeThresholds()
  }, [initialized, vtxos, walletRuntime, aspInfo])

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

  const reloadWallet = async (options?: { forceRuntimeReload?: boolean }) => {
    const instance = walletRuntime
    if (!instance) return
    const swWallet = instance.wallet
    if (options?.forceRuntimeReload) {
      try {
        await instance.reload()
      } catch (err) {
        consoleError(err, 'Error forcing runtime reload')
      }
    }
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

  const buildSettlementConfig = (): WalletRuntimeCreateParams['settlementConfig'] => ({
    vtxoThreshold: wallet.thresholdMs ? Math.floor(wallet.thresholdMs / 1000) : 1,
  })

  /**
   * Create the runtime wallet via the shell-provided factory and commit it to
   * provider state. Keeps the abort-session semantics that let a lock/reset
   * happening mid-init tear the wallet down (lock-reset) or simply abandon a
   * superseded init (init).
   */
  const initRuntimeWallet = async (params: WalletRuntimeCreateParams): Promise<boolean> => {
    const signal = startInitSession()

    let instance: WalletRuntimeInstance
    try {
      instance = await runtime.walletFactory.create(params)
    } catch (err) {
      if (signal.aborted) return false
      throw err
    }

    // Single checkpoint before any state/listener commits.
    if (signal.aborted) {
      try {
        if (signal.reason === 'lock-reset') await instance.clear()
        else await instance.dispose()
      } catch (err) {
        consoleError(err, 'Error tearing down aborted wallet init')
      }
      return false
    }

    const { walletInitialized } = await instance.getStatus()

    setWalletRuntime(instance)
    setVtxoManager(instance.vtxoManager)
    setInitialized(walletInitialized)

    // Cancel any pending reload from a previous wallet instance
    clearTimeout(reloadTimerRef.current)

    // Renew expiring coins on startup (non-delegate mode only).
    // When delegation is enabled, the SDK's VtxoManager auto-delegates
    // via onContractEvent, so no wallet-side call is needed.
    if (!config.delegate) {
      instance.vtxoManager.renewVtxos().catch(() => {})
    }

    return true
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

    const didInit = await initRuntimeWallet({
      identity,
      arkServerUrl,
      esploraUrl,
      delegatorUrl,
      settlementConfig: buildSettlementConfig(),
    })
    if (!didInit) return
    updateWallet({ ...wallet, network, pubkey })
    setInitialized(true)
  }

  const unlockWallet = async (password: string) => {
    try {
      if (await hasMnemonic()) {
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
   * Reinitialize the runtime wallet in-place so runtime config changes
   * (e.g., delegate on/off) take effect without forcing a lock/unlock cycle.
   * Keeps local tx/balance state; just rebuilds the wallet with the current
   * delegatorUrl flag.
   */
  const restartWallet = async (delegateEnabled = config.delegate) => {
    const instance = walletRuntime
    if (!instance) return
    const identity = instance.wallet.identity
    const arkServerUrl = aspInfo.url
    const esploraUrl = getRestApiExplorerURL(aspInfo.network as NetworkName) ?? ''
    const delegatorUrl = delegateEnabled ? getDelegateUrlForNetwork(aspInfo.network as Network).url : undefined
    await initRuntimeWallet({
      identity,
      arkServerUrl,
      esploraUrl,
      delegatorUrl,
      settlementConfig: buildSettlementConfig(),
      skipMigration: true,
    })
  }

  // Self-heal when the runtime wallet dies (PWA: service worker became
  // unresponsive): re-run setup with the existing identity so SwapsProvider and
  // other consumers re-bind via setWalletRuntime, instead of reloading the page
  // (which would discard FlowProvider state and UI context).
  const reinitWallet = async () => {
    if (reinitInProgress.current) return
    reinitInProgress.current = true
    try {
      const instance = walletRuntime
      if (!instance) return
      const identity = instance.wallet.identity
      const arkServerUrl = aspInfo.url
      const esploraUrl = getRestApiExplorerURL(aspInfo.network as NetworkName) ?? ''
      const delegatorUrl = config.delegate ? getDelegateUrlForNetwork(aspInfo.network as Network).url : undefined
      const ok = await initRuntimeWallet({
        identity,
        arkServerUrl,
        esploraUrl,
        delegatorUrl,
        settlementConfig: buildSettlementConfig(),
        skipMigration: true,
      })
      if (!ok) return
    } catch (err) {
      consoleError(err, 'Wallet reinit failed; falling back to full reload')
      window.location.reload()
    } finally {
      reinitInProgress.current = false
    }
  }

  useEffect(() => {
    reinitWalletRef.current = reinitWallet
  })

  const lockWallet = async () => {
    abortInitSession()
    const instance = walletRuntime
    if (!instance) throw new Error('Wallet not initialized')
    clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = undefined
    await instance.clear()
    setWalletRuntime(undefined)
    setVtxoManager(undefined)
    setAuthState('locked')
    setInitialized(false)
    setDataReady(false)
    hasLoadedOnce.current = false
  }

  const resetWallet = async () => {
    abortInitSession()
    clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = undefined
    const instance = walletRuntime
    if (!instance) throw new Error('Wallet not initialized')
    await clearStorage()
    await instance.clear()
    await instance.resetStorage()
    setWalletRuntime(undefined)
    setVtxoManager(undefined)
    setDataReady(false)
    hasLoadedOnce.current = false
  }

  const settlePreconfirmed = async () => {
    const instance = walletRuntime
    if (!instance || !vtxoManager) throw new Error('Wallet not initialized')
    await settleVtxos(instance.wallet, vtxoManager, aspInfo.dust, wallet.thresholdMs)
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
    const instance = walletRuntime
    if (!instance) return true
    try {
      const { walletInitialized } = await instance.getStatus()
      return !walletInitialized
    } catch {
      return true
    }
  }

  // Runtime-neutral helpers. They throw if called before the wallet is ready;
  // screens gate on `walletReady`/`dataReady` before invoking them.
  const requireWallet = (): IWallet => {
    if (!walletRuntime) return notReady()
    return walletRuntime.wallet
  }
  const requireVtxoManager = (): IVtxoManager => {
    if (!vtxoManager) return notReady()
    return vtxoManager
  }

  const getReceivingAddresses = () => getReceivingAddressesFor(requireWallet())
  const getAvailableBalance = async () => (await requireWallet().getBalance()).available
  const sendOffchain = (amount: number, address: string) => sendOffChain(requireWallet(), amount, address)
  const sendAssets = (address: string, assets: Asset[]) => sendAssetsFor(requireWallet(), address, assets)
  const collaborativeExit = (amount: number, address: string) => collaborativeExitFor(requireWallet(), amount, address)
  const collaborativeExitWithFees = (inputAmount: number, outputAmount: number, address: string) =>
    collaborativeExitWithFeesFor(requireWallet(), inputAmount, outputAmount, address)
  const redeemNotes = (notes: string[]) => redeemNotesFor(requireWallet(), notes)

  const assetManager = useMemo<WalletAssetActions>(
    () => ({
      getAssetDetails: (assetId) => requireWallet().assetManager.getAssetDetails(assetId),
      issue: (params) => requireWallet().assetManager.issue(params),
      reissue: (params) => requireWallet().assetManager.reissue(params),
      burn: (params) => requireWallet().assetManager.burn(params),
      waitForAssetUpdate: async (options) => {
        if (!walletRuntime) return notReady()
        await runtime.walletEvents.waitForNextUpdate(walletRuntime, options)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletRuntime],
  )

  const advanced = useMemo<WalletAdvancedActions>(
    () => ({
      getAllVtxos: (filter) => requireWallet().getVtxos(filter),
      getBoardingUtxos: () => requireWallet().getBoardingUtxos(),
      getVtxoManager: async () => requireVtxoManager(),
      getContractManager: () => requireWallet().getContractManager(),
      getDelegateManager: () => requireWallet().getDelegateManager(),
      getInputsToSettle: () => getInputsToSettle(requireWallet(), requireVtxoManager(), wallet.thresholdMs),
      settleInputs: async () => {
        await settleVtxos(requireWallet(), requireVtxoManager(), aspInfo.dust, wallet.thresholdMs)
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletRuntime, vtxoManager, wallet.thresholdMs, aspInfo.dust],
  )

  const subscribeWalletEvents = (handler: (event: WalletRuntimeEvent) => void): Unsubscribe => {
    if (!walletRuntime) return () => {}
    return runtime.walletEvents.subscribe(walletRuntime, handler)
  }

  const bridge = useMemo<WalletBridgeActions>(
    () => ({
      getCompressedPublicKey: () => requireWallet().identity.compressedPublicKey(),
      signTransaction: (tx) => requireWallet().identity.sign(tx),
      signMessage: (messageHash, type) => requireWallet().identity.signMessage(messageHash, type),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletRuntime],
  )

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
        walletReady: !!walletRuntime,
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
        getReceivingAddresses,
        getAvailableBalance,
        sendOffchain,
        sendAssets,
        collaborativeExit,
        collaborativeExitWithFees,
        redeemNotes,
        assetManager,
        advanced,
        bridge,
        subscribeWalletEvents,
      }}
    >
      <WalletRuntimeContext.Provider value={walletRuntime}>{children}</WalletRuntimeContext.Provider>
    </WalletContext.Provider>
  )
}
