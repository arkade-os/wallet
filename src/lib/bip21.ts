// https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki
// bitcoin:<address>[?amount=<amount>][?label=<label>][?message=<message>]

import { fromSatoshis, prettyNumber, toSatoshis } from './format'
import { isArkAddress } from './address'

export interface Bip21Decoded {
  address?: string
  arkAddress?: string
  satoshis?: number
  /** Raw amount in asset units when assetId is present (not converted to satoshis) */
  assetAmount?: number
  invoice?: string
  lnurl?: string
  assetId?: string
}

/** decode a bip21 uri */
export const decodeBip21 = (uri: string): Bip21Decoded => {
  const result: Bip21Decoded = {
    address: undefined,
    satoshis: undefined,
    invoice: undefined,
    lnurl: undefined,
  }

  // use lowercase for consistency
  const bip21Url = uri.trim()

  if (!bip21Url.toLowerCase().startsWith('bitcoin:')) {
    throw new Error('Invalid BIP21 URI')
  }

  // remove 'bitcoin:' prefix
  const urlWithoutPrefix = bip21Url.slice(8)

  // split address and query parameters
  const [address, queryString] = urlWithoutPrefix.split('?')

  result.address = address

  if (queryString) {
    const params = new URLSearchParams(queryString)

    if (params.has('ark')) {
      const arkAddress = params.get('ark') ?? ''
      if (isArkAddress(arkAddress)) result.arkAddress = arkAddress
    }

    if (params.has('assetid')) {
      result.assetId = params.get('assetid')!
    }

    if (params.has('amount')) {
      const amount = parseFloat(params.get('amount')!)
      if (isNaN(amount) || amount < 0 || !isFinite(amount)) throw new Error('Invalid amount')
      if (result.assetId != null) {
        result.assetAmount = amount
      } else {
        result.satoshis = toSatoshis(amount)
      }
    }

    if (params.has('lightning')) {
      if (params.get('lightning')?.startsWith('lnurl')) {
        result.lnurl = params.get('lightning')!
      } else if (params.get('lightning')?.startsWith('ln')) {
        result.invoice = params.get('lightning')!
      }
    }
  }

  return result
}

export const encodeBip21 = (address: string, arkAddress: string, invoice: string, sats: number) => {
  return (
    `bitcoin:${address}` +
    `?ark=${arkAddress}` +
    (invoice ? `&lightning=${invoice}` : '') +
    `&amount=${prettyNumber(fromSatoshis(sats))}`
  )
}

export const encodeBip21Asset = (arkAddress: string, assetId: string, amount: number) => {
  return `bitcoin:?ark=${arkAddress}&assetid=${assetId}&amount=${amount}`
}

export const isBip21 = (data: string): boolean => {
  try {
    decodeBip21(data)
    return true
  } catch {
    return false
  }
}
