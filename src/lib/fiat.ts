import { consoleError } from './logs'
import { Fiats } from './types'

export interface FiatPrices {
  eur: number
  usd: number
  chf: number
  jpy: number
  gbp: number
  cny: number
}

// Currencies listed here are prefixed with their symbol when displaying amounts.
// Those omitted (CHF, CNY) keep the trailing ISO code — CNY skips ¥ to avoid
// clashing with JPY.
export const FIAT_SYMBOLS: Partial<Record<Fiats, string>> = {
  [Fiats.USD]: '$',
  [Fiats.EUR]: '€',
  [Fiats.GBP]: '£',
  [Fiats.JPY]: '¥',
}

export const fiatDecimalsFor = (currency: Fiats): number => (currency === Fiats.JPY ? 0 : 2)

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
    }
  } catch (err) {
    consoleError(err, 'error fetching fiat prices')
  }
}
