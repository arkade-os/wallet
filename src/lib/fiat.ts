import { consoleError } from './logs'
import { Currencies, Unit } from './types'

const YADIO_URL = 'https://api.yadio.io/exrates/BTC'
// A hung provider must not stall the feed: without a deadline a connection that
// accepts but never responds would block the fallback indefinitely.
const FETCH_TIMEOUT_MS = 10_000

// Keeps a single deadline over the whole request: both `fetch` (headers) and
// body consumption can hang independently, and either would otherwise block
// the feed (and its fallback) forever.
const fetchJsonWithTimeout = async (url: string): Promise<Record<string, any>> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const resp = await fetch(url, { signal: controller.signal })
    return await resp.json()
  } finally {
    clearTimeout(timeout)
  }
}

export interface FiatPrices {
  eur: number
  usd: number
  chf: number
  jpy: number
  gbp: number
  cny: number
  brl: number
  cup?: number
}

// Currencies listed here are prefixed with their symbol when displaying amounts.
// Those omitted (BRL, CHF, CNY, CUP) keep the trailing ISO code. BRL is explicit by
// product convention, while CNY skips ¥ to avoid clashing with JPY, and CUP has no
// widely-recognized currency symbol.
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

export const getPriceFeed = async (): Promise<FiatPrices | undefined> => {
  try {
    const yadio = await fetchYadioPrices()
    if (yadio) return yadio
  } catch (err) {
    consoleError(err, 'error fetching fiat prices from yadio')
  }

  // Fallback provider for regions where Yadio.io is unreachable.
  try {
    const json = await fetchJsonWithTimeout('https://blockchain.info/ticker')
    return {
      eur: json.EUR?.last,
      usd: json.USD?.last,
      chf: json.CHF?.last,
      jpy: json.JPY?.last,
      gbp: json.GBP?.last,
      cny: json.CNY?.last,
      brl: json.BRL?.last,
      cup: await getCupPrice(),
    }
  } catch (err) {
    consoleError(err, 'error fetching fiat prices')
  }
}

// Yadio.io is the primary feed: it publishes the real BTC->CUP rate (derived
// from the USD/CUP relationship on the Cuban market) plus every other currency
// in one response, so a single fetch covers the whole wallet.
const fetchYadioPrices = async (): Promise<FiatPrices | undefined> => {
  const json = await fetchJsonWithTimeout(YADIO_URL)
  const btc = json?.BTC
  // A connection may resolve yet omit a rate (or carry a non-numeric one).
  // Return undefined so a partial feed falls back instead of surfacing a
  // currency with no price to the provider.
  if (!btc) return undefined
  const rates = [btc.EUR, btc.USD, btc.CHF, btc.JPY, btc.GBP, btc.CNY, btc.BRL, btc.CUP] as (number | undefined)[]
  if (!rates.every((rate) => typeof rate === 'number')) return undefined
  return {
    eur: btc.EUR,
    usd: btc.USD,
    chf: btc.CHF,
    jpy: btc.JPY,
    gbp: btc.GBP,
    cny: btc.CNY,
    brl: btc.BRL,
    cup: btc.CUP,
  }
}

// blockchain.info does not quote the Cuban peso; Yadio.io (a Cuban market-data
// provider) publishes the BTC->CUP rate. Fetched separately so a failure there
// degrades only the CUP display, never the rest of the feed.
const getCupPrice = async (): Promise<number | undefined> => {
  try {
    const json = await fetchJsonWithTimeout(YADIO_URL)
    const cup = json?.BTC?.CUP
    return typeof cup === 'number' ? cup : undefined
  } catch (err) {
    consoleError(err, 'error fetching CUP price')
  }
}
