import { hex } from '@scure/base'
import { Wallet } from './types'
import { secp256k1 as secp } from '@noble/curves/secp256k1'
import * as bolt11 from './bolt11'

export const getInvoiceSatoshis = (invoice: string): number => {
  return bolt11.decode(invoice).satoshis ?? 0
}

export const getBoltzApiUrl = (wallet: Wallet) => {
  return 'https://api-boltz-bitcoin.arkade.sh'
  return wallet.network === 'mainnet' ? 'https://api-boltz-bitcoin.arkade.sh' : 'http://localhost:9006'
}

export const getPubKey = async (): Promise<string> => {
  const sk = await window.dump()
  return hex.encode(secp.getPublicKey(sk))
}

export const submarineSwap = async (
  invoice: string,
  refundPublicKey: string,
  wallet: Wallet,
): Promise<{ address: string; amount: number }> => {
  const response = await fetch(`${getBoltzApiUrl(wallet)}/v2/swap/submarine`, {
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
  console.log('Swap created:', res)

  return { address: res.address, amount: res.expectedAmount }
}
