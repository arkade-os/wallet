import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { clearStorage, readWalletFromStorage, saveWalletToStorage } from '../lib/storage'
import { NavigationContext, Pages } from './navigation'
import { getRestApiExplorerURL } from '../lib/explorers'
import { getBalance, getTxHistory, getVtxos, renewCoins, settleVtxos } from '../lib/asp'
import { AspContext } from './asp'
import { NotificationsContext } from './notifications'
import { FlowContext } from './flow'
import { arkNoteInUrl } from '../lib/arknote'
import { deepLinkInUrl } from '../lib/deepLink'
import { consoleError } from '../lib/logs'
import { Tx, Vtxo, Wallet } from '../lib/types'
import { calcBatchLifetimeMs, calcNextRollover } from '../lib/wallet'
import { ArkNote, ServiceWorkerWallet, NetworkName } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import * as secp from '@noble/secp256k1'
import { ConfigContext } from './config'
import { maxPercentage } from '../lib/constants'
import { createWallet, WalletInstance, isServiceWorkerWallet } from '../lib/walletFactory'

const defaultWallet: Wallet = {
  network: '',
  nextRollover: 0,
}

interface WalletContextProps {
  initWallet: (seed: Uint8Array) => Promise<void>
  lockWallet: () => Promise<void>
  resetWallet: () => Promise<void>
  settlePreconfirmed: () => Promise<void>
  updateWallet: (w: Wallet | ((prev: Wallet) => Wallet)) => void
  isLocked: () => Promise<boolean>
  reloadWallet: (walletInstance?: WalletInstance) => Promise<void>
  wallet: Wallet
  walletLoaded: boolean
  svcWallet: ServiceWorkerWallet | undefined // Kept for backward compatibility
  walletInstance: WalletInstance | undefined
  txs: Tx[]
  vtxos: { spendable: Vtxo[]; spent: Vtxo[] }
  balance: number
  initialized?: boolean
}

export const WalletContext = createContext<WalletContextProps>({
  initWallet: () => Promise.resolve(),
  lockWallet: () => Promise.resolve(),
  resetWallet: () => Promise.resolve(),
  settlePreconfirmed: () => Promise.resolve(),
  updateWallet: () => {},
  reloadWallet: () => Promise.resolve(),
  wallet: defaultWallet,
  walletLoaded: false,
  svcWallet: undefined,
  walletInstance: undefined,
  isLocked: () => Promise.resolve(true),
  balance: 0,
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
  const [wallet, setWallet] = useState(defaultWallet)
  const [walletLoaded, setWalletLoaded] = useState(false)
  const [initialized, setInitialized] = useState<boolean>(false)
  const [walletInstance, setWalletInstance] = useState<WalletInstance>()
  const [svcWallet, setSvcWallet] = useState<ServiceWorkerWallet>() // Kept for backward compatibility
  const [vtxos, setVtxos] = useState<{ spendable: Vtxo[]; spent: Vtxo[] }>({ spendable: [], spent: [] })

  const listeningForServiceWorker = useRef(false)
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // read wallet from storage
  useEffect(() => {
    const walletFromStorage = readWalletFromStorage()
    if (walletFromStorage) setWallet(walletFromStorage)
    setWalletLoaded(true)
  }, [])

  // cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
    }
  }, [])

  // reload wallet as soon as we have a wallet instance available
  useEffect(() => {
    if (walletInstance) reloadWallet().catch(consoleError)
  }, [walletInstance])

  // calculate thresholdMs and next rollover
  useEffect(() => {
    if (!initialized || !vtxos || !walletInstance) return
    const computeThresholds = async () => {
      try {
        const actualWallet = walletInstance.wallet
        const allVtxos = await actualWallet.getVtxos({ withRecoverable: true })
        const batchLifetimeMs = await calcBatchLifetimeMs(aspInfo, allVtxos)
        const thresholdMs = Math.floor((batchLifetimeMs * maxPercentage) / 100)
        const nextRollover = await calcNextRollover(vtxos.spendable, actualWallet, aspInfo)
        updateWallet((prev) => ({ ...prev, nextRollover, thresholdMs }))
      } catch (err) {
        consoleError(err, 'Error computing rollover thresholds')
      }
    }
    computeThresholds()
  }, [initialized, vtxos, walletInstance, aspInfo])

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
    if (!initialized) return
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
  }, [initialized, noteInfo.satoshis, deepLinkInfo])

  const reloadWallet = async (instance = walletInstance) => {
    if (!instance) return
    try {
      // Extract the actual wallet from the instance
      const actualWallet = instance.wallet
      const vtxos = await getVtxos(actualWallet)
      const txs = await getTxHistory(actualWallet)
      const balance = await getBalance(actualWallet)
      setBalance(balance)
      setVtxos(vtxos)
      setTxs(txs)
    } catch (err) {
      consoleError(err, 'Error reloading wallet')
      return
    }
  }

  const initWalletInstance = async ({
    arkServerUrl,
    esploraUrl,
    privateKey,
    network,
    retryCount = 0,
    maxRetries = 5,
  }: {
    arkServerUrl: string
    esploraUrl: string
    privateKey: string
    network: NetworkName
    retryCount?: number
    maxRetries?: number
  }) => {
    try {
      // Create wallet using factory (chooses ServiceWorker or standard based on platform)
      const instance = await createWallet(
        {
          privateKey,
          arkServerUrl,
          esploraUrl,
          network,
        },
        { retryCount, maxRetries },
      )

      setWalletInstance(instance)

      // For backward compatibility, also set svcWallet if it's a service worker wallet
      if (isServiceWorkerWallet(instance)) {
        setSvcWallet(instance.wallet)
      }

      const actualWallet = instance.wallet

      // Handle service worker messages (only for ServiceWorkerWallet)
      if (isServiceWorkerWallet(instance)) {
        // TODO: Fix event listener memory leak (pre-existing issue)
        // The handleServiceWorkerMessages function is recreated on each initWalletInstance call,
        // causing removeEventListener to fail (different function reference).
        // Solution: Use a useRef to store a stable function reference, or move this to a useEffect
        // with proper cleanup. This is a pre-existing bug that should be addressed in a separate PR.
        const handleServiceWorkerMessages = (event: MessageEvent) => {
          if (event.data && ['VTXO_UPDATE', 'UTXO_UPDATE'].includes(event.data.type)) {
            reloadWallet(instance)
            // reload again after a delay to give the indexer time to update its cache
            setTimeout(() => reloadWallet(instance), 5000)
          }
        }

        // listen for messages from the service worker
        if (listeningForServiceWorker.current) {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessages)
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessages)
        } else {
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessages)
          listeningForServiceWorker.current = true
        }

        // check if the service worker wallet is initialized
        const { walletInitialized } = await instance.wallet.getStatus()
        setInitialized(walletInitialized)

        // Clear any existing interval before creating a new one
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current)
        }

        // ping the service worker wallet status every 1 second
        statusIntervalRef.current = setInterval(async () => {
          try {
            const { walletInitialized } = await instance.wallet.getStatus()
            setInitialized(walletInitialized)
          } catch (err) {
            consoleError(err, 'Error pinging wallet status')
          }
        }, 1_000)
      } else {
        // For standard wallet, it's initialized immediately
        setInitialized(true)
      }

      // renew expiring coins on startup
      renewCoins(actualWallet, aspInfo.dust, wallet.thresholdMs).catch(() => {})
    } catch (err) {
      consoleError(err, 'Error initializing wallet')
      throw err
    }
  }

  const initWallet = async (privateKey: Uint8Array) => {
    const arkServerUrl = aspInfo.url
    const network = aspInfo.network as NetworkName
    const esploraUrl = getRestApiExplorerURL(network) ?? ''
    const pubkey = hex.encode(secp.getPublicKey(privateKey))
    updateConfig({ ...config, pubkey })
    await initWalletInstance({
      privateKey: hex.encode(privateKey),
      arkServerUrl,
      esploraUrl,
      network,
    })
    updateWallet({ ...wallet, network, pubkey })
  }

  const lockWallet = async () => {
    if (!walletInstance) throw new Error('Wallet not initialized')

    // Clear the status polling interval
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
      statusIntervalRef.current = null
    }

    // Only ServiceWorkerWallet has a clear() method
    if (isServiceWorkerWallet(walletInstance)) {
      await walletInstance.wallet.clear()
    }
    // For standard wallet, we just mark as not initialized
    // The actual keys are in memory and will be cleared when the instance is removed
    setInitialized(false)
    setWalletInstance(undefined)
    setSvcWallet(undefined)
  }

  const resetWallet = async () => {
    if (!walletInstance) throw new Error('Wallet not initialized')
    await clearStorage()

    // Clear the status polling interval
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
      statusIntervalRef.current = null
    }

    // Only ServiceWorkerWallet has these methods
    if (isServiceWorkerWallet(walletInstance)) {
      await walletInstance.wallet.clear()
      await walletInstance.wallet.contractRepository.clearContractData()
    }

    setWalletInstance(undefined)
    setSvcWallet(undefined)
  }

  const settlePreconfirmed = async () => {
    if (!walletInstance) throw new Error('Wallet not initialized')
    const actualWallet = walletInstance.wallet
    await settleVtxos(actualWallet, aspInfo.dust, wallet.thresholdMs)
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
    if (!walletInstance) return true
    try {
      // Only ServiceWorkerWallet has getStatus()
      if (isServiceWorkerWallet(walletInstance)) {
        const { walletInitialized } = await walletInstance.wallet.getStatus()
        return !walletInitialized
      }
      // For standard wallet, check if it's initialized
      return !initialized
    } catch {
      return true
    }
  }

  return (
    <WalletContext.Provider
      value={{
        initWallet,
        isLocked,
        initialized,
        resetWallet,
        settlePreconfirmed,
        updateWallet,
        wallet,
        walletLoaded,
        svcWallet,
        walletInstance,
        lockWallet,
        txs,
        balance,
        reloadWallet,
        vtxos: vtxos ?? { spendable: [], spent: [] },
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
