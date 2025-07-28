import { NetworkName } from '@arkade-os/sdk/dist/types/networks'
import { Wallet } from '../lib/types'

type ExplorerURLs = {
  api: string
  web: string
}

type Explorers = Record<NetworkName, ExplorerURLs>

const explorers: Explorers = {
  bitcoin: {
    api: 'https://mempool.space/api',
    web: 'https://mempool.space',
  },
  regtest: {
    api: 'http://localhost:3000',
    web: 'http://localhost:5000',
  },
  signet: {
    api: 'https://mutinynet.com/api',
    web: 'https://mutinynet.com',
  },
  testnet: {
    api: 'https://mempool.space/testnet/api',
    web: 'https://mempool.space/testnet',
  },
  mutinynet: {
    api: 'https://mutinynet.com/api',
    web: 'https://mutinynet.com',
  },
}

export const getRestApiExplorerURL = (network: NetworkName): string => {
  return explorers[network]?.api ?? ''
}

export const getWebExplorerURL = (network: NetworkName): string => {
  return explorers[network]?.web ?? ''
}

export const getTxIdURL = (txid: string, wallet: Wallet) => {
  // stupid bug from mempool
  const url = getWebExplorerURL(wallet.network as NetworkName)?.replace(
    'https://liquid.network/liquidtestnet',
    'https://liquid.network/testnet',
  )
  return `${url}/tx/${txid}`
}

export const openInNewTab = (txid: string, wallet: Wallet) => {
  window.open(getTxIdURL(txid, wallet), '_blank', 'noreferrer')
}
