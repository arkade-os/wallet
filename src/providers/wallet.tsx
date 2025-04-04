import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { readWalletFromStorage, saveWalletToStorage } from '../lib/storage'
import { NavigationContext, Pages } from './navigation'
import { getRestApiExplorerURL } from '../lib/explorers'
import { settleVtxos, getBalance, getVtxos, lock, unlock, getTxHistory, getReceivingAddresses } from '../lib/asp'
import { AspContext } from './asp'
import { NotificationsContext } from './notifications'
import { FlowContext } from './flow'
import { ArkNote, arkNoteInUrl } from '../lib/arknote'
import { fetchWasm } from '../lib/fetch'
import { consoleError } from '../lib/logs'
import { Wallet } from '../lib/types'
import { sleep } from '../lib/sleep'
import { ConfigContext } from './config'
import { calcNextRollover, vtxosExpiringSoon } from '../lib/wallet'
import { isPWAInstalled } from '../lib/pwaDetection'

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
  lockWallet: () => Promise<void>
  rolloverVtxos: (raise?: boolean) => Promise<void>
  reloadWallet: () => void
  resetWallet: () => void
  settlePending: () => Promise<void>
  updateWallet: (w: Wallet) => void
  unlockWallet: (password: string) => Promise<void>
  walletUnlocked: boolean
  wallet: Wallet
  walletLoaded: Wallet | undefined
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
  walletLoaded: undefined,
  wasmLoaded: false,
})

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { config, configLoaded } = useContext(ConfigContext)
  const { noteInfo, setNoteInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyVtxosRollover, notifyTxSettled } = useContext(NotificationsContext)

  const [walletUnlocked, setWalletUnlocked] = useState(false)
  const [walletLoaded, setWalletLoaded] = useState<Wallet>()
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
    navigate(wallet?.initialized ? Pages.Unlock : isPWAInstalled() ? Pages.Init : Pages.Onboard)
    setWalletLoaded(wallet)
  }, [wasmLoaded])

  // if voucher present, go to redeem page
  useEffect(() => {
    if (!walletUnlocked) return
    reloadWallet()
    navigate(noteInfo.satoshis ? Pages.NotesRedeem : Pages.Wallet)
  }, [walletUnlocked])

  // auto settle vtxos if next roll over in less than 24 hours
  useEffect(() => {
    if (!wallet.nextRollover || !walletUnlocked) return
    if (vtxosExpiringSoon(wallet.nextRollover)) rolloverVtxos()
  }, [walletUnlocked, wallet.nextRollover])

  // instruct service worker to start checking for vtxos expirations
  // if user set notifications off it should stop checking
  useEffect(() => {
    if (!walletLoaded || !wallet.initialized || !configLoaded) return
    const type = config.notifications ? 'START_CHECK' : 'STOP_CHECK'
    const data = { arkAddress: walletLoaded.arkAddress, serverUrl: aspInfo.url }
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration?.active?.postMessage({ type, data })
    })
  }, [configLoaded, config.notifications, walletLoaded, wallet.initialized])

  const initWallet = async (password: string, privateKey: string) => {
    const aspUrl = aspInfo.url
    const chain = 'bitcoin'
    const clientType = 'rest'
    const walletType = 'singlekey'
    const explorerUrl = getRestApiExplorerURL(wallet.network) ?? ''
    await window.init(walletType, clientType, aspUrl, privateKey, password, chain, explorerUrl)
    await unlockWallet(password)
    updateWallet({ ...wallet, explorer: explorerUrl, initialized: true, network: aspInfo.network })
  }

  const lockWallet = async () => {
    try {
      await lock()
      setWalletUnlocked(false)
    } catch {
      throw 'Invalid password'
    }
  }

  const rolloverVtxos = async (raise = false) => {
    try {
      await settleVtxos()
      await sleep(1000) // server needs time to update vtxos list
      await reloadWallet()
      notifyVtxosRollover()
    } catch (err) {
      if (raise) throw err
    }
  }

  const reloadWallet = async () => {
    const { offchainAddr } = await getReceivingAddresses()
    const vtxos = await getVtxos()
    const balance = await getBalance()
    const txs = await getTxHistory()
    const now = Math.floor(new Date().getTime() / 1000)
    const nextRollover = calcNextRollover(vtxos)
    updateWallet({
      ...wallet,
      arkAddress: offchainAddr,
      balance,
      initialized: true,
      lastUpdate: now,
      nextRollover,
      txs,
      vtxos,
    })
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
        walletLoaded,
        wasmLoaded,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
