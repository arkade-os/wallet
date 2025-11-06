import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { LightningSwapProvider } from '../lib/lightning'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { FeesResponse, isPendingReverseSwap, isReverseClaimableStatus, Network } from '@arkade-os/boltz-swap'
import { ConfigContext } from './config'
import { consoleError, consoleLog } from '../lib/logs'

const BASE_URLS: Record<Network, string> = {
  bitcoin: import.meta.env.VITE_BOLTZ_URL ?? 'https://api.ark.boltz.exchange',
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
}

interface LightningContextProps {
  connected: boolean
  calcSubmarineSwapFee: (satoshis: number) => number
  calcReverseSwapFee: (satoshis: number) => number
  swapProvider: LightningSwapProvider | null
  toggleConnection: () => void
}

export const LightningContext = createContext<LightningContextProps>({
  connected: false,
  swapProvider: null,
  toggleConnection: () => {},
  calcReverseSwapFee: () => 0,
  calcSubmarineSwapFee: () => 0,
})

export const LightningProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const { config, updateConfig } = useContext(ConfigContext)

  const [swapProvider, setSwapProvider] = useState<LightningSwapProvider | null>(null)
  const [fees, setFees] = useState<FeesResponse | null>(null)

  const connected = config.apps.boltz.connected

  // create swap provider on first run with svcWallet
  useEffect(() => {
    if (!aspInfo.network || !svcWallet) return
    const baseUrl = BASE_URLS[aspInfo.network as Network]
    if (!baseUrl) return // No boltz server for this network
    setSwapProvider(new LightningSwapProvider(baseUrl, aspInfo, svcWallet, config))
    setConnected(config.apps.boltz.connected, false)
  }, [aspInfo, svcWallet, config.apps.boltz.connected, config.nostrBackup])

  // fetch fees and refresh swaps status on provider change
  useEffect(() => {
    if (!swapProvider) return
    const choresOnInit = async () => {
      try {
        setFees(await swapProvider.getFees())
        await swapProvider.refreshSwapsStatus()
        await swapProvider.refundFailedSubmarineSwaps()
        const swaps = await swapProvider.getSwapHistory()
        for (const swap of swaps.filter(isPendingReverseSwap)) {
          if (isReverseClaimableStatus(swap.status)) {
            consoleLog('auto-claiming reverse swap:', swap.id)
            await swapProvider.claimVHTLC(swap).catch(consoleError)
          }
        }
      } catch (error) {
        consoleError(error)
      }
    }
    choresOnInit()
  }, [swapProvider])

  const setConnected = (value: boolean, backup: boolean) => {
    updateConfig(
      {
        ...config,
        apps: {
          ...config.apps,
          boltz: {
            ...config.apps.boltz,
            connected: value,
          },
        },
      },
      backup,
    )
  }

  const calcSubmarineSwapFee = (satoshis: number): number => {
    if (!satoshis || !fees) return 0
    const { percentage, minerFees } = fees.submarine
    return Math.ceil((satoshis * percentage) / 100 + minerFees)
  }

  const calcReverseSwapFee = (satoshis: number): number => {
    if (!satoshis || !fees) return 0
    const { percentage, minerFees } = fees.reverse
    return Math.ceil((satoshis * percentage) / 100 + minerFees.claim + minerFees.lockup)
  }

  const toggleConnection = () => setConnected(!connected, true)

  return (
    <LightningContext.Provider
      value={{
        connected,
        swapProvider,
        toggleConnection,
        calcReverseSwapFee,
        calcSubmarineSwapFee,
      }}
    >
      {children}
    </LightningContext.Provider>
  )
}
