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
  const period = secsToPeriod(secs)
  const params = new URLSearchParams({ period, fiat })
  const resp = await fetch(`${host}?${params.toString()}`, { signal })
  if (!resp.ok) throw new Error(`Market data fetch failed: ${resp.status}`)
  const data = await resp.json()
  return isValidHistoricalMarketDataResponse(data) ? data.data : []
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
