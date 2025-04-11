import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { readWalletFromStorage, saveWalletToStorage } from '../lib/storage'
import { NavigationContext, Pages } from './navigation'
import { getRestApiExplorerURL } from '../lib/explorers'
import { settleVtxos, getBalance, getVtxos, getTxHistory, getReceivingAddresses } from '../lib/asp'
import { AspContext } from './asp'
import { NotificationsContext } from './notifications'
import { FlowContext } from './flow'
import { ArkNote, arkNoteInUrl } from '../lib/arknote'
import { consoleError } from '../lib/logs'
import { Wallet } from '../lib/types'
import { sleep } from '../lib/sleep'
import { calcNextRollover, vtxosExpiringSoon } from '../lib/wallet'
import { ServiceWorkerWallet } from '@arklabs/wallet-sdk'
import { NetworkName } from '@arklabs/wallet-sdk/dist/types/networks'
import { hex } from '@scure/base'
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
  vtxos: [],
}

interface WalletContextProps {
  initWallet: (seed: Uint8Array) => Promise<void>
  lockWallet: () => Promise<void>
  rolloverVtxos: (raise?: boolean) => Promise<void>
  reloadWallet: () => void
  resetWallet: () => void
  settlePending: () => Promise<void>
  updateWallet: (w: Wallet) => void
  wallet: Wallet
  walletLoaded: Wallet | undefined
  svcWallet: ServiceWorkerWallet
}

export const WalletContext = createContext<WalletContextProps>({
  initWallet: () => Promise.resolve(),
  lockWallet: () => Promise.resolve(),
  rolloverVtxos: () => Promise.resolve(),
  reloadWallet: () => {},
  resetWallet: () => {},
  settlePending: () => Promise.resolve(),
  updateWallet: () => {},
  wallet: defaultWallet,
  walletLoaded: undefined,
  svcWallet: new ServiceWorkerWallet(),
})

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { setNoteInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyVtxosRollover, notifyTxSettled } = useContext(NotificationsContext)

  const [walletLoaded, setWalletLoaded] = useState<Wallet>()
  const [wallet, setWallet] = useState(defaultWallet)
  const [svcWallet, setSvcWallet] = useState<ServiceWorkerWallet>(new ServiceWorkerWallet())

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
    updateWallet({ ...wallet, explorer: esploraUrl, initialized: true, network: aspInfo.network, privateKey })
  }

  const lockWallet = async () => {
    // TODO: delete wallet instance in service worker (change to wallet-sdk)
    setWallet({ ...wallet, privateKey: undefined })
  }

  const rolloverVtxos = async (raise = false) => {
    try {
      await settleVtxos(svcWallet)
      await sleep(1000) // server needs time to update vtxos list
      await reloadWallet()
      notifyVtxosRollover()
    } catch (err) {
      if (raise) throw err
    }
  }

  const reloadWallet = async () => {
    const { offchainAddr } = await getReceivingAddresses(svcWallet)
    const vtxos = await getVtxos(svcWallet)
    const balance = await getBalance(svcWallet)
    const txs = await getTxHistory(svcWallet)
    const now = Math.floor(new Date().getTime() / 1000)
    const nextRollover = calcNextRollover(aspInfo.vtxoTreeExpiry, vtxos)
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
    await settleVtxos(svcWallet)
    await reloadWallet()
    notifyTxSettled()
  }

  const updateWallet = async (data: Wallet) => {
    setWallet({ ...data })
    saveWalletToStorage(data)
  }

  return (
    <WalletContext.Provider
      value={{
        initWallet,
        rolloverVtxos,
        reloadWallet,
        resetWallet,
        settlePending,
        updateWallet,
        wallet,
        walletLoaded,
        svcWallet,
        lockWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
