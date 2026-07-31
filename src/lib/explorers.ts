import { NetworkName } from '@arkade-os/sdk/'
import { Wallet } from '../lib/types'
import { openExternal } from './device'

type ExplorerURLs = {
  api?: string
  web: string
}

type Explorers = Record<NetworkName, ExplorerURLs>

const explorers: Explorers = {
  bitcoin: {
    web: 'https://mempool.space',
  },
  regtest: {
    api: 'http://localhost:3000/api',
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
  bitcoin: 'https://arkade.space',
  mutinynet: 'https://explorer.mutinynet.arkade.sh',
  regtest: 'http://localhost:7080',
}

export const getRestApiExplorerURL = (network: NetworkName): string | undefined => {
  return explorers[network]?.api
}

export const getWebExplorerURL = (network: NetworkName): string => {
  return explorers[network]?.web ?? ''
}

export const getVmempoolURL = (network: NetworkName): string => {
  return vmempoolDefaults[network] ?? ''
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
  openExternal(getTxIdURL(txid, wallet))
}

export const openOffchainTxInNewTab = (txid: string, wallet: Wallet) => {
  const url = getOffchainTxURL(txid, wallet)
  if (url) openExternal(url)
}

export const openAssetInNewTab = (assetId: string, wallet: Wallet) => {
  const url = getAssetURL(assetId, wallet)
  if (url) openExternal(url)
}
