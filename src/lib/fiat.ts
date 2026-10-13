import Decimal from 'decimal.js'
import { consoleError } from './logs'
import { Currencies, Unit } from './types'

export interface FiatPrices {
  eur: number
  usd: number
  chf: number
  jpy: number
  gbp: number
  cny: number
  brl: number
}

// Currencies listed here are prefixed with their symbol when displaying amounts.
// Those omitted (BRL, CHF, CNY) keep the trailing ISO code. BRL is explicit by
// product convention, while CNY skips ¥ to avoid clashing with JPY.
export const FIAT_SYMBOLS: Partial<Record<Currencies, string>> = {
  [Currencies.USD]: '$',
  [Currencies.EUR]: '€',
  [Currencies.GBP]: '£',
  [Currencies.JPY]: '¥',
}

export const fiatDecimalsFor = (currency: Currencies, bitcoinUnit = Unit.BTC): number => {
  if (currency === Currencies.BTC) return bitcoinUnit === Unit.BTC ? 8 : 0
  return currency === Currencies.JPY ? 0 : 2
}

/** Fiat → sats without flooring, for reporting/display only — spending paths
 * keep the provider's floor-to-sat `fromFiatAmount`. Derives the rate from
 * `toFiatAmount` so both directions share one price source. */
export const reportingSatsForFiatAmount = (
  amount: number,
  currency: Currencies,
  toFiatAmount: (satoshis: number, currency: Currencies) => number,
): number => {
  const fiatPerBtc = toFiatAmount(100_000_000, currency)
  return fiatPerBtc ? Decimal.div(amount, fiatPerBtc).mul(100_000_000).toNumber() : 0
}

export const getPriceFeed = async (): Promise<FiatPrices | undefined> => {
  try {
    const resp = await fetch('https://blockchain.info/ticker')
    const json = await resp.json()
    return {
      eur: json.EUR?.last,
      usd: json.USD?.last,
      chf: json.CHF?.last,
      jpy: json.JPY?.last,
      gbp: json.GBP?.last,
      cny: json.CNY?.last,
      brl: json.BRL?.last,
    }
  } catch (err) {
    consoleError(err, 'error fetching fiat prices')
  }
}
