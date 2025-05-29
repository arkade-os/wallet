import { NetworkName } from '@arklabs/wallet-sdk/dist/types/networks'
import { Satoshis, Wallet } from './types'
import * as bolt11 from './bolt11'

type SwapSubmarineResponse = {
  ARK: {
    BTC: {
      hash: string
      rate: number
      limits: {
        maximal: number
        minimal: number
        maximalZeroConf: number
      }
      fees: {
        percentage: number
        minerFees: number
      }
    }
  }
}

export const getBoltzApiUrl = (network: NetworkName): string => {
  switch (network) {
    case 'bitcoin':
      return 'https://api-boltz-bitcoin.arkade.sh'
    case 'regtest':
      return 'http://localhost:9069'
    default:
      return ''
  }
}

export const getBoltzLimits = async (network: NetworkName): Promise<{ min: number; max: number }> => {
  const url = getBoltzApiUrl(network)
  if (!url) throw 'Invalid network for Boltz API'
  const response = await fetch(`${getBoltzApiUrl(network)}/v2/swap/submarine`)
  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to fetch limits'
  }
  const json: SwapSubmarineResponse = await response.json()
  const { minimal, maximal } = json.ARK.BTC.limits
  return {
    min: minimal,
    max: maximal,
  }
}

export const getInvoiceSatoshis = (invoice: string): number => {
  return bolt11.decode(invoice).satoshis ?? 0
}

export const submarineSwap = async (invoice: string, wallet: Wallet): Promise<{ address: string; amount: number }> => {
  const refundPublicKey = wallet.pubkey
  if (!refundPublicKey) throw 'Failed to get public key'
  if (!wallet.network) throw 'Failed to get network'

  const response = await fetch(`${getBoltzApiUrl(wallet.network)}/v2/swap/submarine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ARK',
      to: 'BTC',
      invoice,
      refundPublicKey,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to process Lightning payment'
  }

  const res = (await response.json()) as {
    address: string
    expectedAmount: number
  }

  return { address: res.address, amount: res.expectedAmount }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const reverseSwap = async (sats: Satoshis): Promise<string> => {
  return '' // TODO not implemented yet
}
