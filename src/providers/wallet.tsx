import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react'
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
import {
  ArkNote,
  ServiceWorkerWallet,
  NetworkName,
  SingleKey,
  ReadonlySingleKey,
  ServiceWorkerReadonlyWallet,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { ConfigContext } from './config'
import { maxPercentage } from '../lib/constants'
import * as secp from '@noble/secp256k1'
import { hexToBytes } from '@noble/hashes/utils.js'

const WALLET_SERVICE_WORKER_PATH = '/wallet-service-worker.mjs'

const defaultWallet: Wallet = {
  network: '',
  nextRollover: 0,
}

type SvcWallet = { reader: ServiceWorkerReadonlyWallet; writer?: ServiceWorkerWallet }

interface WalletContextProps {
  initWallet: (seed: Uint8Array) => Promise<void>
  initReadonlyWallet: (pubkey: Uint8Array) => Promise<void>
  lockWallet: () => Promise<void>
  resetWallet: () => Promise<void>
  settlePreconfirmed: () => Promise<void>
  updateWallet: (w: Wallet | ((prev: Wallet) => Wallet)) => void
  isLocked: () => Promise<boolean>
  reloadWallet: () => Promise<void>
  wallet: Wallet
  walletLoaded: boolean
  svcWallet: SvcWallet | undefined
  txs: Tx[]
  vtxos: { spendable: Vtxo[]; spent: Vtxo[] }
  balance: number
  initialized?: boolean
}

export const WalletContext = createContext<WalletContextProps>({
  initWallet: () => Promise.resolve(),
  initReadonlyWallet: () => Promise.resolve(),
  lockWallet: () => Promise.resolve(),
  resetWallet: () => Promise.resolve(),
  settlePreconfirmed: () => Promise.resolve(),
  updateWallet: () => {},
  reloadWallet: () => Promise.resolve(),
  wallet: defaultWallet,
  walletLoaded: false,
  svcWallet: undefined,
  isLocked: () => Promise.resolve(true),
  balance: 0,
  txs: [],
  vtxos: { spendable: [], spent: [] },
})

type InitSvcWorkerWalletParams = {
  arkServerUrl: string
  esploraUrl: string
  privateKey?: string
  publicKey?: string
  retryCount?: number
  maxRetries?: number
}
const initSvcWorkerWallet = async ({
  arkServerUrl,
  esploraUrl,
  privateKey,
  publicKey,
  retryCount = 0,
  maxRetries = 5,
}: InitSvcWorkerWalletParams): Promise<SvcWallet> => {
  const config = {
    serviceWorkerPath: WALLET_SERVICE_WORKER_PATH,
    arkServerUrl,
    esploraUrl,
  }
  try {
    // create service worker wallet
    if (privateKey) {
      const writer = await ServiceWorkerWallet.setup({
        ...config,
        identity: SingleKey.fromHex(privateKey),
      })
      return { reader: writer, writer }
    }
    if (publicKey) {
      const reader = await ServiceWorkerReadonlyWallet.setup({
        ...config,
        identity: ReadonlySingleKey.fromPublicKey(hexToBytes(publicKey)),
      })
      return { reader }
    }
    throw new Error('No private key or public key provided')
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('Service worker activation timed out')
    if (isTimeout && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000
      const attempt = retryCount + 1
      consoleError(
        new Error(`Service worker activation timed out, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`),
        'Service worker activation retry',
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
      return initSvcWorkerWallet({
        arkServerUrl,
        esploraUrl,
        privateKey,
        publicKey,
        retryCount: attempt,
        maxRetries,
      })
    }
    if (isTimeout) {
      throw new Error('Service worker activation timed out after maximum retries')
    }
    // re-throw other errors
    throw err
  }
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { navigate } = useContext(NavigationContext)
  const { setNoteInfo, noteInfo, setDeepLinkInfo, deepLinkInfo } = useContext(FlowContext)
  const { notifyTxSettled } = useContext(NotificationsContext)

  const [walletStates, setWalletStates] = useState<{
    txs: Tx[]
    vtxos: { spendable: Vtxo[]; spent: Vtxo[] }
    balance: number
  }>({ txs: [], vtxos: { spendable: [], spent: [] }, balance: 0 })
  const [wallet, setWallet] = useState(defaultWallet)
  const [walletLoaded, setWalletLoaded] = useState(false)
  const [initialized, setInitialized] = useState<boolean>(false)
  const [svcWallet, setSvcWallet] = useState<SvcWallet>()

  // read wallet from storage
  useEffect(() => {
    const walletFromStorage = readWalletFromStorage()
    if (walletFromStorage) setWallet(walletFromStorage)
    setWalletLoaded(true)
  }, [])

  // calculate thresholdMs and next rollover
  useEffect(() => {
    if (!initialized || !walletStates.vtxos || !svcWallet) return
    const computeThresholds = async () => {
      try {
        const allVtxos = await svcWallet.reader.getVtxos({ withRecoverable: true })
        const batchLifetimeMs = await calcBatchLifetimeMs(aspInfo, allVtxos)
        const thresholdMs = Math.floor((batchLifetimeMs * maxPercentage) / 100)
        const nextRollover = await calcNextRollover(walletStates.vtxos.spendable, svcWallet.reader, aspInfo)
        updateWallet((prev) => ({ ...prev, nextRollover, thresholdMs }))
      } catch (err) {
        consoleError(err, 'Error computing rollover thresholds')
      }
    }
    computeThresholds()
  }, [initialized, walletStates, svcWallet, aspInfo])

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
      // this is a no-op to not interfere with Connect operations
    }
  }, [initialized, noteInfo.satoshis, deepLinkInfo])

  const reloadWallet = useCallback(async () => {
    if (!svcWallet) return
    try {
      // running them in parallel can get stale data
      const txs = await getTxHistory(svcWallet.reader)
      const vtxos = await getVtxos(svcWallet.reader)
      const balance = await getBalance(svcWallet.reader)
      setWalletStates({ txs, vtxos, balance })
    } catch (err) {
      consoleError(err, 'Error reloading wallet')
      return
    }
  }, [svcWallet])

  // handle messages from the service worker
  // we listen for UTXO/VTXO updates to refresh the tx history and balance
  const handleServiceWorkerMessages = useCallback(
    (event: MessageEvent) => {
      if (event.data && ['VTXO_UPDATE', 'UTXO_UPDATE'].includes(event.data.type)) {
        if (!svcWallet) {
          consoleError('Cannot handle a message when svcWallet is not defined')
          return
        }
        reloadWallet()
        // reload again after a delay to give the indexer time to update its cache
        setTimeout(() => {
          reloadWallet()
        }, 5000)
      }
    },
    [svcWallet, reloadWallet],
  )

  // every time the SvcWallet changes, refresh the state and rewire listeners
  useEffect(() => {
    if (!svcWallet) {
      return
    }
    if (initialized) {
      // there is a race condition where we may update the UI before some transactions are available
      setTimeout(() => reloadWallet(), 250)
    }
    // ping the service worker wallet status every 1 second
    const statusPollingTimer = setInterval(async () => {
      try {
        if (svcWallet) {
          const { walletInitialized } = await svcWallet.reader.getStatus()
          setInitialized(walletInitialized)
        }
      } catch (err) {
        consoleError(err, 'Error pinging wallet status')
      }
    }, 1_000)

    if (svcWallet?.writer) {
      // renew expiring coins on startup
      renewCoins(svcWallet.writer, aspInfo.dust, wallet.thresholdMs).catch(() => {})
    }

    // listen for messages from the service worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessages)
    return () => {
      clearInterval(statusPollingTimer)
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessages)
    }
  }, [svcWallet, handleServiceWorkerMessages, initialized])

  const setupSvcWorker = async (params: InitSvcWorkerWalletParams) => {
    try {
      // create service worker wallet
      const newSvcWallet = await initSvcWorkerWallet(params)
      // check if the service worker wallet is initialized
      const { walletInitialized } = await newSvcWallet.reader.getStatus()
      setInitialized(walletInitialized)
      setSvcWallet(newSvcWallet)
    } catch (err) {
      console.error(err)
      if (err instanceof Error && err.message.includes('Service worker activation timed out')) {
        consoleError(err, 'Service worker activation failed')
        return
      }
      // re-throw other errors
      throw err
    }
  }

  const initWallet = async (privateKey: Uint8Array) => {
    const arkServerUrl = aspInfo.url
    const network = aspInfo.network as NetworkName
    const esploraUrl = getRestApiExplorerURL(network) ?? ''
    const pubkey = hex.encode(secp.getPublicKey(privateKey))
    updateConfig({ ...config, pubkey })
    await setupSvcWorker({
      privateKey: hex.encode(privateKey),
      arkServerUrl,
      esploraUrl,
    })
    updateWallet({ ...wallet, network, pubkey, isReadonly: false })
  }

  const initReadonlyWallet = async (publicKey: Uint8Array) => {
    const pubkey = hex.encode(publicKey)
    const arkServerUrl = aspInfo.url
    const network = aspInfo.network as NetworkName
    const esploraUrl = getRestApiExplorerURL(network) ?? ''
    updateConfig({ ...config, pubkey })
    await setupSvcWorker({
      publicKey: pubkey,
      arkServerUrl,
      esploraUrl,
    })
    updateWallet({ ...wallet, network, pubkey, isReadonly: true })
  }

  const lockWallet = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await svcWallet.reader.clear()
    setInitialized(false)
  }

  const resetWallet = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await clearStorage()
    await svcWallet.reader.clear()
    await svcWallet.reader.contractRepository.clearContractData()
  }

  const settlePreconfirmed = async () => {
    if (!svcWallet?.writer) throw new Error('Service worker not initialized')
    await settleVtxos(svcWallet.writer, aspInfo.dust, wallet.thresholdMs)
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
      const { walletInitialized } = await svcWallet.reader.getStatus()
      return !walletInitialized
    } catch {
      return true
    }
  }

  return (
    <WalletContext.Provider
      value={{
        initWallet,
        initReadonlyWallet,
        isLocked,
        initialized,
        resetWallet,
        settlePreconfirmed,
        updateWallet,
        wallet,
        walletLoaded,
        svcWallet,
        lockWallet,
        txs: walletStates.txs,
        balance: walletStates.balance,
        reloadWallet,
        vtxos: walletStates.vtxos,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
