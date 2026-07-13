import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { AspContext } from './asp'
import { WalletContext, useWalletRuntime } from './wallet'
import {
  ArkToBtcResponse,
  BtcToArkResponse,
  ChainFeesResponse,
  FeesResponse,
  Network,
  BoltzChainSwap,
  BoltzReverseSwap,
  BoltzSubmarineSwap,
  BoltzSwap,
  setLogger,
  SwapManagerClient,
} from '@arkade-os/boltz-swap'
import { ConfigContext } from './config'
import { consoleError, consoleLog } from '../lib/logs'
import { fromRuntimeEnv } from '../lib/constants'
import { ArkAddress, RestIndexerProvider } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { useRuntime } from '../runtime/RuntimeContext'
import { SwapRuntimeClient } from '../runtime/types'

const BASE_URLS: Record<Network, string | null> = {
  bitcoin: fromRuntimeEnv(import.meta.env.VITE_BOLTZ_URL) ?? null,
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
  testnet: null,
}

interface SwapsContextProps {
  connected: boolean
  arkadeSwaps: SwapRuntimeClient | null
  swapManager: SwapManagerClient | null
  swapsInitError: string | null
  toggleConnection: () => void
  // Helper methods for chain swaps
  calcArkToBtcSwapFee: (satoshis: number) => number
  calcBtcToArkSwapFee: (satoshis: number) => number
  createArkToBtcSwap: (address: string, sats: number) => Promise<ArkToBtcResponse | null>
  createBtcToArkSwap: (sats: number) => Promise<BtcToArkResponse | null>
  payBtc: (swap: BoltzChainSwap) => Promise<{ txid: string }>
  claimArk: (swap: BoltzChainSwap) => Promise<void>
  claimBtc: (swap: BoltzChainSwap) => Promise<void>
  refundArk: (swap: BoltzChainSwap) => Promise<void>
  // Helper methods for lightning swaps
  calcReverseSwapFee: (satoshis: number) => number
  calcSubmarineSwapFee: (satoshis: number) => number
  createSubmarineSwap: (invoice: string) => Promise<BoltzSubmarineSwap | null>
  createReverseSwap: (sats: number) => Promise<BoltzReverseSwap | null>
  claimVHTLC: (swap: BoltzReverseSwap) => Promise<void>
  refundVHTLC: (swap: BoltzSubmarineSwap) => Promise<void>
  payInvoice: (swap: BoltzSubmarineSwap) => Promise<{ txid: string }>
  // Other helper methods
  getSwapHistory: () => Promise<BoltzSwap[]>
  restoreSwaps: () => Promise<number>
  getApiUrl: () => string | null
}

export const SwapsContext = createContext<SwapsContextProps>({
  connected: false,
  arkadeSwaps: null,
  swapManager: null,
  swapsInitError: null,
  toggleConnection: () => {},
  calcArkToBtcSwapFee: () => 0,
  calcBtcToArkSwapFee: () => 0,
  calcReverseSwapFee: () => 0,
  calcSubmarineSwapFee: () => 0,
  createArkToBtcSwap: async () => null,
  createBtcToArkSwap: async () => null,
  createReverseSwap: async () => null,
  createSubmarineSwap: async () => null,
  claimArk: async () => {},
  claimBtc: async () => {},
  claimVHTLC: async () => {},
  refundVHTLC: async () => {},
  refundArk: async () => {},
  payBtc: async () => {
    throw new Error('Chain swap not initialized')
  },
  payInvoice: async () => {
    throw new Error('Lightning not initialized')
  },
  getSwapHistory: async () => [],
  getApiUrl: () => null,
  restoreSwaps: async () => 0,
})

export const SwapsProvider = ({ children }: { children: ReactNode }) => {
  const runtime = useRuntime()
  const { aspInfo } = useContext(AspContext)
  const { sendOffchain } = useContext(WalletContext)
  const walletRuntime = useWalletRuntime()
  const { config, updateConfig, backupConfig } = useContext(ConfigContext)

  const [arkToBtcFees, setArkToBtcFees] = useState<ChainFeesResponse | null>(null)
  const [btcToArkFees, setBtcToArkFees] = useState<ChainFeesResponse | null>(null)
  const [arkadeSwaps, setArkadeSwaps] = useState<SwapRuntimeClient | null>(null)
  const [swapsInitError, setSwapsInitError] = useState<string | null>(null)
  const [fees, setFees] = useState<FeesResponse | null>(null)
  const [apiUrl, setApiUrl] = useState<string | null>(null)

  const connected = config.apps.boltz.connected

  // create the swap client on first run with the runtime wallet
  useEffect(() => {
    if (!aspInfo.network || !walletRuntime) return

    const baseUrl = BASE_URLS[aspInfo.network as Network]
    if (!baseUrl) {
      // No Boltz server for this network: signal unavailability so consumers can
      // distinguish "never coming" from "still loading" and degrade gracefully
      // (onboarding gate, Receive/QrCode, lnurl all key off swapsInitError)
      // instead of waiting forever for a swap client that is never created.
      setArkadeSwaps(null)
      setSwapsInitError('Swaps are not available for this network')
      return
    }

    setApiUrl(baseUrl)

    const network = aspInfo.network as Network

    let disposeArkadeSwaps: (() => Promise<void>) | null = null
    let cancelled = false

    runtime.swaps
      .create({
        wallet: walletRuntime.wallet,
        serviceWorker: walletRuntime.serviceWorker,
        network,
        arkServerUrl: aspInfo.url,
        apiUrl: baseUrl,
        swapManager: config.apps.boltz.connected,
      })
      .then((instance) => {
        if (cancelled) {
          instance.dispose().catch(consoleError)
        } else {
          disposeArkadeSwaps = () => instance.dispose().catch(consoleError)
          setSwapsInitError(null)
          setArkadeSwaps(instance)
        }
      })
      .catch((err) => {
        consoleError(err, 'Failed to initialize swaps')
        if (!cancelled) setSwapsInitError(err instanceof Error ? err.message : String(err))
      })
    setLogger({
      log: (...args: unknown[]) => consoleLog(...args),
      error: (...args: unknown[]) => consoleError(args[0], args.slice(1).join(' ')),
      warn: (...args: unknown[]) => consoleLog(...args),
    })

    // Cleanup on unmount
    return () => {
      cancelled = true
      if (disposeArkadeSwaps) disposeArkadeSwaps().catch(consoleError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo, walletRuntime, config.apps.boltz.connected])

  // fetch fees when arkadeSwaps is ready
  useEffect(() => {
    if (!arkadeSwaps) return
    arkadeSwaps
      .getFees()
      .then(setFees)
      .catch((err) => consoleError(err, 'Failed to fetch fees'))
    arkadeSwaps
      .getFees('ARK', 'BTC')
      .then((res) => setArkToBtcFees(res))
      .catch((err) => consoleError(err, 'Failed to fetch ARK to BTC fees'))
    arkadeSwaps
      .getFees('BTC', 'ARK')
      .then((res) => setBtcToArkFees(res))
      .catch((err) => consoleError(err, 'Failed to fetch BTC to ARK fees'))
  }, [arkadeSwaps])

  // Native-only: nudge the SDK SwapManager back to life on app resume.
  //
  // The SwapManager (WebSocket + polling + auto-claim/refund) is the claim
  // engine and runs independently of any screen, but it has no app-lifecycle
  // awareness — when a native app is suspended the WebView freezes its socket
  // and timers. On resume we restart it *only if its socket is actually stale*,
  // so we never interrupt a healthy session or an in-flight claim. All claiming
  // stays in the SDK; this just reconnects it promptly. The PWA is untouched
  // (its service worker already handles background claims).
  useEffect(() => {
    if (runtime.kind !== 'native-capacitor' || !arkadeSwaps) return
    const reconnectIfStale = async () => {
      try {
        const manager = arkadeSwaps.getSwapManager()
        if (!manager) return
        const { websocketConnected } = await manager.getStats()
        if (websocketConnected) return
        await arkadeSwaps.stopSwapManager()
        await arkadeSwaps.startSwapManager()
      } catch (err) {
        consoleError(err, 'Failed to refresh swap manager on resume')
      }
    }
    return runtime.lifecycle.onResume(() => {
      reconnectIfStale()
    })
  }, [runtime, arkadeSwaps])

  const setConnected = (value: boolean, backup: boolean) => {
    const newConfig = { ...config }
    newConfig.apps.boltz.connected = value
    updateConfig(newConfig)
    if (backup) backupConfig(newConfig)
  }

  const calcArkToBtcSwapFee = (satoshis: number): number => {
    if (!satoshis || !arkToBtcFees) return 0
    if (satoshis > Number.MAX_SAFE_INTEGER) throw new Error('Amount exceeds maximum allowed value')
    const { percentage, minerFees } = arkToBtcFees
    return Math.ceil((satoshis * percentage) / 100 + minerFees.server + minerFees.user.claim)
  }

  const calcBtcToArkSwapFee = (satoshis: number): number => {
    if (!satoshis || !btcToArkFees) return 0
    if (satoshis > Number.MAX_SAFE_INTEGER) throw new Error('Amount exceeds maximum allowed value')
    const { percentage, minerFees } = btcToArkFees
    return Math.ceil((satoshis * percentage) / 100 + minerFees.server + minerFees.user.claim)
  }

  const calcReverseSwapFee = (satoshis: number): number => {
    if (!satoshis || !fees) return 0
    if (satoshis > Number.MAX_SAFE_INTEGER) throw new Error('Amount exceeds maximum allowed value')
    const { percentage, minerFees } = fees.reverse
    return Math.ceil((satoshis * percentage) / 100 + minerFees.claim + minerFees.lockup)
  }

  const calcSubmarineSwapFee = (satoshis: number): number => {
    if (!satoshis || !fees) return 0
    if (satoshis > Number.MAX_SAFE_INTEGER) throw new Error('Amount exceeds maximum allowed value')
    const { percentage, minerFees } = fees.submarine
    return Math.ceil((satoshis * percentage) / 100 + minerFees)
  }

  const toggleConnection = () => setConnected(!connected, true)

  // Helper methods that delegate to arkadeSwaps
  const createArkToBtcSwap = async (btcAddress: string, sats: number): Promise<ArkToBtcResponse | null> => {
    if (!arkadeSwaps || !walletRuntime) return null
    return arkadeSwaps.arkToBtc({ btcAddress, receiverLockAmount: sats })
  }

  const createBtcToArkSwap = async (sats: number): Promise<BtcToArkResponse | null> => {
    if (!arkadeSwaps || !walletRuntime) return null
    return arkadeSwaps.btcToArk({ senderLockAmount: sats })
  }

  const claimArk = async (swap: BoltzChainSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.claimArk(swap)
  }

  const claimBtc = async (swap: BoltzChainSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.claimBtc(swap)
  }

  const refundArk = async (swap: BoltzChainSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.refundArk(swap)
  }

  const payBtc = async (pendingSwap: BoltzChainSwap): Promise<{ txid: string }> => {
    if (!arkadeSwaps || !walletRuntime) throw new Error('Chain swap not initialized')
    if (!pendingSwap) throw new Error('No pending swap found')
    if (!pendingSwap.response.lockupDetails.lockupAddress) throw new Error('No swap address found')
    if (!pendingSwap.response.lockupDetails.amount) throw new Error('No swap amount found')

    const satoshis = pendingSwap.response.lockupDetails.amount
    const swapAddress = pendingSwap.response.lockupDetails.lockupAddress

    // Prevent double-funding: check that the swap address has no existing VTXOs
    await assertSwapAddressUnfunded(aspInfo.url, swapAddress)

    const txid = await sendOffchain(satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      return await arkadeSwaps.waitAndClaimBtc(pendingSwap)
    } catch (e: unknown) {
      consoleError(e, 'Swap failed')
      throw new Error('Swap failed')
    }
  }

  // Helper methods that delegate to lightning swaps in arkadeSwaps
  const createSubmarineSwap = async (invoice: string): Promise<BoltzSubmarineSwap | null> => {
    if (!arkadeSwaps) return null
    return arkadeSwaps.createSubmarineSwap({ invoice })
  }

  const createReverseSwap = async (sats: number): Promise<BoltzReverseSwap | null> => {
    if (!arkadeSwaps) return null
    return arkadeSwaps.createReverseSwap({ amount: sats, description: 'Lightning Invoice' })
  }

  const claimVHTLC = async (swap: BoltzReverseSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.claimVHTLC(swap)
  }

  const refundVHTLC = async (swap: BoltzSubmarineSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.refundVHTLC(swap)
  }

  const payInvoice = async (pendingSwap: BoltzSubmarineSwap): Promise<{ txid: string }> => {
    if (!arkadeSwaps || !walletRuntime) throw new Error('Lightning not initialized')
    if (!pendingSwap) throw new Error('No pending swap found')
    if (!pendingSwap.response.address) throw new Error('No swap address found')
    if (!pendingSwap.response.expectedAmount) throw new Error('No swap amount found')

    const satoshis = pendingSwap.response.expectedAmount
    const swapAddress = pendingSwap.response.address

    // Prevent double-funding: check that the swap address has no existing VTXOs before paying
    await assertSwapAddressUnfunded(aspInfo.url, swapAddress)

    const txid = await sendOffchain(satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      // Optimistic resolution: resolves as soon as the lockup transaction is
      // observed (funds committed, swap refundable from here). Settlement keeps
      // being monitored in the background and the stored swap stays up to date.
      await arkadeSwaps.waitForSwapFunded(pendingSwap)
      return { txid }
    } catch (e: unknown) {
      consoleError(e, 'Swap failed')
      throw new Error('Swap failed')
    }
  }

  const getSwapHistory = async (): Promise<BoltzSwap[]> => {
    if (!arkadeSwaps) return []
    return await arkadeSwaps.getSwapHistory()
  }

  const getApiUrl = (): string | null => apiUrl

  const restoreSwaps = async (): Promise<number> => {
    if (!arkadeSwaps) return 0

    // Counter for restored swaps
    let counter = 0

    // Restore swaps from Boltz endpoint
    let chainSwaps: BoltzChainSwap[] = []
    let reverseSwaps: BoltzReverseSwap[] = []
    let submarineSwaps: BoltzSubmarineSwap[] = []
    try {
      const result = await arkadeSwaps.restoreSwaps()
      chainSwaps = result.chainSwaps
      reverseSwaps = result.reverseSwaps
      submarineSwaps = result.submarineSwaps
    } catch (err) {
      consoleError(err, 'Error restoring swaps from Boltz:')
      return 0
    }
    if (reverseSwaps.length === 0 && submarineSwaps.length === 0 && chainSwaps.length === 0) return 0

    // Get existing swap history to avoid duplicates
    const history = await arkadeSwaps.getSwapHistory()
    const historyIds = new Set(history.map((s) => s.response.id))

    // Save new swaps to IndexedDB

    for (const swap of reverseSwaps) {
      if (!historyIds.has(swap.response.id)) {
        try {
          await arkadeSwaps.swapRepository.saveSwap(swap)
          counter++
        } catch (err) {
          consoleError(err, `Failed to save reverse swap ${swap.response.id}`)
        }
      }
    }

    for (const swap of submarineSwaps) {
      if (!historyIds.has(swap.response.id)) {
        try {
          await arkadeSwaps.swapRepository.saveSwap(swap)
          counter++
        } catch (err) {
          consoleError(err, `Failed to save submarine swap ${swap.response.id}`)
        }
      }
    }

    for (const swap of chainSwaps) {
      if (!historyIds.has(swap.response.id)) {
        try {
          await arkadeSwaps.swapRepository.saveSwap(swap)
          counter++
        } catch (err) {
          consoleError(err, `Failed to save chain swap ${swap.response.id}`)
        }
      }
    }

    return counter
  }

  const swapManager = arkadeSwaps?.getSwapManager() ?? null

  return (
    <SwapsContext.Provider
      value={{
        connected,
        arkadeSwaps,
        swapManager,
        swapsInitError,
        toggleConnection,
        calcArkToBtcSwapFee,
        calcBtcToArkSwapFee,
        calcReverseSwapFee,
        calcSubmarineSwapFee,
        createArkToBtcSwap,
        createBtcToArkSwap,
        createSubmarineSwap,
        createReverseSwap,
        claimArk,
        claimBtc,
        claimVHTLC,
        refundArk,
        refundVHTLC,
        payBtc,
        payInvoice,
        getSwapHistory,
        getApiUrl,
        restoreSwaps,
      }}
    >
      {children}
    </SwapsContext.Provider>
  )
}

const assertSwapAddressUnfunded = async (aspUrl: string, swapAddress: string): Promise<void> => {
  const decoded = ArkAddress.decode(swapAddress)
  const script = hex.encode(decoded.pkScript)
  const indexer = new RestIndexerProvider(aspUrl)
  const { vtxos } = await indexer.getVtxos({ scripts: [script], spendableOnly: true })
  if (vtxos.length > 0) {
    throw new Error('Swap address already funded')
  }
}
