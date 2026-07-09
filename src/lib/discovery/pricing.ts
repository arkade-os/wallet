// Maker pricing math for the Arkade Market Discovery Protocol v0.
// Pure functions, no I/O. All arithmetic is bigint over scaled integers —
// no floating point ever touches an amount.

import { DiscoveryValidationError } from './errors'
import { DEFAULT_SAFETY_BPS } from './types'

const BPS_DENOMINATOR = BigInt(10000)

/**
 * A price in quote-units-per-base-unit, kept as an exact rational so no
 * precision is lost between the feed observation and the amount math.
 */
export interface Price {
  num: bigint
  den: bigint
}

/**
 * Trade direction relative to the market's pair:
 * - `base-to-quote`: deposit base asset, want quote (uses P)
 * - `quote-to-base`: deposit quote asset, want base (uses 1/P)
 */
export type SwapDirection = 'base-to-quote' | 'quote-to-base'

/** Parse a decimal string or number into an exact scaled integer (no floats). */
export function parseDecimal(value: string | number): { mantissa: bigint; scale: number } {
  const text = typeof value === 'number' ? String(value) : value.trim()
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text)
  if (!match) throw new DiscoveryValidationError(`not a decimal number: "${text}"`)
  const [, sign, integer, fraction = '', exponent = '0'] = match
  let mantissa = BigInt(`${sign}${integer}${fraction}`)
  let scale = fraction.length - Number(exponent)
  if (scale < 0) {
    mantissa *= BigInt(10) ** BigInt(-scale)
    scale = 0
  }
  return { mantissa, scale }
}

/**
 * Normalize a raw feed observation to quote-units-per-base-unit using the
 * market's `invert` and `price_decimals` (spec: maker flow step 4).
 *
 * The raw feed value divided by 10^price_decimals gives the feed's price;
 * `invert` flips it when the feed quotes the pair the other way around.
 * Pass the observation as a string when possible to avoid float round-trips.
 */
export function feedPrice(observation: string | number, market: { price_decimals: number; invert: boolean }): Price {
  if (!Number.isInteger(market.price_decimals) || market.price_decimals < 0) {
    throw new DiscoveryValidationError(`invalid price_decimals: ${market.price_decimals}`)
  }
  const { mantissa, scale } = parseDecimal(observation)
  if (mantissa <= BigInt(0)) {
    throw new DiscoveryValidationError(`feed observation must be a positive number, got "${observation}"`)
  }
  const den = BigInt(10) ** BigInt(scale + market.price_decimals)
  return market.invert ? { num: den, den: mantissa } : { num: mantissa, den }
}

/**
 * Spec formula: `wantAmount = floor(D * P * (1 - (fee_bps + safety_bps) / 10000))`,
 * symmetric with 1/P for the reverse direction.
 *
 * `depositAmount` is the funded amount in the *deposit-side* asset's smallest
 * units (base asset for `base-to-quote`, quote asset for `quote-to-base`).
 * Returns the wantAmount in the opposite side's smallest units.
 */
export function computeWantAmount({
  depositAmount,
  price,
  feeBps,
  safetyBps = DEFAULT_SAFETY_BPS,
  direction,
}: {
  depositAmount: bigint
  price: Price
  feeBps: number
  safetyBps?: number
  direction: SwapDirection
}): bigint {
  if (typeof depositAmount !== 'bigint' || depositAmount <= BigInt(0)) {
    throw new DiscoveryValidationError(`depositAmount must be a positive bigint, got ${depositAmount}`)
  }
  for (const [label, bps] of [
    ['feeBps', feeBps],
    ['safetyBps', safetyBps],
  ] as const) {
    if (!Number.isInteger(bps) || bps < 0) {
      throw new DiscoveryValidationError(`${label} must be a non-negative integer, got ${bps}`)
    }
  }
  const totalBps = BigInt(feeBps) + BigInt(safetyBps)
  if (totalBps >= BPS_DENOMINATOR) {
    throw new DiscoveryValidationError(`feeBps + safetyBps must be below 10000, got ${totalBps}`)
  }
  if (price.num <= BigInt(0) || price.den <= BigInt(0)) {
    throw new DiscoveryValidationError('price must be positive')
  }
  const keep = BPS_DENOMINATOR - totalBps
  // bigint division truncates; every operand is positive, so this is floor().
  return direction === 'base-to-quote'
    ? (depositAmount * price.num * keep) / (price.den * BPS_DENOMINATOR)
    : (depositAmount * price.den * keep) / (price.num * BPS_DENOMINATOR)
}

/** Render a Price as a decimal string for display (never for amount math). */
export function priceToDecimalString(price: Price, maxDecimals = 8): string {
  const scale = BigInt(10) ** BigInt(maxDecimals)
  const scaled = (price.num * scale) / price.den
  const integer = scaled / scale
  const fraction = (scaled % scale).toString().padStart(maxDecimals, '0').replace(/0+$/, '')
  return fraction ? `${integer}.${fraction}` : integer.toString()
}
