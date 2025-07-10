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
import { ArkNote, ServiceWorkerWallet, setupServiceWorker } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

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
  walletLoaded: Wallet | undefined
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
  walletLoaded: undefined,
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

  const [walletLoaded, setWalletLoaded] = useState<Wallet>()
  const [wallet, setWallet] = useState(defaultWallet)
  const [svcWallet, setSvcWallet] = useState<ServiceWorkerWallet>()

  const [vtxos, setVtxos] = useState<{ spendable: Vtxo[]; spent: Vtxo[] }>({ spendable: [], spent: [] })
  const [txs, setTxs] = useState<Tx[]>([])
  const [balance, setBalance] = useState(0)
  const [initialized, setInitialized] = useState<boolean | undefined>(undefined)
  const allVtxos = useLiveQuery(() => db.vtxos?.toArray())

  useEffect(() => {
    if (!allVtxos) return
    const spendable = []
    const spent = []
    for (const vtxo of allVtxos) {
      if (vtxo.spentBy && vtxo.spentBy.length > 0) {
        spent.push(vtxo)
      } else {
        spendable.push(vtxo)
      }
    }
    setVtxos({ spendable, spent })
  }, [allVtxos])

  useEffect(() => {
    if (!svcWallet) return

    isLocked().then((locked) => {
      if (locked) return
      // update the txs history list
      getTxHistory(svcWallet).then(setTxs).catch(consoleError)
      // update the balance
      getBalance(svcWallet).then(setBalance).catch(consoleError)
    })

    // update the next rollover date
    if (vtxos?.spendable && vtxos?.spendable.length > 0) {
      const nextRollover = calcNextRollover(aspInfo.vtxoTreeExpiry, vtxos?.spendable)
      updateWallet({ ...wallet, nextRollover })
    }
  }, [vtxos, svcWallet])

  const reloadWallet = async () => {
    if (!svcWallet) return
    // update the txs history list
    try {
      const txs = await getTxHistory(svcWallet)
      setTxs(txs)
    } catch (err) {
      consoleError(err, 'Error getting txs history')
    }
    // update the balance
    try {
      const balance = await getBalance(svcWallet)
      setBalance(balance)
    } catch (err) {
      consoleError(err, 'Error getting balance')
    }
  }

  useEffect(() => {
    let pingInterval: NodeJS.Timeout
    async function initSvcWorkerWallet() {
      try {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'RELOAD_PAGE') {
            window.location.reload()
          }
        })

        // connect to the service worker
        const serviceWorker = await setupServiceWorker('/wallet-service-worker.mjs')
        const svcWallet = new ServiceWorkerWallet(serviceWorker)
        setSvcWallet(svcWallet)

        // check if the service worker wallet is initialized
        const { walletInitialized } = await svcWallet.getStatus()
        setInitialized(walletInitialized)

        // ping the service worker wallet status every 1 second
        pingInterval = setInterval(async () => {
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
    // call async function to initialize the service worker wallet
    initSvcWorkerWallet()
    return () => clearInterval(pingInterval)
  }, [])

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

  // load wallet from storage
  useEffect(() => {
    const walletFromStorage = readWalletFromStorage()
    setWalletLoaded(walletFromStorage)
    if (walletFromStorage) setWallet(walletFromStorage)
  }, [])

  // if voucher present, go to redeem page
  useEffect(() => {
    if (!initialized) return
    navigate(noteInfo.satoshis ? Pages.NotesRedeem : Pages.Wallet)
  }, [initialized, noteInfo.satoshis])

  const initWallet = async (privateKey: Uint8Array) => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    const arkServerUrl = aspInfo.url
    const esploraUrl = getRestApiExplorerURL(wallet.network) ?? ''
    await svcWallet.init({
      arkServerUrl,
      privateKey: hex.encode(privateKey),
      esploraUrl,
    })
    updateWallet({ ...wallet, network: aspInfo.network })
    setInitialized(true)
  }

  const lockWallet = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await svcWallet.clear()
    setInitialized(false)
  }

  const resetWallet = async () => {
    if (!svcWallet) throw new Error('Service worker not initialized')
    await svcWallet.clear()
    setInitialized(false)
    await clearStorage()
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
