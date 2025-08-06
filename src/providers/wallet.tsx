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
import { ArkNote, ServiceWorkerWallet, setupServiceWorker, Wallet as ArkWallet, SingleKey } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { isServiceWorkerAvailable } from '../lib/environment'

import * as secp from '@noble/secp256k1'
import { NetworkName } from '@arkade-os/sdk/dist/types/networks'

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
  svcWallet: ServiceWorkerWallet | ArkWallet | undefined
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
  const [svcWallet, setSvcWallet] = useState<ServiceWorkerWallet | ArkWallet>()

  const [vtxos, setVtxos] = useState<{ spendable: Vtxo[]; spent: Vtxo[] }>({ spendable: [], spent: [] })
  const [txs, setTxs] = useState<Tx[]>([])
  const [balance, setBalance] = useState(0)
  const [initialized, setInitialized] = useState<boolean>(false)
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

    // reload tx history and balance when there are new vtxos
    isLocked().then((locked) => {
      if (!locked) reloadWallet()
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
    getTxHistory(svcWallet).then(setTxs).catch(consoleError)
    // update the balance
    getBalance(svcWallet).then(setBalance).catch(consoleError)
  }

  useEffect(() => {
    let pingInterval: NodeJS.Timeout

    async function initWalletBackend() {
      try {
        // read wallet from storage
        const walletFromStorage = readWalletFromStorage()
        if (walletFromStorage) setWallet(walletFromStorage)

        if (isServiceWorkerAvailable()) {
          // listen for messages from the service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'RELOAD_PAGE') {
              window.location.reload()
            }
          })

          try {
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
          } catch (swError) {
            console.error('Service worker setup failed:', swError)
            throw swError // Re-throw to fall back to basic wallet
          }
        } else {
          // For Capacitor or environments without service worker support,
          // we don't create a wallet instance here. It will be created in initWallet()
          // when the user actually provides their private key
          setSvcWallet(undefined)
          setInitialized(false)
        }
      } catch (err) {
        console.error('Error initializing wallet backend:', err)
        consoleError(err, 'Error initializing wallet backend')
        // Fallback: no wallet instance, will be created in initWallet()
        setSvcWallet(undefined)
        setInitialized(false)
      }
    }
    
    // call async function to initialize the wallet backend
    initWalletBackend().then(() => {
      setWalletLoaded(true)
    })
    
    return () => clearInterval(pingInterval)
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

  const initWallet = async (privateKey: Uint8Array) => {
    if (!svcWallet) {
      // No wallet instance exists yet (Capacitor or failed service worker init)
      // Create a new SDK wallet instance
      const identity = SingleKey.fromHex(hex.encode(privateKey))
      const newWallet = await ArkWallet.create({
        identity,
        arkServerUrl: aspInfo.url,
      })
      setSvcWallet(newWallet)
      const pubkey = hex.encode(secp.getPublicKey(privateKey))
      const network = aspInfo.network as NetworkName
      updateWallet({ ...wallet, network, pubkey })
      setInitialized(true)
      return
    }
    
    if ('init' in svcWallet) {
      // ServiceWorkerWallet
      const pubkey = hex.encode(secp.getPublicKey(privateKey))
      const network = aspInfo.network as NetworkName
      const arkServerUrl = aspInfo.url
      const esploraUrl = getRestApiExplorerURL(network) ?? ''
      await svcWallet.init({
        arkServerUrl,
        privateKey: hex.encode(privateKey),
        esploraUrl,
      })
      updateWallet({ ...wallet, network, pubkey })
    } else {
      // Basic Wallet - recreate with the proper key
      const identity = SingleKey.fromHex(hex.encode(privateKey))
      const newWallet = await ArkWallet.create({
        identity,
        arkServerUrl: aspInfo.url,
      })
      setSvcWallet(newWallet)
      const pubkey = hex.encode(secp.getPublicKey(privateKey))
      const network = aspInfo.network as NetworkName
      updateWallet({ ...wallet, network, pubkey })
    }
    setInitialized(true)
  }

  const lockWallet = async () => {
    if (!svcWallet) {
      // No wallet instance to lock
      setInitialized(false)
      return
    }
    
    if ('clear' in svcWallet) {
      // ServiceWorkerWallet
      await svcWallet.clear()
    } else {
      // SDK Wallet - clear the instance
      setSvcWallet(undefined)
    }
    setInitialized(false)
  }

  const resetWallet = async () => {
    if (!svcWallet) {
      // No wallet instance to reset
      setInitialized(false)
      await clearStorage()
      return
    }
    
    if ('clear' in svcWallet) {
      // ServiceWorkerWallet
      await svcWallet.clear()
    } else {
      // SDK Wallet - clear the instance
      setSvcWallet(undefined)
    }
    setInitialized(false)
    await clearStorage()
  }

  const settlePreconfirmed = async () => {
    if (!svcWallet) throw new Error('Wallet not initialized')
    await settleVtxos(svcWallet)
    notifyTxSettled()
  }

  const updateWallet = async (data: Wallet) => {
    setWallet({ ...data })
    saveWalletToStorage(data)
  }

  const isLocked = async () => {
    if (!svcWallet) {
      // No wallet instance means it's locked/uninitialized
      return true
    }
    
    if ('getStatus' in svcWallet) {
      // ServiceWorkerWallet
      try {
        const { walletInitialized } = await svcWallet.getStatus()
        return !walletInitialized
      } catch {
        return true
      }
    } else {
      // SDK Wallet - check if it's initialized based on our state
      return !initialized
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
