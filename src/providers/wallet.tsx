import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { readWalletFromStorage, saveWalletToStorage } from '../lib/storage'
import { NavigationContext, Pages } from './navigation'
import { Tx, Vtxos } from '../lib/types'
import { getRestApiExplorerURL } from '../lib/explorers'
import { settleVtxos, getBalance, getVtxos, lock, unlock, getTxHistory } from '../lib/asp'
import { AspContext } from './asp'
import { NotificationsContext } from './notifications'
import { FlowContext } from './flow'
import { ArkNote, arkNoteInUrl } from '../lib/arknote'
import { fetchWasm } from '../lib/fetch'
import { consoleError } from '../lib/logs'

export interface Wallet {
  arkAddress: string
  balance: number
  explorer: string
  initialized: boolean
  lastUpdate: number
  lockedByBiometrics?: boolean
  network: string
  nextRollover: number
  txs: Tx[]
  vtxos: Vtxos
  wasmVersion: string
}

const defaultWallet: Wallet = {
  arkAddress: '',
  balance: 0,
  explorer: '',
  initialized: false,
  lastUpdate: 0,
  network: '',
  nextRollover: 0,
  txs: [],
  vtxos: {
    spendable: [],
    spent: [],
  },
  wasmVersion: '',
}

interface WalletContextProps {
  initWallet: (password: string, privateKey: string) => Promise<void>
  lockWallet: (password: string) => Promise<void>
  rolloverVtxos: (raise?: boolean) => Promise<void>
  reloadWallet: () => void
  resetWallet: () => void
  settlePending: () => Promise<void>
  updateWallet: (w: Wallet) => void
  unlockWallet: (password: string) => Promise<void>
  walletUnlocked: boolean
  wallet: Wallet
  wasmLoaded: boolean
}

export const WalletContext = createContext<WalletContextProps>({
  initWallet: () => Promise.resolve(),
  lockWallet: () => Promise.resolve(),
  rolloverVtxos: () => Promise.resolve(),
  reloadWallet: () => {},
  resetWallet: () => {},
  settlePending: () => Promise.resolve(),
  unlockWallet: () => Promise.resolve(),
  updateWallet: () => {},
  walletUnlocked: false,
  wallet: defaultWallet,
  wasmLoaded: false,
})

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { noteInfo, setNoteInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyVtxosRollover, notifyTxSettled } = useContext(NotificationsContext)

  const [walletUnlocked, setWalletUnlocked] = useState(false)
  const [wasmLoaded, setWasmLoaded] = useState(false)
  const [wallet, setWallet] = useState(defaultWallet)

  const instantiateWasm = (wasm: any) => {
    const go = new window.Go()
    WebAssembly.instantiateStreaming(wasm, go.importObject).then((result) => {
      go.run(result.instance)
      setWasmLoaded(true)
    })
  }

  // load wasm on startup
  useEffect(() => {
    if (wasmLoaded) return
    fetchWasm('/ark-sdk.wasm')
      .then(instantiateWasm)
      .catch((err) => consoleError(err, 'error loading wasm'))
  }, [])

  // if voucher on url, add it to state and remove from url
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
    if (!wasmLoaded) return
    const wallet = readWalletFromStorage()
    updateWallet(wallet?.initialized ? wallet : defaultWallet)
    navigate(wallet?.initialized ? Pages.Unlock : Pages.Init)
  }, [wasmLoaded])

  // if voucher present, go to redeem page
  useEffect(() => {
    if (!walletUnlocked) return
    navigate(noteInfo.satoshis ? Pages.NotesRedeem : Pages.Wallet)
  }, [walletUnlocked])

  // auto settle vtxos if next roll over in less than 24 hours
  useEffect(() => {
    if (!wallet.nextRollover || !walletUnlocked) return
    const now = Math.floor(new Date().getTime() / 1000)
    const threshold = 60 * 60 * 24 // one day in seconds
    const urgent = wallet.nextRollover - now < threshold
    if (urgent) rolloverVtxos()
  }, [walletUnlocked, wallet.nextRollover])

  const initWallet = async (password: string, privateKey: string) => {
    const aspUrl = aspInfo.url
    const chain = 'bitcoin'
    const clientType = 'rest'
    const walletType = 'singlekey'
    const explorerUrl = getRestApiExplorerURL(wallet.network) ?? ''
    await window.init(walletType, clientType, aspUrl, privateKey, password, chain, explorerUrl)
    await unlockWallet(password)
    updateWallet({ ...wallet, initialized: true, network: aspInfo.network })
  }

  const lockWallet = async (password: string) => {
    try {
      await lock(password)
      setWalletUnlocked(false)
    } catch {
      throw 'Invalid password'
    }
  }

  const rolloverVtxos = async (raise = false) => {
    try {
      await settleVtxos()
      await reloadWallet()
      notifyVtxosRollover()
    } catch (err) {
      if (raise) throw err
    }
  }

  const reloadWallet = async () => {
    const vtxos = await getVtxos()
    const balance = await getBalance()
    const txs = await getTxHistory()
    const now = Math.floor(new Date().getTime() / 1000)
    const nextRollover = vtxos.spendable
      ? vtxos.spendable.reduce((acc, cur) => {
          const unixtimestamp = Math.floor(new Date(cur.expireAt).getTime() / 1000)
          return unixtimestamp < acc || acc === 0 ? unixtimestamp : acc
        }, 0)
      : 0
    updateWallet({ ...wallet, balance, initialized: true, lastUpdate: now, nextRollover, txs, vtxos })
  }

  const resetWallet = async () => {
    updateWallet(defaultWallet)
  }

  const settlePending = async () => {
    await settleVtxos()
    await reloadWallet()
    notifyTxSettled()
  }

  const unlockWallet = async (password: string) => {
    await unlock(password)
    setWalletUnlocked(true)
  }

  const updateWallet = async (data: Wallet) => {
    const wasmVersion = await window.getVersion()
    setWallet({ ...data, wasmVersion })
    saveWalletToStorage(data)
  }

  return (
    <WalletContext.Provider
      value={{
        initWallet,
        lockWallet,
        rolloverVtxos,
        reloadWallet,
        resetWallet,
        settlePending,
        unlockWallet,
        updateWallet,
        walletUnlocked,
        wallet,
        wasmLoaded,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
