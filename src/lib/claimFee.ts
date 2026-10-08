import { consoleError } from './logs'

const FEE_ESTIMATE_TIMEOUT_MS = 15_000

/**
 * sat/vB floor for a real reading, not a fallback when no estimate is usable:
 * without an estimate the caller refuses to claim rather than revealing the
 * preimage at a made-up rate. Through `usableRate` it is also the bar an
 * estimate must clear to be believed at all — at 3 the wallet would stop
 * believing a genuine 1-2 sat/vB network and overpay whenever the mempool is
 * calm.
 */
export const MIN_CLAIM_FEE_RATE = 1

const usableRate = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > MIN_CLAIM_FEE_RATE

/**
 * `ESPLORA_URL` mixes backends: Arkade's hosts are mempool.space, serving named
 * tiers and 404ing Esplora's `/fee-estimates`, while its `testnet` entry is real
 * mempool.space, which serves that path at HTTP 203. Hence two shapes, not one
 * hardcoded. `fastestFee` is the tightest tier mempool names, and erring fast is
 * the safe direction when an unconfirmed claim loses the fill.
 */
const FEE_SOURCES = [
  { path: '/v1/fees/recommended', keys: ['fastestFee', 'halfHourFee'] },
  { path: '/fee-estimates', keys: ['2', '1', '3'] },
] as const

/** `undefined` only when the shape is not served — what keeps a 404 or HTML apart from a merely cheap network. */
const readSource = async (
  url: string,
  keys: readonly string[],
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ rate?: number } | undefined> => {
  try {
    const response = await fetchImpl(url, { signal })
    if (!response.ok) return undefined
    if (!response.headers.get('content-type')?.includes('json')) return undefined
    const body = (await response.json()) as Record<string, unknown>
    // A 200 JSON body with none of the known keys is wrong shape: treat it as no answer.
    const hasKnownKey = keys.some((key) => typeof body[key] === 'number' && Number.isFinite(body[key]))
    if (!hasKnownKey) return undefined
    // First USABLE tier, not first present: `??` would take one reported as 0
    // and drop a deadline-racing claim to the floor beside a good one.
    return { rate: keys.map((key) => body[key]).find(usableRate) }
  } catch {
    return undefined
  }
}

/** sat/vB. Returns `undefined` when no fee source answers; the caller must refuse to claim. */
export const claimFeeRate = async (baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<number | undefined> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FEE_ESTIMATE_TIMEOUT_MS)
  try {
    const base = baseUrl.replace(/\/+$/, '')
    for (const { path, keys } of FEE_SOURCES) {
      const reading = await readSource(`${base}${path}`, keys, fetchImpl, controller.signal)
      if (reading) return reading.rate === undefined ? MIN_CLAIM_FEE_RATE : Math.ceil(reading.rate)
    }
    consoleError(`no fee source answered at ${base}`, 'claim fee')
    return undefined
  } catch (err) {
    consoleError(err, 'claim fee')
    return undefined
  } finally {
    clearTimeout(timer)
  }
}
