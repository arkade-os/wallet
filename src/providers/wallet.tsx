import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import { clearStorage, readWalletFromStorage, saveWalletToStorage } from '../lib/storage'
import { NavigationContext, Pages } from './navigation'
import { getRestApiExplorerURL } from '../lib/explorers'
import { getBalance, getTxHistory, settleVtxos } from '../lib/asp'
import { AspContext } from './asp'
import { NotificationsContext } from './notifications'
import { FlowContext } from './flow'
import { arkNoteInUrl } from '../lib/arknote'
import { consoleError } from '../lib/logs'
import { Tx, Vtxo, Wallet } from '../lib/types'
import { calcNextRollover } from '../lib/wallet'
import { ArkNote, ServiceWorkerWallet, NetworkName, SingleKey, ExtendedVirtualCoin } from '@arkade-os/sdk'
import { hex } from '@scure/base'

import * as secp from '@noble/secp256k1'

const defaultWallet: Wallet = {
  network: '',
  nextRollover: 0,
}

interface WalletContextProps {
  initWallet: (seed: Uint8Array) => Promise<void>
  lockWallet: () => Promise<void>
  resetWallet: () => Promise<void>
  settlePreconfirmed: () => Promise<void>
  updateWallet: (w: Wallet) => void
  isLocked: () => Promise<boolean>
  reloadWallet: () => Promise<void>
  wallet: Wallet
  walletLoaded: boolean
  svcWallet: ServiceWorkerWallet | undefined
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
  isLocked: () => Promise.resolve(true),
  balance: 0,
  txs: [],
  vtxos: { spendable: [], spent: [] },
})

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { navigate } = useContext(NavigationContext)
  const { setNoteInfo, noteInfo } = useContext(FlowContext)
  const { notifyTxSettled } = useContext(NotificationsContext)

  const [txs, setTxs] = useState<Tx[]>([])
  const [balance, setBalance] = useState(0)
  const [wallet, setWallet] = useState(defaultWallet)
  const [walletLoaded, setWalletLoaded] = useState(false)
  const [initialized, setInitialized] = useState<boolean>(false)
  const [svcWallet, setSvcWallet] = useState<ServiceWorkerWallet>()
  const [vtxos, setVtxos] = useState<{ spendable: Vtxo[]; spent: Vtxo[] }>({ spendable: [], spent: [] })

  const listeningForServiceWorker = useRef(false)

  // handle messages from the service worker
  // we listen for UTXO/VTXO updates to refresh the tx history and balance
  // we add a delay to give the indexer time to update its cache
  const handleServiceWorkerMessages = (event: MessageEvent) => {
    if (!svcWallet) return
    if (event.data && ['VTXO_UPDATE', 'UTXO_UPDATE'].includes(event.data.type)) {
      setTimeout(() => {
        getTxHistory(svcWallet).then(setTxs).catch(consoleError)
        getBalance(svcWallet).then(setBalance).catch(consoleError)
      }, 5000)
    }
  }

  // read wallet from storage
  useEffect(() => {
    const walletFromStorage = readWalletFromStorage()
    if (walletFromStorage) setWallet(walletFromStorage)
    setWalletLoaded(true)
  }, [])

  useEffect(() => {
    if (svcWallet) reloadWallet().catch(consoleError)
  }, [svcWallet])

  // update vtxos when balance changes
  useEffect(() => {
    if (!svcWallet) return
    svcWallet
      .getVtxos()
      .then((vtxos) => {
        const spendable: ExtendedVirtualCoin[] = []
        const spent: ExtendedVirtualCoin[] = []
        for (const vtxo of vtxos) {
          if (vtxo.spentBy && vtxo.spentBy.length > 0) spent.push(vtxo)
          else spendable.push(vtxo)
        }
        setVtxos({ spendable, spent })
      })
      .catch(consoleError)
  }, [balance, svcWallet])

  // update next rollover when vtxos change
  useEffect(() => {
    if (!vtxos?.spendable?.length) return
    const nextRollover = calcNextRollover(aspInfo.vtxoTreeExpiry, vtxos?.spendable)
    updateWallet({ ...wallet, nextRollover })
  }, [vtxos])

  // if ark note is present in the URL, decode it and set the note info
  useEffect(() => {
    const note = arkNoteInUrl()
    if (!note) return
    try {
      const { value } = ArkNote.fromString(note)
      setNoteInfo({ note, satoshis: value })
      window.location.hash = ''
    } catch (err) {
      consoleError(err, 'error decoding ark note ')
    }
  }, [])

  // if voucher present, go to redeem page
  useEffect(() => {
    if (!initialized) return
    navigate(noteInfo.satoshis ? Pages.NotesRedeem : Pages.Wallet)
  }, [initialized, noteInfo.satoshis])

  const reloadWallet = async () => {
    if (!svcWallet) return
    // update the txs history list
    getTxHistory(svcWallet).then(setTxs).catch(consoleError)
    // update the balance
    getBalance(svcWallet).then(setBalance).catch(consoleError)
  }

  const initSvcWorkerWallet = async ({
    arkServerUrl,
    esploraUrl,
    privateKey,
  }: {
    arkServerUrl: string
    esploraUrl: string
    privateKey: string
  }) => {
    try {
      // create service worker wallet
      const svcWallet = await ServiceWorkerWallet.setup({
        serviceWorkerPath: '/wallet-service-worker.mjs',
        identity: SingleKey.fromHex(privateKey),
        arkServerUrl,
        esploraUrl,
      })
      setSvcWallet(svcWallet)

      // listen for messages from the service worker
      if (listeningForServiceWorker.current) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessages)
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessages)
      } else {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessages)
        listeningForServiceWorker.current = true
      }

      // check if the service worker wallet is initialized
      const { walletInitialized } = await svcWallet.getStatus()
      setInitialized(walletInitialized)

      // ping the service worker wallet status every 1 second
      setInterval(async () => {
        try {
          const { walletInitialized } = await svcWallet.getStatus()
          setInitialized(walletInitialized)
        } catch (err) {
          consoleError(err, 'Error pinging wallet status')
        }
      }, 1_000)
    } catch (err) {
      consoleError(err, 'Error initializing service worker wallet')
    }
  }

  const initWallet = async (privateKey: Uint8Array) => {
    const arkServerUrl = aspInfo.url
    const network = aspInfo.network as NetworkName
    const esploraUrl = getRestApiExplorerURL(network) ?? ''
    const pubkey = hex.encode(secp.getPublicKey(privateKey))
    await initSvcWorkerWallet({
      privateKey: hex.encode(privateKey),
      arkServerUrl,
      esploraUrl,
    })
    updateWallet({ ...wallet, network, pubkey })
    setInitialized(true)
  }

  const lockWallet = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await svcWallet.clear()
    setInitialized(false)
  }

  const resetWallet = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await clearStorage()
    await svcWallet.clear()
    await svcWallet.contractRepository.clearContractData()
  }

  const settlePreconfirmed = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await settleVtxos(svcWallet)
    notifyTxSettled()
  }

  const updateWallet = (data: Wallet) => {
    setWallet({ ...data })
    saveWalletToStorage(data)
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
        initWallet,
        isLocked,
        initialized,
        resetWallet,
        settlePreconfirmed,
        updateWallet,
        wallet,
        walletLoaded,
        svcWallet,
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
