import { useContext, useEffect, useMemo, useState } from 'react'
import { ConfigContext } from '../providers/config'
import { Currencies } from '../lib/types'
import { fetchHistoricalMarketData } from '../lib/marketData'
import { usePortfolioFiat } from './usePortfolioFiat'

const MONTH_SECS = 2_592_000
const CACHE_TTL_MS = 10 * 60 * 1000
const MAX_POINTS = 48

interface PricePoint {
  time: number
  value: number
}

const priceCache = new Map<string, { at: number; points: PricePoint[] }>()

export interface PortfolioHistory {
  /** What today's holdings were worth at each point of the past month. */
  points: PricePoint[]
  /** Change in value over the window, in the display currency. */
  delta: number
  /** The same change as a fraction of the starting value. */
  ratio: number
  status: 'loading' | 'ready' | 'unavailable'
}

const unavailable: PortfolioHistory = { points: [], delta: 0, ratio: 0, status: 'unavailable' }

const thin = (points: PricePoint[]): PricePoint[] => {
  if (points.length <= MAX_POINTS) return points
  const step = (points.length - 1) / (MAX_POINTS - 1)
  return Array.from({ length: MAX_POINTS }, (_, i) => points[Math.round(i * step)])
}

/**
 * The value of the wallet's current holdings over the past month.
 *
 * This is not a transaction history: it re-prices what the wallet holds today
 * at the Bitcoin price of each past moment, and holds fiat accounts flat. That
 * is what the Home chart and its "this month" change show.
 */
export function usePortfolioHistory(): PortfolioHistory {
  const { config } = useContext(ConfigContext)
  const { rows, totalFiat } = usePortfolioFiat()
  const currency = config.currency
  const btcFiat = rows.find((row) => row.assetId === 'btc')?.fiatAmount ?? 0
  const canChart = currency !== Currencies.BTC && btcFiat > 0

  const [prices, setPrices] = useState<PricePoint[] | undefined>(() => {
    const cached = priceCache.get(currency)
    return cached && Date.now() - cached.at < CACHE_TTL_MS ? cached.points : undefined
  })
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!canChart) return
    const cached = priceCache.get(currency)
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setPrices(cached.points)
      return
    }
    const controller = new AbortController()
    setFailed(false)
    fetchHistoricalMarketData(MONTH_SECS, currency, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        const points = thin(data.filter((p) => Number.isFinite(p.value) && p.value > 0))
        if (points.length < 2) return setFailed(true)
        priceCache.set(currency, { at: Date.now(), points })
        setPrices(points)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [canChart, currency])

  return useMemo(() => {
    if (!canChart || failed) return unavailable
    if (!prices || prices.length < 2) return { ...unavailable, status: 'loading' as const }
    const last = prices.at(-1)?.value ?? 0
    if (!(last > 0)) return unavailable
    const flat = totalFiat - btcFiat
    const points = prices.map((p) => ({ time: p.time, value: (btcFiat * p.value) / last + flat }))
    const first = points[0].value
    const delta = totalFiat - first
    return { points, delta, ratio: first > 0 ? delta / first : 0, status: 'ready' as const }
  }, [btcFiat, canChart, failed, prices, totalFiat])
}
