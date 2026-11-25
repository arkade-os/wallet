import {
  BEACON_READ_FEE,
  DUST_SATS,
  MULTIPLIER_MAX,
  MULTIPLIER_MIN,
  PREDICT_EDGE,
  PREDICT_GRID_S,
  PREDICT_LOCK_S,
  PREDICT_MAX_AHEAD_S,
  PREDICT_MIN_LEFT_S,
  type PredictKind,
} from './constants'

export const WINDOW_LINE_WITHIN_S = 120

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const a = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * a)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)
  return sign * y
}

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2))
}

/** Chance BTC closes above the line. Lognormal, r = 0: N(d2). */
export function probAbove(spot: number, line: number, years: number, vol: number): number {
  if (!(spot > 0) || !(line > 0)) return 0
  if (years <= 0 || vol <= 0) return spot > line ? 1 : 0
  const s = vol * Math.sqrt(years)
  const d2 = (Math.log(spot / line) - 0.5 * vol * vol * years) / s
  return normCdf(d2)
}

/** Fair odds less the desk's edge, truncated to 0.01. Null outside [1.05x, 10x]. */
export function predictMultiplier(input: {
  kind: PredictKind
  spotCents: number
  lineCents: number
  years: number
  vol: number
  edge?: number
}): number | null {
  const up = probAbove(input.spotCents, input.lineCents, input.years, input.vol)
  const p = input.kind === 2 ? up : 1 - up
  if (!(p > 0)) return null
  const edge = input.edge ?? PREDICT_EDGE
  const multiplier = Math.floor(((1 - edge) / p) * 100) / 100
  if (!Number.isFinite(multiplier) || multiplier < MULTIPLIER_MIN || multiplier > MULTIPLIER_MAX) return null
  return multiplier
}

export function predictPayout(stake: bigint, multiplier: number): bigint {
  return (stake * BigInt(Math.round(multiplier * 100))) / 100n
}

export function payoutMultiplier(stake: bigint, payout: bigint): number {
  if (stake <= 0n) return 0
  return Number((payout * 100n) / stake) / 100
}

export function payoutRefusal(payout: bigint, stake: bigint, readFee: bigint, qMax: bigint): string {
  if (payout > qMax) return 'payout'
  if (payout - readFee <= stake) return 'payout'
  return ''
}

export function windowOpen(expiry: number, grid: number = PREDICT_GRID_S): number {
  return expiry - grid
}

/** First oracle sample at or after `open`, within `within` seconds. */
export function openingSample<T extends { time: number }>(
  samples: readonly T[],
  open: number,
  within: number = WINDOW_LINE_WITHIN_S,
): T | null {
  const pool = samples.filter((sample) => sample.time >= open && sample.time <= open + within)
  if (!pool.length) return null
  return pool.reduce((first, sample) => (sample.time < first.time ? sample : first))
}

/** Next `count` valid 5-minute grid close timestamps (unix seconds). */
export function upcomingWindows(nowSec: number, count = 3): number[] {
  const minExpiry = nowSec + PREDICT_LOCK_S + PREDICT_MIN_LEFT_S
  const maxExpiry = nowSec + PREDICT_MAX_AHEAD_S
  const first = Math.ceil(minExpiry / PREDICT_GRID_S) * PREDICT_GRID_S
  const out: number[] = []
  for (let t = first; t <= maxExpiry && out.length < count; t += PREDICT_GRID_S) {
    out.push(t)
  }
  return out
}

/** Predict payoff: all-or-nothing. Exact tie on the line goes to the desk. */
export function holderPayoff(kind: PredictKind, priceCents: bigint, strikeCents: bigint, collateral: bigint): bigint {
  const won = kind === 2 ? priceCents > strikeCents : priceCents < strikeCents
  return won ? collateral : 0n
}

export function settlementOutputs(
  holderGross: bigint,
  locked: bigint,
  readFee: bigint = BEACON_READ_FEE,
):
  | { mode: 'holder'; holder: bigint }
  | { mode: 'writer'; writer: bigint }
  | { mode: 'split'; holder: bigint; writer: bigint } {
  const net = locked - readFee
  if (holderGross <= 0n) return { mode: 'writer', writer: net }
  if (holderGross >= locked) return { mode: 'holder', holder: net }
  const holder = holderGross > readFee ? holderGross - readFee : 0n
  const writer = net - holder
  if (holder <= DUST_SATS) return { mode: 'writer', writer: net }
  if (writer <= DUST_SATS) return { mode: 'holder', holder: net }
  return { mode: 'split', holder, writer }
}

export function usdFromCents(cents: bigint | number): string {
  const value = typeof cents === 'bigint' ? cents : BigInt(Math.round(cents))
  const neg = value < 0n
  const v = neg ? -value : value
  const whole = (v / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const frac = (v % 100n).toString().padStart(2, '0')
  return `${neg ? '-' : ''}$${whole}.${frac}`
}

export function formatCountdown(secondsLeft: number): string {
  const s = Math.max(0, Math.floor(secondsLeft))
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
