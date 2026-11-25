import { prettyNumber } from '../../../lib/format'
import { BEACON_READ_FEE } from '../../../lib/predict/constants'
import { usdFromCents } from '../../../lib/predict/pricing'

export function formatClockTime(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatSats(sats: bigint | number | string): string {
  return `${prettyNumber(Number(sats))} sats`
}

/** What the holder receives if right: the vault less the price check fee. */
export function netPayout(payoutSats: bigint | string): bigint {
  const payout = BigInt(payoutSats)
  return payout > BEACON_READ_FEE ? payout - BEACON_READ_FEE : 0n
}

/** A whole-dollar gap reads cleaner than cents once it is past a dollar. */
export function formatGap(cents: number): string {
  const abs = Math.abs(Math.round(cents))
  if (abs >= 100) return `$${prettyNumber(Math.round(abs / 100), 0)}`
  return usdFromCents(abs)
}

export function formatMultiplier(multiplier: number | null | undefined): string {
  return multiplier == null ? '—' : `${multiplier.toFixed(2)}×`
}
