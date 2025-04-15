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
import { sleep } from '../lib/sleep'
import { calcNextRollover, vtxosExpiringSoon } from '../lib/wallet'
import { ArkNote, ServiceWorkerWallet } from '@arklabs/wallet-sdk'
import { NetworkName } from '@arklabs/wallet-sdk/dist/types/networks'
import { hex } from '@scure/base'
import { isPWAInstalled } from '../lib/pwaDetection'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'

const defaultWallet: Wallet = {
  arkAddress: '',
  explorer: '',
  initialized: false,
  network: '',
  nextRollover: 0,
}

interface WalletContextProps {
  initWallet: (seed: Uint8Array) => Promise<void>
  lockWallet: () => Promise<void>
  rolloverVtxos: (raise?: boolean) => Promise<void>
  resetWallet: () => Promise<void>
  settlePending: () => Promise<void>
  updateWallet: (w: Wallet) => void
  isLocked: () => Promise<boolean>
  wallet: Wallet
  walletLoaded: Wallet | undefined
  svcWallet: ServiceWorkerWallet
  txs: Tx[]
  vtxos: { spendable: Vtxo[]; spent: Vtxo[] }
  balance: number
}

export const WalletContext = createContext<WalletContextProps>({
  initWallet: () => Promise.resolve(),
  lockWallet: () => Promise.resolve(),
  rolloverVtxos: () => Promise.resolve(),
  resetWallet: () => Promise.resolve(),
  settlePending: () => Promise.resolve(),
  updateWallet: () => {},
  wallet: defaultWallet,
  walletLoaded: undefined,
  svcWallet: new ServiceWorkerWallet(),
  isLocked: () => Promise.resolve(true),
  balance: 0,
  txs: [],
  vtxos: { spendable: [], spent: [] },
})

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { setNoteInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyVtxosRollover, notifyTxSettled } = useContext(NotificationsContext)

  const [walletLoaded, setWalletLoaded] = useState<Wallet>()
  const [wallet, setWallet] = useState(defaultWallet)
  const [svcWallet, setSvcWallet] = useState<ServiceWorkerWallet>(new ServiceWorkerWallet())

  const [vtxos, setVtxos] = useState<{ spendable: Vtxo[]; spent: Vtxo[] }>({ spendable: [], spent: [] })
  const [txs, setTxs] = useState<Tx[]>([])
  const [balance, setBalance] = useState(0)

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
    if (!wallet.initialized) return

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

  // ping service worker status every 30 seconds
  useEffect(() => {
    if (!svcWallet || !wallet.initialized) return

    const pingInterval = setInterval(async () => {
      try {
        const locked = await isLocked()
        if (locked) {
          updateWallet({ ...wallet, initialized: false })
        }
      } catch (err) {
        updateWallet({ ...wallet, initialized: false })
        consoleError(err, 'Error pinging wallet status')
      }
    }, 5_000)

    return () => clearInterval(pingInterval)
  }, [svcWallet, wallet.initialized])

  useEffect(() => {
    ServiceWorkerWallet.create('/wallet-service-worker.mjs').then(setSvcWallet).catch(consoleError)
  }, [])

  useEffect(() => {
    const note = arkNoteInUrl()
    if (!note) return
    try {
      const { value } = ArkNote.fromString(note).data
      setNoteInfo({ note, satoshis: value })
      window.location.hash = ''
    } catch (err) {
      consoleError(err, 'error decoding ark note')
    }
  }, [])

  // load wallet from storage
  useEffect(() => {
    const wallet = readWalletFromStorage()
    updateWallet(wallet?.initialized ? wallet : defaultWallet)
    navigate(wallet?.initialized ? Pages.Unlock : isPWAInstalled() ? Pages.Init : Pages.Onboard)
    setWalletLoaded(wallet)
  }, [])

  // auto settle vtxos if next roll over in less than 24 hours
  useEffect(() => {
    if (!wallet.nextRollover) return
    if (vtxosExpiringSoon(wallet.nextRollover)) rolloverVtxos()
  }, [wallet.nextRollover])

  const initWallet = async (privateKey: Uint8Array) => {
    const arkServerUrl = aspInfo.url
    const esploraUrl = getRestApiExplorerURL(wallet.network) ?? ''
    await svcWallet.init({
      arkServerUrl,
      privateKey: hex.encode(privateKey),
      network: aspInfo.network as NetworkName,
      esploraUrl,
    })
    updateWallet({ ...wallet, explorer: esploraUrl, initialized: true, network: aspInfo.network })
  }

  const lockWallet = async () => {
    await svcWallet.clear()
    setWallet({ ...wallet })
  }

  const rolloverVtxos = async (raise = false) => {
    try {
      await settleVtxos(svcWallet)
      await sleep(1000) // server needs time to update vtxos list
      notifyVtxosRollover()
    } catch (err) {
      if (raise) throw err
    }
  }

  const resetWallet = async () => {
    await svcWallet.clear()
    await clearStorage()
    updateWallet(defaultWallet)
  }

  const settlePending = async () => {
    await settleVtxos(svcWallet)
    notifyTxSettled()
  }

  const updateWallet = async (data: Wallet) => {
    setWallet({ ...data })
    saveWalletToStorage(data)
  }

  const isLocked = async () => {
    if (!wallet.initialized) return true
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
        rolloverVtxos,
        resetWallet,
        settlePending,
        updateWallet,
        wallet,
        walletLoaded,
        svcWallet,
        lockWallet,
        txs,
        balance,
        vtxos: vtxos ?? { spendable: [], spent: [] },
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
