import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import {
  ArkadeLightning,
  BoltzSwapProvider,
  FeesResponse,
  Network,
  PendingReverseSwap,
  PendingSubmarineSwap,
  setLogger,
  SwapManager,
} from '@arkade-os/boltz-swap'
import { ConfigContext } from './config'
import { consoleError, consoleLog } from '../lib/logs'
import { ContractRepositoryImpl, RestArkProvider, RestIndexerProvider } from '@arkade-os/sdk'
import { sendOffChain } from '../lib/asp'
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
import { PendingSwap } from '../lib/types'

const BASE_URLS: Record<Network, string | null> = {
  bitcoin: import.meta.env.VITE_BOLTZ_URL ?? 'https://api.ark.boltz.exchange',
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
  testnet: null,
}

interface LightningContextProps {
  connected: boolean
  calcSubmarineSwapFee: (satoshis: number) => number
  calcReverseSwapFee: (satoshis: number) => number
  arkadeLightning: ArkadeLightning | null
  swapManager: SwapManager | null
  toggleConnection: () => void
  // Helper methods that delegate to arkadeLightning
  createSubmarineSwap: (invoice: string) => Promise<PendingSubmarineSwap | null>
  createReverseSwap: (sats: number) => Promise<PendingReverseSwap | null>
  claimVHTLC: (swap: PendingReverseSwap) => Promise<void>
  refundVHTLC: (swap: PendingSubmarineSwap) => Promise<void>
  payInvoice: (swap: PendingSubmarineSwap) => Promise<{ txid: string; preimage: string }>
  getSwapHistory: () => Promise<PendingSwap[]>
  getFees: () => Promise<FeesResponse | null>
  getApiUrl: () => string | null
  restoreSwaps: () => Promise<number>
}

export const LightningContext = createContext<LightningContextProps>({
  connected: false,
  arkadeLightning: null,
  swapManager: null,
  toggleConnection: () => {},
  calcReverseSwapFee: () => 0,
  calcSubmarineSwapFee: () => 0,
  createSubmarineSwap: async () => null,
  createReverseSwap: async () => null,
  claimVHTLC: async () => {},
  refundVHTLC: async () => {},
  payInvoice: async () => {
    throw new Error('Lightning not initialized')
  },
  getSwapHistory: async () => [],
  getFees: async () => null,
  getApiUrl: () => null,
  restoreSwaps: async () => 0,
})

export const LightningProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const { config, updateConfig, backupConfig } = useContext(ConfigContext)

  const [arkadeLightning, setArkadeLightning] = useState<ArkadeLightning | null>(null)
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

    const instance = new ArkadeLightning({
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
    setArkadeLightning(instance)

    // Cleanup on unmount
    return () => {
      instance.dispose().catch(consoleError)
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

  const setConnected = (value: boolean, backup: boolean) => {
    const newConfig = { ...config }
    newConfig.apps.boltz.connected = value
    updateConfig(newConfig)
    if (backup) backupConfig(newConfig)
  }

  const calcSubmarineSwapFee = (satoshis: number): number => {
    if (!satoshis || !fees) return 0
    const { percentage, minerFees } = fees.submarine
    return Math.ceil((satoshis * percentage) / 100 + minerFees)
  }

  const calcReverseSwapFee = (satoshis: number): number => {
    if (!satoshis || !fees) return 0
    const { percentage, minerFees } = fees.reverse
    return Math.ceil((satoshis * percentage) / 100 + minerFees.claim + minerFees.lockup)
  }

  const toggleConnection = () => setConnected(!connected, true)

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
      const refundable = typeof (e as any)?.isRefundable === 'boolean' ? (e as any).isRefundable : false
      if (!refundable) throw new Error('Swap failed: VHTLC not refundable')
      try {
        await arkadeLightning.refundVHTLC(pendingSwap)
      } catch (error) {
        consoleError(error, `Failed to refund swap ${pendingSwap.response.id}`)
        throw new Error('Swap failed: VHTLC refund failed')
      }
      throw new Error('Swap failed: VHTLC refunded')
    }
  }

  const getSwapHistory = async (): Promise<PendingSwap[]> => {
    if (!arkadeLightning) return []
    return arkadeLightning.getSwapHistory()
  }

  const getFees = async (): Promise<FeesResponse | null> => {
    if (!arkadeLightning) return null
    return arkadeLightning.getFees()
  }

  const getApiUrl = (): string | null => apiUrl

  const restoreSwaps = async (): Promise<number> => {
    if (!arkadeLightning) return 0

    // Counter for restored swaps
    let counter = 0

    // Restore swaps from Boltz endpoint
    const { reverseSwaps, submarineSwaps } = await arkadeLightning.restoreSwaps()
    if (reverseSwaps.length === 0 && submarineSwaps.length === 0) return 0

    // Get existing swap history to avoid duplicates
    const history = await arkadeLightning.getSwapHistory()
    const historyIds = new Set(history.map((s) => s.response.id))

    // Save new swaps to IndexedDB
    const storage = new IndexedDBStorageAdapter('arkade-service-worker')
    const contractRepo = new ContractRepositoryImpl(storage)

    for (const swap of reverseSwaps) {
      if (!historyIds.has(swap.response.id)) {
        await contractRepo.saveToContractCollection('reverseSwaps', swap, 'id')
        counter++
      }
    }

    for (const swap of submarineSwaps) {
      if (!historyIds.has(swap.response.id)) {
        await contractRepo.saveToContractCollection('submarineSwaps', swap, 'id')
        counter++
      }
    }

    return counter
  }

  const swapManager = arkadeLightning?.getSwapManager() ?? null

  return (
    <LightningContext.Provider
      value={{
        connected,
        arkadeLightning,
        swapManager,
        toggleConnection,
        calcReverseSwapFee,
        calcSubmarineSwapFee,
        createSubmarineSwap,
        createReverseSwap,
        claimVHTLC,
        refundVHTLC,
        payInvoice,
        getSwapHistory,
        getFees,
        getApiUrl,
        restoreSwaps,
      }}
    >
      {children}
    </LightningContext.Provider>
  )
}
