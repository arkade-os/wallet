import { Delegate, DelegatesConfig } from './types'
import { Network } from '@arkade-os/boltz-swap'

export const arknoteHRP = 'arknote'
export const defaultFee = 0
export const testDomains = ['dev.arkade.money', 'next.arkade.money', 'pages.dev', 'localhost']
export const devServer = 'http://localhost:7070'
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

const DEFAULT_DELEGATES: Record<Network, Delegate[]> = {
  bitcoin: [{ url: 'https://delegate.arkade.money' }, { url: 'https://d.vmempool.space' }],
  mutinynet: [{ url: 'https://delegator.mutinynet.arkade.sh' }],
  signet: [],
  regtest: [{ url: 'http://localhost:7002' }],
  testnet: [],
}

export const getDefaultDelegatesForNetwork = (network: Network): DelegatesConfig => {
  const list = DEFAULT_DELEGATES[network] ?? []
  return {
    enabled: list.length > 0 && import.meta.env.VITE_DELEGATE_ENABLED !== 'false',
    activeUrl: list.length > 0 ? list[0].url : null,
    list,
  }
}
