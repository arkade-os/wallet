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
import {
  ArkNote,
  ServiceWorkerWallet,
  ServiceWorkerReadonlyWallet,
  NetworkName,
  SingleKey,
  ReadonlySingleKey,
} from '@arkade-os/sdk'
import { hex } from '@scure/base'
import * as secp from '@noble/secp256k1'
import { ConfigContext } from './config'
import { maxPercentage } from '../lib/constants'
import { hexToBytes } from '@noble/hashes/utils.js'

const defaultWallet: Wallet = {
  network: '',
  nextRollover: 0,
}

export type WalletReader = ServiceWorkerReadonlyWallet
export type WalletWriter = ServiceWorkerWallet

interface WalletContextProps {
  initWallet: (seed: Uint8Array) => Promise<void>
  initReadonlyWallet: (pubkey: Uint8Array) => Promise<void>
  lockWallet: () => Promise<void>
  resetWallet: () => Promise<void>
  settlePreconfirmed: () => Promise<void>
  updateWallet: (w: Wallet | ((prev: Wallet) => Wallet)) => void
  isLocked: () => Promise<boolean>
  reloadWallet: (svcWallet?: ServiceWorkerReadonlyWallet) => Promise<void>
  wallet: Wallet
  walletLoaded: boolean
  walletWriter: WalletWriter | undefined
  // Guaranteed to be defined if svcWallet is defined
  walletReader: WalletReader | undefined
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
  walletWriter: undefined,
  walletReader: undefined,
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
  const [walletWriter, setWalletWriter] = useState<WalletWriter>()
  const [walletReader, setWalletReader] = useState<WalletReader>()
  const [vtxos, setVtxos] = useState<{ spendable: Vtxo[]; spent: Vtxo[] }>({ spendable: [], spent: [] })

  const listeningForServiceWorker = useRef(false)

  // read wallet from storage
  useEffect(() => {
    const walletFromStorage = readWalletFromStorage()
    if (walletFromStorage) setWallet(walletFromStorage)
    setWalletLoaded(true)
  }, [])

  // reload wallet as soon as we have a service worker wallet available
  useEffect(() => {
    if (walletReader) reloadWallet().catch(consoleError)
  }, [walletReader])

  // calculate thresholdMs and next rollover
  useEffect(() => {
    if (!initialized || !vtxos || !walletReader) return
    const computeThresholds = async () => {
      try {
        const allVtxos = await walletReader.getVtxos({ withRecoverable: true })
        const batchLifetimeMs = await calcBatchLifetimeMs(aspInfo, allVtxos)
        const thresholdMs = Math.floor((batchLifetimeMs * maxPercentage) / 100)
        const nextRollover = await calcNextRollover(vtxos.spendable, walletReader, aspInfo)
        updateWallet((prev) => ({ ...prev, nextRollover, thresholdMs }))
      } catch (err) {
        consoleError(err, 'Error computing rollover thresholds')
      }
    }
    computeThresholds()
  }, [initialized, vtxos, walletWriter, aspInfo])

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

  const reloadWallet = async (swWallet = walletReader) => {
    if (!swWallet) return
    try {
      const vtxos = await getVtxos(swWallet)
      const txs = await getTxHistory(swWallet)
      const balance = await getBalance(swWallet)
      setBalance(balance)
      setVtxos(vtxos)
      setTxs(txs)
    } catch (err) {
      consoleError(err, 'Error reloading wallet')
      return
    }
  }

  const createSvcWorker = async (input: { privateKey: string; arkServerUrl: string; esploraUrl: string }) => {
    return ServiceWorkerWallet.setup({
      serviceWorkerPath: '/wallet-service-worker.mjs',
      identity: SingleKey.fromHex(input.privateKey),
      arkServerUrl: input.arkServerUrl,
      esploraUrl: input.esploraUrl,
    })
  }

  const createSvcWorkerReadonly = async (input: { publicKey: string; arkServerUrl: string; esploraUrl: string }) => {
    return ServiceWorkerReadonlyWallet.setup({
      serviceWorkerPath: '/wallet-service-worker.mjs',
      identity: ReadonlySingleKey.fromPublicKey(hexToBytes(input.publicKey)),
      arkServerUrl: input.arkServerUrl,
      esploraUrl: input.esploraUrl,
    })
  }

  const initSvcWorkerWallet = async ({
    arkServerUrl,
    esploraUrl,
    privateKey,
    publicKey,
    retryCount = 0,
    maxRetries = 5,
  }: {
    arkServerUrl: string
    esploraUrl: string
    privateKey?: string
    publicKey?: string
    retryCount?: number
    maxRetries?: number
  }) => {
    try {
      const svcReadonlyWallet = publicKey
        ? await createSvcWorkerReadonly({ publicKey, arkServerUrl, esploraUrl })
        : undefined
      const svcWallet = privateKey
        ? await createSvcWorker({
            privateKey,
            arkServerUrl,
            esploraUrl,
          })
        : undefined

      if ((!svcWallet && !svcReadonlyWallet) || !svcReadonlyWallet)
        throw new Error('Either private key or public key must be provided')

      setWalletWriter(svcWallet)
      // TODO fix types  as unknown as ServiceWorkerReadonlyWallet
      setWalletReader((svcWallet as unknown as ServiceWorkerReadonlyWallet) ?? svcReadonlyWallet)

      // handle messages from the service worker
      // we listen for UTXO/VTXO updates to refresh the tx history and balance
      const handleServiceWorkerMessages = (event: MessageEvent) => {
        if (event.data && ['VTXO_UPDATE', 'UTXO_UPDATE'].includes(event.data.type)) {
          reloadWallet(svcReadonlyWallet)
          // reload again after a delay to give the indexer time to update its cache
          setTimeout(() => reloadWallet(svcReadonlyWallet), 5000)
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
      const { walletInitialized } = await svcReadonlyWallet.getStatus()
      setInitialized(walletInitialized)

      // ping the service worker wallet status every 1 second
      setInterval(async () => {
        try {
          const { walletInitialized } = await svcReadonlyWallet.getStatus()
          setInitialized(walletInitialized)
        } catch (err) {
          consoleError(err, 'Error pinging wallet status')
        }
      }, 1_000)

      // renew expiring coins on startup, only if write-enabled wallet exists
      if (svcWallet) {
        renewCoins(svcWallet, aspInfo.dust, wallet.thresholdMs).catch(() => {})
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Service worker activation timed out')) {
        if (retryCount < maxRetries) {
          // exponential backoff: wait 1s, 2s, 4s for each retry
          const delay = Math.pow(2, retryCount) * 1000
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
          })
        } else {
          consoleError(
            new Error('Service worker activation timed out after maximum retries'),
            'Service worker activation failed',
          )
          return
        }
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
    await initSvcWorkerWallet({
      privateKey: hex.encode(privateKey),
      arkServerUrl,
      esploraUrl,
    })
    updateWallet({ ...wallet, network, pubkey })
    setInitialized(true)
  }

  const initReadonlyWallet = async (publicKey: Uint8Array) => {
    const arkServerUrl = aspInfo.url
    const network = aspInfo.network as NetworkName
    const esploraUrl = getRestApiExplorerURL(network) ?? ''
    const pubkey = hex.encode(publicKey)
    updateConfig({ ...config, pubkey })
    await initSvcWorkerWallet({
      publicKey: hex.encode(publicKey),
      arkServerUrl,
      esploraUrl,
    })
    updateWallet({ ...wallet, network, pubkey })
    setInitialized(true)
  }

  const lockWallet = async () => {
    if (!walletReader) throw new Error('Service worker not initialized')
    await walletReader.clear()
    setInitialized(false)
  }

  const resetWallet = async () => {
    if (!walletReader) throw new Error('Service worker not initialized')
    await clearStorage()
    await walletReader.clear()
    await walletReader.contractRepository.clearContractData()
  }

  const settlePreconfirmed = async () => {
    if (!walletReader) throw new Error('Service worker not initialized')
    if (!walletWriter) return
    await settleVtxos(walletWriter, aspInfo.dust, wallet.thresholdMs)
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
    if (!walletReader) return true
    try {
      const { walletInitialized } = await walletReader.getStatus()
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
        walletWriter,
        walletReader,
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
