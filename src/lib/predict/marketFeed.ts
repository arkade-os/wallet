import { openingSample, windowOpen } from './pricing'

export interface PriceSample {
  priceCents: number
  time: number
}

export interface PredictMarketSnapshot {
  priceCents: number
  samples: PriceSample[]
  vol: number
  source: 'dia' | 'deribit'
  updatedAt: number
}

const DERIBIT_INDEX_URL = 'https://www.deribit.com/api/v2/public/get_index_price?index_name=btc_usd'
const DERIBIT_VOL_URL = 'https://www.deribit.com/api/v2/public/get_historical_volatility?currency=BTC'
const DEFAULT_VOL = 0.55

let cachedVol: { value: number; at: number } | null = null

export async function fetchBtcVol(signal?: AbortSignal): Promise<number> {
  if (cachedVol && Date.now() - cachedVol.at < 5 * 60_000) return cachedVol.value
  try {
    const res = await fetch(DERIBIT_VOL_URL, { signal })
    if (!res.ok) return cachedVol?.value ?? DEFAULT_VOL
    const body = (await res.json()) as { result?: [number, number][] }
    const rows = body.result
    if (!Array.isArray(rows) || rows.length === 0) return cachedVol?.value ?? DEFAULT_VOL
    const latest = rows[rows.length - 1]?.[1]
    if (typeof latest !== 'number' || !Number.isFinite(latest) || latest <= 0) return cachedVol?.value ?? DEFAULT_VOL
    const vol = Math.max(0.15, Math.min(2.5, latest / 100))
    cachedVol = { value: vol, at: Date.now() }
    return vol
  } catch {
    return cachedVol?.value ?? DEFAULT_VOL
  }
}

export async function fetchOraclePriceSamples(oraclePricesUrl: string, signal?: AbortSignal): Promise<PriceSample[]> {
  const res = await fetch(oraclePricesUrl, { signal, cache: 'no-store' })
  if (!res.ok) throw new Error(`Oracle prices returned ${res.status}`)
  const body = (await res.json()) as { samples?: { price?: unknown; time?: unknown }[] }
  if (!body || !Array.isArray(body.samples)) throw new Error('Invalid oracle prices payload')
  const out: PriceSample[] = []
  for (const row of body.samples) {
    if (!row || typeof row !== 'object') continue
    const price = typeof row.price === 'string' ? Number(row.price) : Number(row.price)
    const time = typeof row.time === 'number' ? row.time : Number(row.time)
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(time) || time <= 0) continue
    out.push({ priceCents: Math.round(price), time: Math.floor(time) })
  }
  out.sort((a, b) => a.time - b.time)
  return out
}

export async function fetchDeribitSpotCents(signal?: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch(DERIBIT_INDEX_URL, { signal })
    if (!res.ok) return null
    const body = (await res.json()) as { result?: { index_price?: unknown } }
    const usd = Number(body.result?.index_price)
    if (!Number.isFinite(usd) || usd <= 0) return null
    return Math.round(usd * 100)
  } catch {
    return null
  }
}

export async function fetchPredictMarket(
  oraclePricesUrl: string,
  prevSamples: PriceSample[] = [],
  signal?: AbortSignal,
): Promise<PredictMarketSnapshot | null> {
  const volPromise = fetchBtcVol(signal)
  try {
    const samples = await fetchOraclePriceSamples(oraclePricesUrl, signal)
    if (samples.length > 0) {
      const merged = mergeSamples(prevSamples, samples)
      const latest = merged[merged.length - 1]!
      return {
        priceCents: latest.priceCents,
        samples: merged,
        vol: await volPromise,
        source: 'dia',
        updatedAt: Date.now(),
      }
    }
  } catch {
    // Fall back to Deribit spot index when oracle proxy is unavailable.
  }

  const spot = await fetchDeribitSpotCents(signal)
  if (spot == null) return null
  const nowSec = Math.floor(Date.now() / 1000)
  const merged = mergeSamples(prevSamples, [{ priceCents: spot, time: nowSec }])
  return {
    priceCents: spot,
    samples: merged,
    vol: await volPromise,
    source: 'deribit',
    updatedAt: Date.now(),
  }
}

function mergeSamples(prev: PriceSample[], next: PriceSample[]): PriceSample[] {
  const byTime = new Map<number, number>()
  for (const s of prev) byTime.set(s.time, s.priceCents)
  for (const s of next) byTime.set(s.time, s.priceCents)
  const cutoff = Math.floor(Date.now() / 1000) - 3_600
  return [...byTime.entries()]
    .filter(([time]) => time >= cutoff)
    .sort((a, b) => a[0] - b[0])
    .slice(-180)
    .map(([time, priceCents]) => ({ time, priceCents }))
}

/** Opening line for a 5-minute window: first DIA sample at/after window open, or latest spot fallback. */
export function resolveWindowLineCents(
  samples: readonly PriceSample[],
  expiry: number,
  fallbackPriceCents: number | null,
): { lineCents: number | null; official: boolean } {
  const open = windowOpen(expiry)
  const sample = openingSample(samples, open)
  if (sample) return { lineCents: sample.priceCents, official: true }
  return { lineCents: fallbackPriceCents, official: false }
}
