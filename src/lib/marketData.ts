import { LivelinePoint } from 'liveline'
import { Currencies } from './types'

const host = 'https://price-chart-proxy.arkade.money'

interface HistoricalMarketDataResponse {
  when: number
  from: string
  data: LivelinePoint[]
}

const PERIOD_WINDOWS = [
  { label: 'oneHour', secs: 3_600 },
  { label: 'oneDay', secs: 86_400 },
  { label: 'oneWeek', secs: 604_800 },
  { label: 'oneMonth', secs: 2_592_000 },
  { label: 'oneYear', secs: 31_536_000 },
  { label: 'all', secs: -1 },
]

const secsToPeriod = (secs: number): string => {
  const window = PERIOD_WINDOWS.find((w) => w.secs === secs)
  return window ? window.label : 'oneDay'
}

export const fetchHistoricalMarketData = async (
  secs: number,
  fiat: Currencies,
  signal?: AbortSignal,
): Promise<LivelinePoint[]> => {
  try {
    return fetchHistoricalMarketDataFromCoingecko(secs, fiat, signal)
  } catch {
    return fetchHistoricalMarketDataFromFallback(secs, fiat, signal)
  }
}

// coingecko

export const fetchHistoricalMarketDataFromCoingecko = async (
  secs: number,
  fiat: Currencies,
  signal?: AbortSignal,
): Promise<LivelinePoint[]> => {
  const url = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart'
  const days = Math.ceil(secs / 86_400) // convert seconds to days
  const params = new URLSearchParams({
    vs_currency: fiat.toLowerCase(),
    days: days.toString(),
  })
  const resp = await fetch(`${url}?${params.toString()}`, { signal })
  if (!resp.ok) throw new Error(`Market data fetch failed: ${resp.status}`)
  const data = await resp.json()
  if (!isValidCoingeckoResponse(data)) throw new Error('Invalid market data response')
  return data.prices.map(([time, value]) => ({ time: Math.floor(time / 1000), value }))
}

const isValidCoingeckoResponse = (data: unknown): data is { prices: [number, number][] } => {
  return (
    data !== null &&
    typeof data === 'object' &&
    typeof (data as any).prices === 'object' &&
    Array.isArray((data as any).prices) &&
    (data as any).prices.every(
      (point: unknown) =>
        Array.isArray(point) && point.length === 2 && typeof point[0] === 'number' && typeof point[1] === 'number',
    )
  )
}

// fallback

export const fetchHistoricalMarketDataFromFallback = async (
  secs: number,
  fiat: Currencies,
  signal?: AbortSignal,
): Promise<LivelinePoint[]> => {
  const period = secsToPeriod(secs)
  const params = new URLSearchParams({ period, fiat })
  const resp = await fetch(`${host}?${params.toString()}`, { signal })
  if (!resp.ok) throw new Error(`Market data fetch failed: ${resp.status}`)
  const data = await resp.json()
  return isValidFallbackResponse(data) ? data.data : []
}

const isValidFallbackResponse = (data: unknown): data is HistoricalMarketDataResponse => {
  return (
    data !== null &&
    typeof data === 'object' &&
    typeof (data as HistoricalMarketDataResponse).when === 'number' &&
    typeof (data as HistoricalMarketDataResponse).from === 'string' &&
    Array.isArray(data) &&
    data.every(
      (point) =>
        point !== null &&
        typeof point === 'object' &&
        typeof point.time === 'number' &&
        typeof point.value === 'number',
    )
  )
}
