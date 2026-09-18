import { consoleError } from './logs'
import { Currencies, Unit } from './types'

const YADIO_URL = 'https://api.yadio.io/exrates/BTC'
// A hung provider must not stall the feed: without a deadline a connection that
// accepts but never responds would block the fallback indefinitely.
const FETCH_TIMEOUT_MS = 10_000

// Keeps a single deadline over the whole request: both `fetch` (headers) and
// body consumption can hang independently, and either would otherwise block
// the feed (and its fallback) forever. The deadline is raced against each step
// instead of being passed as an AbortSignal, because the jsdom test environment
// hands out a signal type the fetch Request constructor rejects.
const fetchJsonWithTimeout = async (url: string): Promise<Record<string, any>> => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms`)), FETCH_TIMEOUT_MS)
  })
  try {
    const resp = await Promise.race([fetch(url), deadline])
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return await Promise.race([resp.json(), deadline])
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
  // currency with no price to the provider. CUP is optional: its absence only
  // degrades the CUP display, never the rest of the feed.
  if (!btc) return undefined
  const nonCupRates = [btc.EUR, btc.USD, btc.CHF, btc.JPY, btc.GBP, btc.CNY, btc.BRL] as (number | undefined)[]
  if (!nonCupRates.every((rate) => typeof rate === 'number' && Number.isFinite(rate) && rate > 0)) return undefined
  return {
    eur: btc.EUR,
    usd: btc.USD,
    chf: btc.CHF,
    jpy: btc.JPY,
    gbp: btc.GBP,
    cny: btc.CNY,
    brl: btc.BRL,
    cup: Number.isFinite(btc.CUP) && btc.CUP > 0 ? btc.CUP : undefined,
  }
}

// blockchain.info does not quote the Cuban peso; Yadio.io (a Cuban market-data
// provider) publishes the BTC->CUP rate. Fetched separately so a failure there
// degrades only the CUP display, never the rest of the feed.
const getCupPrice = async (): Promise<number | undefined> => {
  try {
    const json = await fetchJsonWithTimeout(YADIO_URL)
    const cup = json?.BTC?.CUP
    return Number.isFinite(cup) && cup > 0 ? cup : undefined
  } catch (err) {
    consoleError(err, 'error fetching CUP price')
  }
}
