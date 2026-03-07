import { NetworkName } from '@arkade-os/sdk/'
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

const vmempoolDefaults: Partial<Record<NetworkName, string>> = {
  bitcoin: 'https://vmempool.space',
}

export const getRestApiExplorerURL = (network: NetworkName): string => {
  return explorers[network]?.api ?? ''
}

export const getWebExplorerURL = (network: NetworkName): string => {
  return explorers[network]?.web ?? ''
}

export const getVmempoolURL = (network: NetworkName): string => {
  return import.meta.env.VITE_VMEMPOOL_URL ?? vmempoolDefaults[network] ?? ''
}

export const getTxIdURL = (txid: string, wallet: Wallet) => {
  // stupid bug from mempool
  const url = getWebExplorerURL(wallet.network as NetworkName)?.replace(
    'https://liquid.network/liquidtestnet',
    'https://liquid.network/testnet',
  )
  return `${url}/tx/${txid}`
}

export const getOffchainTxURL = (txid: string, wallet: Wallet) => {
  const base = getVmempoolURL(wallet.network as NetworkName)
  return base ? `${base}/tx/${txid}` : ''
}

export const getAssetURL = (assetId: string, wallet: Wallet) => {
  const base = getVmempoolURL(wallet.network as NetworkName)
  return base ? `${base}/asset/${assetId}` : ''
}

export const openInNewTab = (txid: string, wallet: Wallet) => {
  window.open(getTxIdURL(txid, wallet), '_blank', 'noreferrer')
}

export const openOffchainTxInNewTab = (txid: string, wallet: Wallet) => {
  const url = getOffchainTxURL(txid, wallet)
  if (url) window.open(url, '_blank', 'noreferrer')
}

export const openAssetInNewTab = (assetId: string, wallet: Wallet) => {
  const url = getAssetURL(assetId, wallet)
  if (url) window.open(url, '_blank', 'noreferrer')
}
