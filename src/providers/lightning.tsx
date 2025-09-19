import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { LightningSwapProvider } from '../lib/lightning'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { FeesResponse, Network } from '@arkade-os/boltz-swap'
import { ConfigContext } from './config'
import { BoltzUrl } from '../lib/constants'

const BASE_URLS: Record<Network, string> = {
  bitcoin: 'https://boltz.arkade.sh',
  mutinynet: 'https://boltz.mutinynet.arkade.sh',
  testnet: 'https://boltz.testnet.arkade.sh',
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
    const baseUrl = BoltzUrl ?? BASE_URLS[aspInfo.network as Network]
    if (!baseUrl) return // No boltz server for this network
    setSwapProvider(new LightningSwapProvider(baseUrl, aspInfo, svcWallet))
    setConnected(config.apps.boltz.connected)
  }, [aspInfo, svcWallet, config.apps.boltz.connected])

  useEffect(() => {
    if (!swapProvider) return
    swapProvider.getFees().then((fees) => setFees(fees))
  }, [swapProvider])

  const setConnected = (value: boolean) => {
    updateConfig({
      ...config,
      apps: {
        ...config.apps,
        boltz: {
          ...config.apps.boltz,
          connected: value,
        },
      },
    })
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

  const toggleConnection = () => setConnected(!connected)

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
