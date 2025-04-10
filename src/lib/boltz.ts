import { hex } from '@scure/base'
import { Wallet } from './types'
import { secp256k1 as secp } from '@noble/curves/secp256k1'
import { sendOffChain } from './asp'

export const decodeInvoice = (invoice: string): { invoice: string; satoshis: number } => {
  const decoded = '' // bolt11.decode(invoice)
  let satoshis = Number(findTag(decoded, 'satoshis'))
  if (!satoshis) satoshis = Math.floor(Number(findTag(decoded, 'millisatoshis') ?? 0) / 1000)
  return { invoice, satoshis }
}

const findTag = (decoded: any, tag: string) => {
  if (decoded[tag]) return decoded[tag]
  return decoded.tags.find((a: any) => a.tagName === tag)?.data
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
): Promise<{ txid: string; amount: number }> => {
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

  const txid = await sendOffChain(res.expectedAmount, res.address)
  if (!txid) throw 'Error sending transaction'

  return { txid, amount: res.expectedAmount }
}
