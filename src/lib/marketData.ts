import { LivelinePoint } from 'liveline'
import { Currencies } from './types'

const host = 'https://price-chart-proxy.arkade.money'
const binanceHost = 'https://data-api.binance.vision/api/v3/klines'

const DEFAULT_CONSTANT_SERIES_WINDOW_SECS = 86_400
const CONSTANT_SERIES_INTERVALS = 100

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

const BRL_KLINES: Record<string, { interval: string; limit: number }> = {
  oneHour: { interval: '1m', limit: 60 },
  oneDay: { interval: '15m', limit: 96 },
  oneWeek: { interval: '1h', limit: 168 },
  oneMonth: { interval: '4h', limit: 180 },
  oneYear: { interval: '1d', limit: 365 },
  all: { interval: '1w', limit: 1000 },
}

const secsToPeriod = (secs: number): string => {
  const window = PERIOD_WINDOWS.find((w) => w.secs === secs)
  return window ? window.label : 'oneDay'
}

export const buildConstantMarketSeries = (
  value: number,
  windowSecs: number,
  now = Math.floor(Date.now() / 1000),
): LivelinePoint[] => {
  const duration = windowSecs > 0 ? windowSecs : DEFAULT_CONSTANT_SERIES_WINDOW_SECS
  const intervalCount = Math.max(1, Math.min(CONSTANT_SERIES_INTERVALS, Math.floor(duration)))
  const start = now - duration

  return Array.from({ length: intervalCount + 1 }, (_, index) => ({
    time: start + Math.floor((duration * index) / intervalCount),
    value,
  }))
}

export const fetchHistoricalMarketData = async (
  secs: number,
  fiat: Currencies,
  signal?: AbortSignal,
): Promise<LivelinePoint[]> => {
  if (fiat === Currencies.BRL) {
    try {
      return await fetchBrlMarketData(secs, signal)
    } catch (err) {
      if (signal?.aborted) throw err
    }
  }

  const period = secsToPeriod(secs)
  const params = new URLSearchParams({ period, fiat })
  const resp = await fetch(`${host}?${params.toString()}`, { signal })
  if (!resp.ok) throw new Error(`Market data fetch failed: ${resp.status}`)
  const data = await resp.json()
  return isValidHistoricalMarketDataResponse(data) ? data.data : []
}

const fetchBrlMarketData = async (secs: number, signal?: AbortSignal): Promise<LivelinePoint[]> => {
  const { interval, limit } = BRL_KLINES[secsToPeriod(secs)]
  const params = new URLSearchParams({ symbol: 'BTCBRL', interval, limit: limit.toString() })
  const resp = await fetch(`${binanceHost}?${params.toString()}`, { signal })
  if (!resp.ok) throw new Error(`BRL market data fetch failed: ${resp.status}`)

  const data = await resp.json()
  if (!Array.isArray(data)) throw new Error('Invalid BRL market data response')

  const points = data.flatMap((candle): LivelinePoint[] => {
    if (!Array.isArray(candle)) return []
    const time = Math.floor(Number(candle[0]) / 1000)
    const value = Number(candle[4])
    return Number.isFinite(time) && time > 0 && Number.isFinite(value) && value > 0 ? [{ time, value }] : []
  })

  if (points.length < 2) throw new Error('Invalid BRL market data response')
  return points
}

export const buildCrossRatePoints = (sourcePoints: LivelinePoint[], marketPoints: LivelinePoint[]): LivelinePoint[] => {
  const source = validMarketPoints(sourcePoints)
  const market = validMarketPoints(marketPoints)
  if (source.length < 2 || market.length < 2) return []

  const tolerance = Math.ceil(Math.max(estimatePointInterval(source), estimatePointInterval(market)) * 1.5)
  let marketIndex = 0

  return source.flatMap((sourcePoint) => {
    while (
      marketIndex + 1 < market.length &&
      Math.abs(market[marketIndex + 1].time - sourcePoint.time) <= Math.abs(market[marketIndex].time - sourcePoint.time)
    ) {
      marketIndex += 1
    }

    const marketPoint = market[marketIndex]
    if (!marketPoint || Math.abs(marketPoint.time - sourcePoint.time) > tolerance) return []
    return [{ time: sourcePoint.time, value: marketPoint.value / sourcePoint.value }]
  })
}

const validMarketPoints = (points: LivelinePoint[]): LivelinePoint[] => {
  return points
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value) && point.time > 0 && point.value > 0)
    .sort((a, b) => a.time - b.time)
}

const estimatePointInterval = (points: LivelinePoint[]): number => {
  const intervals = points
    .slice(1)
    .map((point, index) => point.time - points[index].time)
    .filter((interval) => interval > 0)
    .sort((a, b) => a - b)

  return intervals[Math.floor(intervals.length / 2)] ?? 3_600
}

const isValidHistoricalMarketDataResponse = (data: unknown): data is HistoricalMarketDataResponse => {
  return (
    data !== null &&
    typeof data === 'object' &&
    typeof (data as HistoricalMarketDataResponse).when === 'number' &&
    typeof (data as HistoricalMarketDataResponse).from === 'string' &&
    Array.isArray((data as HistoricalMarketDataResponse).data) &&
    (data as HistoricalMarketDataResponse).data.every(
      (point) =>
        point !== null &&
        typeof point === 'object' &&
        typeof point.time === 'number' &&
        typeof point.value === 'number',
    )
  )
}
