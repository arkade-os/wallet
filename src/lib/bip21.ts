// https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki
// bitcoin:<address>[?amount=<amount>][?label=<label>][?message=<message>]

import { fromSatoshis, prettyNumber, toSatoshis } from './format'
import { isValidArkAddress } from '@arkade-os/sdk'
import { centsToUnits } from './assets'

export interface Bip21Taxi {
  url: string
  operatorKey: string
  fareId?: string
}

export interface Bip21Decoded {
  address?: string
  arkAddress?: string
  satoshis?: number
  /** Raw amount in asset units when assetId is present (not converted to satoshis) */
  assetAmount?: string
  invoice?: string
  lnUrl?: string
  assetId?: string
  taxi?: Bip21Taxi
}

/** decode a bip21 uri */
export const decodeBip21 = (uri: string): Bip21Decoded => {
  const result: Bip21Decoded = {
    address: undefined,
    satoshis: undefined,
    invoice: undefined,
    lnUrl: undefined,
    assetId: undefined,
    assetAmount: undefined,
    arkAddress: undefined,
    taxi: undefined,
  }

  const bip21Url = uri.trim()

  if (!bip21Url.toLowerCase().startsWith('bitcoin:')) {
    throw new Error('Invalid BIP21 URI')
  }

  // remove 'bitcoin:' prefix
  const urlWithoutPrefix = bip21Url.slice(8)

  // split address and query parameters
  const [address, queryString] = urlWithoutPrefix.split('?')

  if (address) result.address = address

  if (queryString) {
    const params = new URLSearchParams(queryString)

    // BIP21 query keys are case-insensitive — match them regardless of case
    // (e.g. 'ark', 'ARK', 'Ark'), so QR codes and mixed-case URIs all parse.
    const getParam = (name: string): string | null => {
      for (const [key, value] of params) {
        if (key.toLowerCase() === name) return value
      }
      return null
    }

    const arkAddress = getParam('ark')
    if (arkAddress && isValidArkAddress(arkAddress)) result.arkAddress = arkAddress

    const assetId = getParam('assetid')
    if (assetId) result.assetId = assetId

    const amountParam = getParam('amount')
    if (amountParam != null) {
      if (result.assetId != null) {
        if (!amountParam.match(/^\d+(\.\d+)?$/)) throw new Error('Invalid asset amount')
        result.assetAmount = amountParam
      } else {
        const amount = Number(amountParam)
        if (isNaN(amount) || amount < 0 || !isFinite(amount)) throw new Error('Invalid amount')
        result.satoshis = toSatoshis(Number(amount))
      }
    }

    const lightning = getParam('lightning')
    if (lightning) {
      if (lightning.toLowerCase().startsWith('lnurl')) {
        result.lnUrl = lightning
      } else if (lightning.toLowerCase().startsWith('ln')) {
        result.invoice = lightning
      }
    }

    // taxi/taxikey/taxifare are all-or-nothing: any invalid member drops the whole triple,
    // and the rest still decodes as an ordinary payment request.
    const taxiUrl = getParam('taxi')
    const taxiKey = getParam('taxikey')
    if (taxiUrl != null && taxiKey != null && /^[0-9a-f]{64}$/.test(taxiKey)) {
      try {
        const parsed = new URL(taxiUrl)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          const fareId = getParam('taxifare')
          result.taxi = { url: taxiUrl, operatorKey: taxiKey, ...(fareId ? { fareId } : {}) }
        }
      } catch {
        // not a parseable URL — leave result.taxi undefined
      }
    }
  }

  return result
}

export const encodeBip21 = (address: string, arkAddress: string, invoice: string, sats: number, lnurl?: string) => {
  const bip21 =
    `bitcoin:${address}?` +
    (arkAddress ? `ark=${arkAddress}&` : '') +
    (invoice ? `lightning=${invoice}&` : lnurl ? `lightning=${lnurl}&` : '') +
    // useGrouping=false: BIP21 amounts must be plain decimals, never '1,000'
    (sats ? `amount=${prettyNumber(fromSatoshis(sats), 8, false)}` : '')
  return bip21.endsWith('&') || bip21.endsWith('?') ? bip21.slice(0, -1) : bip21
}

export const encodeBip21Asset = (
  arkAddress: string,
  assetId: string,
  cents: bigint,
  decimals?: number,
  taxi?: Bip21Taxi,
) => {
  const base = `bitcoin:?ark=${arkAddress}&assetid=${assetId}&amount=${centsToUnits(cents, decimals)}`
  if (!taxi) return base
  const fare = taxi.fareId ? `&taxifare=${encodeURIComponent(taxi.fareId)}` : ''
  return `${base}&taxi=${encodeURIComponent(taxi.url)}&taxikey=${taxi.operatorKey}${fare}`
}

export const isBip21 = (data: string): boolean => {
  try {
    decodeBip21(data)
    return true
  } catch {
    return false
  }
}
