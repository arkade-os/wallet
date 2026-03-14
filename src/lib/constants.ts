import { Delegate } from './types'
import { Network } from '@arkade-os/boltz-swap'

export const arknoteHRP = 'arknote'
export const defaultFee = 0
export const testDomains = ['dev.arkade.money', 'next.arkade.money', 'pages.dev', 'localhost']
export const devServer = 'https://arkade.computer'
export const testServer = 'https://mutinynet.arkade.sh'
export const mainServer = 'https://arkade.computer'
export const defaultPassword = 'noah'
export const minSatsToNudge = 100_000
export const maxPercentage = import.meta.env.VITE_MAX_PERCENTAGE ?? 10
export const psaMessage = import.meta.env.VITE_PSA_MESSAGE ?? ''
export const enableChainSwapsReceive = import.meta.env.VITE_CHAIN_SWAPS_RECEIVE_ENABLED === 'true'

export const defaultArkServer = () => {
  if (import.meta.env.VITE_ARK_SERVER) return import.meta.env.VITE_ARK_SERVER
  for (const domain of testDomains) {
    if (window.location.hostname.includes(domain)) {
      return window.location.hostname.includes('localhost') ? devServer : testServer
    }
  }
  return mainServer
}

const DELEGATE_URL: Record<Network, string | null> = {
  bitcoin: 'https://delegate.arkade.money',
  mutinynet: `https://delegator.mutinynet.arkade.sh`,
  signet: null,
  regtest: 'http://localhost:7002',
  testnet: null,
}

export const getDelegateUrlForNetwork = (network: Network): Delegate => {
  const url = DELEGATE_URL[network]
  if (!url) {
    throw new Error(`Delegate URL not found for network: ${network}`)
  }
  return {
    name: 'Arkade Default',
    url,
  }
}
