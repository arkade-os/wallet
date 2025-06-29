// https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki
// bitcoin:<address>[?amount=<amount>][?label=<label>][?message=<message>]

import qs from 'qs'
import { fromSatoshis, prettyNumber, toSatoshis } from './format'

export const decode = (uri: string) => {
  if (!isBip21(uri)) throw new Error('Invalid BIP21 URI: ' + uri)
  let destination, options, query, satoshis

  const [scheme, rest] = uri.split(':')
  if (rest.indexOf('?') !== -1) {
    const split = rest.split('?')
    destination = split[0]
    query = split[1]
  } else {
    destination = rest
  }

  if (query) options = qs.parse(query)

  if (options?.amount) {
    satoshis = toSatoshis(Number(options.amount))
    if (!isFinite(satoshis)) throw new Error('Invalid amount')
    if (satoshis < 0) throw new Error('Invalid amount')
  }

  const arkAddress = /^ark/.test(scheme) ? destination : (options?.ark as string)
  const invoice = /^lightning/.test(scheme) ? destination : (options?.lightning as string)
  const address = /^bitcoin/.test(scheme) ? destination : (options?.liquidnetwork as string)

  return { address, arkAddress, destination, invoice, options, satoshis, scheme }
}

export const encode = (address: string, arkAddress: string, invoice: string, sats: number) => {
  return (
    `bitcoin:${address}` +
    `?ark=${arkAddress}` +
    (invoice ? `&lightning=${invoice}` : '') +
    `&amount=${prettyNumber(fromSatoshis(sats))}`
  )
}

export const isBip21 = (data: string): boolean => {
  return /^(bitcoin|lightning|liquidnetwork|liquidtestnet):([a-z0-9]{26,}).*$/.test(data.toLowerCase())
}
