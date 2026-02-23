import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import {
  ArkadeChainSwap,
  ArkadeLightning,
  ArkToBtcResponse,
  BoltzSwapProvider,
  BtcToArkResponse,
  ChainFeesResponse,
  FeesResponse,
  Network,
  PendingChainSwap,
  PendingReverseSwap,
  PendingSubmarineSwap,
  PendingSwap,
  setLogger,
  SwapManager,
} from '@arkade-os/boltz-swap'
import { ConfigContext } from './config'
import { consoleError, consoleLog } from '../lib/logs'
import { ContractRepositoryImpl, RestArkProvider, RestIndexerProvider } from '@arkade-os/sdk'
import { sendOffChain } from '../lib/asp'
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'

const BASE_URLS: Record<Network, string | null> = {
  bitcoin: import.meta.env.VITE_BOLTZ_URL ?? 'https://api.ark.boltz.exchange',
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
  testnet: null,
}

interface SwapsContextProps {
  connected: boolean
  calcArkToBtcSwapFee: (satoshis: number) => number
  calcBtcToArkSwapFee: (satoshis: number) => number
  calcReverseSwapFee: (satoshis: number) => number
  calcSubmarineSwapFee: (satoshis: number) => number
  arkadeChainSwap: ArkadeChainSwap | null
  arkadeLightning: ArkadeLightning | null
  swapManager: SwapManager | null
  toggleConnection: () => void
  // Helper methods that delegate to arkadeChainSwap
  createArkToBtcSwap: (address: string, sats: number) => Promise<ArkToBtcResponse | null>
  createBtcToArkSwap: (sats: number) => Promise<BtcToArkResponse | null>
  payBtc: (swap: PendingChainSwap) => Promise<{ txid: string }>
  claimArk: (swap: PendingChainSwap) => Promise<void>
  claimBtc: (swap: PendingChainSwap) => Promise<void>
  refundArk: (swap: PendingChainSwap) => Promise<void>
  // Helper methods that delegate to arkadeLightning
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
  arkadeChainSwap: null,
  arkadeLightning: null,
  swapManager: null,
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

  const [arkadeChainSwap, setArkadeChainSwap] = useState<ArkadeChainSwap | null>(null)
  const [arkadeLightning, setArkadeLightning] = useState<ArkadeLightning | null>(null)
  const [arkToBtcFees, setArkToBtcFees] = useState<ChainFeesResponse | null>(null)
  const [btcToArkFees, setBtcToArkFees] = useState<ChainFeesResponse | null>(null)
  const [fees, setFees] = useState<FeesResponse | null>(null)
  const [apiUrl, setApiUrl] = useState<string | null>(null)

  const connected = config.apps.boltz.connected

  // create ArkadeLightning with SwapManager on first run with svcWallet
  useEffect(() => {
    if (!aspInfo.network || !svcWallet) return

    const baseUrl = BASE_URLS[aspInfo.network as Network]
    if (!baseUrl) return // No boltz server for this network

    setApiUrl(baseUrl)

    const network = aspInfo.network as Network
    const arkProvider = new RestArkProvider(aspInfo.url)
    const swapProvider = new BoltzSwapProvider({ apiUrl: baseUrl, network })
    const indexerProvider = new RestIndexerProvider(aspInfo.url)

    const lightningInstance = new ArkadeLightning({
      wallet: svcWallet,
      arkProvider,
      swapProvider,
      indexerProvider,
      // Enable SwapManager with auto-start when boltz is connected
      swapManager: config.apps.boltz.connected,
    })

    const chainSwapInstance = new ArkadeChainSwap({
      wallet: svcWallet,
      arkProvider,
      swapProvider,
      indexerProvider,
      // Enable SwapManager with auto-start when boltz is connected
      swapManager: config.apps.boltz.connected,
    })

    setLogger({
      log: (...args: unknown[]) => consoleLog(...args),
      error: (...args: unknown[]) => consoleError(args[0], args.slice(1).join(' ')),
      warn: (...args: unknown[]) => consoleLog(...args),
    })

    setArkadeLightning(lightningInstance)
    setArkadeChainSwap(chainSwapInstance)

    // Cleanup on unmount
    return () => {
      lightningInstance.dispose().catch(consoleError)
      chainSwapInstance.dispose().catch(consoleError)
    }
  }, [aspInfo, svcWallet, config.apps.boltz.connected])

  // fetch fees when arkadeLightning is ready
  useEffect(() => {
    if (!arkadeLightning) return
    arkadeLightning
      .getFees()
      .then(setFees)
      .catch((err) => consoleError(err, 'Failed to fetch fees'))
  }, [arkadeLightning])

  // fetch chain fees when arkadeChainSwap is ready
  useEffect(() => {
    if (!arkadeChainSwap) return
    arkadeChainSwap
      .getFees('ARK', 'BTC')
      .then(setArkToBtcFees)
      .catch((err) => consoleError(err, 'Failed to fetch ARK to BTC fees'))
    arkadeChainSwap
      .getFees('BTC', 'ARK')
      .then(setBtcToArkFees)
      .catch((err) => consoleError(err, 'Failed to fetch BTC to ARK fees'))
  }, [arkadeChainSwap])

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

  // Helper methods that delegate to arkadeChainSwap
  const createArkToBtcSwap = async (btcAddress: string, sats: number): Promise<ArkToBtcResponse | null> => {
    if (!arkadeChainSwap) return null
    return arkadeChainSwap.arkToBtc({ btcAddress, receiverLockAmount: sats })
  }

  const createBtcToArkSwap = async (sats: number): Promise<BtcToArkResponse | null> => {
    if (!arkadeChainSwap || !svcWallet) return null
    return arkadeChainSwap.btcToArk({ senderLockAmount: sats })
  }

  const claimArk = async (swap: PendingChainSwap): Promise<void> => {
    if (!arkadeChainSwap) return
    await arkadeChainSwap.claimArk(swap)
  }

  const claimBtc = async (swap: PendingChainSwap): Promise<void> => {
    if (!arkadeChainSwap) return
    await arkadeChainSwap.claimBtc(swap)
  }

  const refundArk = async (swap: PendingChainSwap): Promise<void> => {
    if (!arkadeChainSwap) return
    await arkadeChainSwap.refundArk(swap)
  }

  const payBtc = async (pendingSwap: PendingChainSwap): Promise<{ txid: string }> => {
    if (!arkadeChainSwap || !svcWallet) throw new Error('Chain swap not initialized')
    if (!pendingSwap) throw new Error('No pending swap found')
    if (!pendingSwap.response.lockupDetails.lockupAddress) throw new Error('No swap address found')
    if (!pendingSwap.response.lockupDetails.amount) throw new Error('No swap amount found')

    const satoshis = pendingSwap.response.lockupDetails.amount
    const swapAddress = pendingSwap.response.lockupDetails.lockupAddress

    const txid = await sendOffChain(svcWallet, satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      return await arkadeChainSwap.waitAndClaimBtc(pendingSwap)
    } catch (e: unknown) {
      consoleError(e, 'Swap failed')
      throw new Error('Swap failed')
    }
  }

  // Helper methods that delegate to arkadeLightning
  const createSubmarineSwap = async (invoice: string): Promise<PendingSubmarineSwap | null> => {
    if (!arkadeLightning) return null
    return arkadeLightning.createSubmarineSwap({ invoice })
  }

  const createReverseSwap = async (sats: number): Promise<PendingReverseSwap | null> => {
    if (!arkadeLightning) return null
    return arkadeLightning.createReverseSwap({ amount: sats, description: 'Lightning Invoice' })
  }

  const claimVHTLC = async (swap: PendingReverseSwap): Promise<void> => {
    if (!arkadeLightning) return
    await arkadeLightning.claimVHTLC(swap)
  }

  const refundVHTLC = async (swap: PendingSubmarineSwap): Promise<void> => {
    if (!arkadeLightning) return
    await arkadeLightning.refundVHTLC(swap)
  }

  const payInvoice = async (pendingSwap: PendingSubmarineSwap): Promise<{ txid: string; preimage: string }> => {
    if (!arkadeLightning || !svcWallet) throw new Error('Lightning not initialized')
    if (!pendingSwap) throw new Error('No pending swap found')
    if (!pendingSwap.response.address) throw new Error('No swap address found')
    if (!pendingSwap.response.expectedAmount) throw new Error('No swap amount found')

    const satoshis = pendingSwap.response.expectedAmount
    const swapAddress = pendingSwap.response.address

    const txid = await sendOffChain(svcWallet, satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      const { preimage } = await arkadeLightning.waitForSwapSettlement(pendingSwap)
      return { txid, preimage }
    } catch (e: unknown) {
      consoleError(e, 'Swap failed')
      throw new Error('Swap failed')
    }
  }

  const getSwapHistory = async (): Promise<PendingSwap[]> => {
    const getLightningHistory = arkadeLightning ? arkadeLightning.getSwapHistory() : Promise.resolve([])
    const getChainHistory = arkadeChainSwap ? arkadeChainSwap.getSwapHistory() : Promise.resolve([])
    const [lightningHistory, chainHistory] = await Promise.all([getLightningHistory, getChainHistory])
    return [...lightningHistory, ...chainHistory].sort((a, b) => b.createdAt - a.createdAt)
  }

  const getApiUrl = (): string | null => apiUrl

  const restoreSwaps = async (): Promise<number> => {
    if (!arkadeLightning) return 0

    // Counter for restored swaps
    let counter = 0

    // Restore swaps from Boltz endpoint
    let reverseSwaps: PendingReverseSwap[] = []
    let submarineSwaps: PendingSubmarineSwap[] = []
    try {
      const result = await arkadeLightning.restoreSwaps()
      reverseSwaps = result.reverseSwaps
      submarineSwaps = result.submarineSwaps
    } catch (err) {
      consoleError(err, 'Error restoring swaps from Boltz:')
      return 0
    }
    if (reverseSwaps.length === 0 && submarineSwaps.length === 0) return 0

    // Get existing swap history to avoid duplicates
    const history = await arkadeLightning.getSwapHistory()
    const historyIds = new Set(history.map((s) => s.response.id))

    // Save new swaps to IndexedDB
    const storage = new IndexedDBStorageAdapter('arkade-service-worker')
    const contractRepo = new ContractRepositoryImpl(storage)

    for (const swap of reverseSwaps) {
      if (!historyIds.has(swap.response.id)) {
        try {
          await contractRepo.saveToContractCollection('reverseSwaps', swap, 'id')
          counter++
        } catch (err) {
          consoleError(err, `Failed to save reverse swap ${swap.response.id}`)
        }
      }
    }

    for (const swap of submarineSwaps) {
      if (!historyIds.has(swap.response.id)) {
        try {
          await contractRepo.saveToContractCollection('submarineSwaps', swap, 'id')
          counter++
        } catch (err) {
          consoleError(err, `Failed to save submarine swap ${swap.response.id}`)
        }
      }
    }

    return counter
  }

  const swapManager = arkadeLightning?.getSwapManager() ?? arkadeChainSwap?.getSwapManager() ?? null

  return (
    <SwapsContext.Provider
      value={{
        connected,
        arkadeChainSwap,
        arkadeLightning,
        swapManager,
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
