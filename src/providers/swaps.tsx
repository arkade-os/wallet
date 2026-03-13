import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import {
  ArkToBtcResponse,
  BoltzSwapProvider,
  BtcToArkResponse,
  ChainFeesResponse,
  FeesResponse,
  IndexedDbSwapRepository,
  Network,
  PendingChainSwap,
  PendingReverseSwap,
  PendingSubmarineSwap,
  PendingSwap,
  ServiceWorkerArkadeSwaps,
  setLogger,
  SwapManagerClient,
} from '@arkade-os/boltz-swap'
import { ConfigContext } from './config'
import { consoleError, consoleLog } from '../lib/logs'
import { sendOffChain } from '../lib/asp'

const BASE_URLS: Record<Network, string | null> = {
  bitcoin: import.meta.env.VITE_BOLTZ_URL ?? 'https://api.ark.boltz.exchange',
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
  testnet: null,
}

interface SwapsContextProps {
  connected: boolean
  arkadeSwaps: ServiceWorkerArkadeSwaps | null
  swapManager: SwapManagerClient | null
  swapsInitError: string | null
  toggleConnection: () => void
  // Helper methods for chain swaps
  calcArkToBtcSwapFee: (satoshis: number) => number
  calcBtcToArkSwapFee: (satoshis: number) => number
  createArkToBtcSwap: (address: string, sats: number) => Promise<ArkToBtcResponse | null>
  createBtcToArkSwap: (sats: number) => Promise<BtcToArkResponse | null>
  payBtc: (swap: PendingChainSwap) => Promise<{ txid: string }>
  claimArk: (swap: PendingChainSwap) => Promise<void>
  claimBtc: (swap: PendingChainSwap) => Promise<void>
  refundArk: (swap: PendingChainSwap) => Promise<void>
  // Helper methods for lightning swaps
  calcReverseSwapFee: (satoshis: number) => number
  calcSubmarineSwapFee: (satoshis: number) => number
  createSubmarineSwap: (invoice: string) => Promise<PendingSubmarineSwap | null>
  createReverseSwap: (sats: number) => Promise<PendingReverseSwap | null>
  claimVHTLC: (swap: PendingReverseSwap) => Promise<void>
  refundVHTLC: (swap: PendingSubmarineSwap) => Promise<void>
  payInvoice: (swap: PendingSubmarineSwap) => Promise<{ txid: string; preimage: string }>
  // Other helper methods
  getSwapHistory: () => Promise<PendingSwap[]>
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
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const { config, updateConfig, backupConfig } = useContext(ConfigContext)

  const [arkToBtcFees, setArkToBtcFees] = useState<ChainFeesResponse | null>(null)
  const [btcToArkFees, setBtcToArkFees] = useState<ChainFeesResponse | null>(null)
  const [arkadeSwaps, setArkadeSwaps] = useState<ServiceWorkerArkadeSwaps | null>(null)
  const [swapsInitError, setSwapsInitError] = useState<string | null>(null)
  const [fees, setFees] = useState<FeesResponse | null>(null)
  const [apiUrl, setApiUrl] = useState<string | null>(null)

  const connected = config.apps.boltz.connected

  // create ArkadeSwaps with SwapManager on first run with svcWallet
  useEffect(() => {
    if (!aspInfo.network || !svcWallet) return

    const baseUrl = BASE_URLS[aspInfo.network as Network]
    if (!baseUrl) return // No boltz server for this network

    setApiUrl(baseUrl)

    const network = aspInfo.network as Network
    const swapProvider = new BoltzSwapProvider({ apiUrl: baseUrl, network })

    let disposeArkadeSwaps: (() => Promise<void>) | null = null
    let cancelled = false

    ServiceWorkerArkadeSwaps.create({
      serviceWorker: svcWallet.serviceWorker,
      swapRepository: new IndexedDbSwapRepository(),
      swapProvider,
      network,
      arkServerUrl: aspInfo.url,
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
  }, [aspInfo, svcWallet, config.apps.boltz.connected])

  // fetch fees when arkadeSwaps is ready
  useEffect(() => {
    if (!arkadeSwaps) return
    arkadeSwaps
      .getFees()
      .then(setFees)
      .catch((err) => consoleError(err, 'Failed to fetch fees'))
    arkadeSwaps
      .getFees('ARK', 'BTC')
      .then(setArkToBtcFees)
      .catch((err) => consoleError(err, 'Failed to fetch ARK to BTC fees'))
    arkadeSwaps
      .getFees('BTC', 'ARK')
      .then(setBtcToArkFees)
      .catch((err) => consoleError(err, 'Failed to fetch BTC to ARK fees'))
  }, [arkadeSwaps])

  const setConnected = (value: boolean, backup: boolean) => {
    const newConfig = { ...config }
    newConfig.apps.boltz.connected = value
    updateConfig(newConfig)
    if (backup) backupConfig(newConfig)
  }

  const calcArkToBtcSwapFee = (satoshis: number): number => {
    if (!satoshis || !arkToBtcFees) return 0
    const { percentage, minerFees } = arkToBtcFees
    return Math.ceil((satoshis * percentage) / 100 + minerFees.server + minerFees.user.claim)
  }

  const calcBtcToArkSwapFee = (satoshis: number): number => {
    if (!satoshis || !btcToArkFees) return 0
    const { percentage, minerFees } = btcToArkFees
    return Math.ceil((satoshis * percentage) / 100 + minerFees.server + minerFees.user.claim)
  }

  const calcReverseSwapFee = (satoshis: number): number => {
    if (!satoshis || !fees) return 0
    const { percentage, minerFees } = fees.reverse
    return Math.ceil((satoshis * percentage) / 100 + minerFees.claim + minerFees.lockup)
  }

  const calcSubmarineSwapFee = (satoshis: number): number => {
    if (!satoshis || !fees) return 0
    const { percentage, minerFees } = fees.submarine
    return Math.ceil((satoshis * percentage) / 100 + minerFees)
  }

  const toggleConnection = () => setConnected(!connected, true)

  // Helper methods that delegate to arkadeSwaps
  const createArkToBtcSwap = async (btcAddress: string, sats: number): Promise<ArkToBtcResponse | null> => {
    if (!arkadeSwaps) return null
    return arkadeSwaps.arkToBtc({ btcAddress, receiverLockAmount: sats })
  }

  const createBtcToArkSwap = async (sats: number): Promise<BtcToArkResponse | null> => {
    if (!arkadeSwaps || !svcWallet) return null
    return arkadeSwaps.btcToArk({ senderLockAmount: sats })
  }

  const claimArk = async (swap: PendingChainSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.claimArk(swap)
  }

  const claimBtc = async (swap: PendingChainSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.claimBtc(swap)
  }

  const refundArk = async (swap: PendingChainSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.refundArk(swap)
  }

  const payBtc = async (pendingSwap: PendingChainSwap): Promise<{ txid: string }> => {
    if (!arkadeSwaps || !svcWallet) throw new Error('Chain swap not initialized')
    if (!pendingSwap) throw new Error('No pending swap found')
    if (!pendingSwap.response.lockupDetails.lockupAddress) throw new Error('No swap address found')
    if (!pendingSwap.response.lockupDetails.amount) throw new Error('No swap amount found')

    const satoshis = pendingSwap.response.lockupDetails.amount
    const swapAddress = pendingSwap.response.lockupDetails.lockupAddress

    const txid = await sendOffChain(svcWallet, satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      return await arkadeSwaps.waitAndClaimBtc(pendingSwap)
    } catch (e: unknown) {
      consoleError(e, 'Swap failed')
      throw new Error('Swap failed')
    }
  }

  // Helper methods that delegate to lightning swaps in arkadeSwaps
  const createSubmarineSwap = async (invoice: string): Promise<PendingSubmarineSwap | null> => {
    if (!arkadeSwaps) return null
    return arkadeSwaps.createSubmarineSwap({ invoice })
  }

  const createReverseSwap = async (sats: number): Promise<PendingReverseSwap | null> => {
    if (!arkadeSwaps) return null
    return arkadeSwaps.createReverseSwap({ amount: sats, description: 'Lightning Invoice' })
  }

  const claimVHTLC = async (swap: PendingReverseSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.claimVHTLC(swap)
  }

  const refundVHTLC = async (swap: PendingSubmarineSwap): Promise<void> => {
    if (!arkadeSwaps) return
    await arkadeSwaps.refundVHTLC(swap)
  }

  const payInvoice = async (pendingSwap: PendingSubmarineSwap): Promise<{ txid: string; preimage: string }> => {
    if (!arkadeSwaps || !svcWallet) throw new Error('Lightning not initialized')
    if (!pendingSwap) throw new Error('No pending swap found')
    if (!pendingSwap.response.address) throw new Error('No swap address found')
    if (!pendingSwap.response.expectedAmount) throw new Error('No swap amount found')

    const satoshis = pendingSwap.response.expectedAmount
    const swapAddress = pendingSwap.response.address

    const txid = await sendOffChain(svcWallet, satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      const { preimage } = await arkadeSwaps.waitForSwapSettlement(pendingSwap)
      return { txid, preimage }
    } catch (e: unknown) {
      consoleError(e, 'Swap failed')
      throw new Error('Swap failed')
    }
  }

  const getSwapHistory = async (): Promise<PendingSwap[]> => {
    if (!arkadeSwaps) return []
    return await arkadeSwaps.getSwapHistory()
  }

  const getApiUrl = (): string | null => apiUrl

  const restoreSwaps = async (): Promise<number> => {
    if (!arkadeSwaps) return 0

    // Counter for restored swaps
    let counter = 0

    // Restore swaps from Boltz endpoint
    let chainSwaps: PendingChainSwap[] = []
    let reverseSwaps: PendingReverseSwap[] = []
    let submarineSwaps: PendingSubmarineSwap[] = []
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
