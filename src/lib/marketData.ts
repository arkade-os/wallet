import { LivelinePoint } from 'liveline'
import { Currencies } from './types'

const host = 'https://fetch-json.bordalix.workers.dev' // TODO: move to final worker URL

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
