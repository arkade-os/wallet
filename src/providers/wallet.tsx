import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
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
import { ArkNote, ServiceWorkerWallet, NetworkName, SingleKey } from '@arkade-os/sdk'
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
  const { setNoteInfo, noteInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyTxSettled } = useContext(NotificationsContext)

  const [walletLoaded, setWalletLoaded] = useState(false)
  const [wallet, setWallet] = useState(defaultWallet)
  const [svcWallet, setSvcWallet] = useState<ServiceWorkerWallet>()

  const [vtxos, setVtxos] = useState<{ spendable: Vtxo[]; spent: Vtxo[] }>({ spendable: [], spent: [] })
  const [txs, setTxs] = useState<Tx[]>([])
  const [balance, setBalance] = useState(0)
  const [initialized, setInitialized] = useState<boolean>(false)

  // update vtxos when there are new txs
  useEffect(() => {
    if (!txs || !svcWallet) return
    svcWallet
      .getVtxos()
      .then((vtxos) => {
        const spendable = []
        const spent = []
        for (const vtxo of vtxos) {
          if (vtxo.spentBy && vtxo.spentBy.length > 0) spent.push(vtxo)
          else spendable.push(vtxo)
        }
        setVtxos({ spendable, spent })
      })
      .catch(consoleError)
  }, [txs, svcWallet])

  // update next rollover when vtxos change
  useEffect(() => {
    if (vtxos?.spendable && vtxos?.spendable.length > 0) {
      const nextRollover = calcNextRollover(aspInfo.vtxoTreeExpiry, vtxos?.spendable)
      updateWallet({ ...wallet, nextRollover })
    }
  }, [vtxos])

  useEffect(() => {
    // read wallet from storage
    const walletFromStorage = readWalletFromStorage()
    if (walletFromStorage) setWallet(walletFromStorage)
    setWalletLoaded(true)
  }, [])

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
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'VTXO_UPDATE') {
          console.log('VTXO update received from service worker')
          // update the txs history list
          getTxHistory(svcWallet).then(setTxs).catch(consoleError)
          // update the balance
          getBalance(svcWallet).then(setBalance).catch(consoleError)
        }
      })

      // check if the service worker wallet is initialized
      const { walletInitialized } = await svcWallet.getStatus()
      console.log('Service worker wallet initialized:', walletInitialized)
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
    setInitialized(true)
    updateWallet({ ...wallet, network, pubkey })
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
  }

  const settlePreconfirmed = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await settleVtxos(svcWallet)
    notifyTxSettled()
  }

  const updateWallet = async (data: Wallet) => {
    setWallet({ ...data })
    saveWalletToStorage(data)
  }

  const isLocked = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
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
