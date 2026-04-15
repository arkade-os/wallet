/**
 * PROTOTYPE MOCK: deterministic sats-per-unit pricing for non-BTC assets.
 *
 * Why sats-per-unit (not USD)?
 *   The wallet's `FiatContext.toFiat()` already converts sats to whatever fiat
 *   currency the user picked. If each asset has a sats-per-unit price, summing
 *   all balances in sats and then calling toFiat() gives the right fiat total
 *   in the right currency — no per-currency mock tables required.
 *
 * TODO: replace with a real per-token price feed before shipping.
 */

import { MOCK_ASSETS } from './mockPortfolio'

// Known demo assets get fixed plausible prices. Anything else gets a
// deterministic hash-based value in a sensible range so the list always
// looks stable between reloads.
const knownPrices: Record<string, number> = Object.fromEntries(MOCK_ASSETS.map((a) => [a.assetId, a.satsPerUnit]))

export function mockAssetSatsPerUnit(assetId: string): number {
  if (knownPrices[assetId] !== undefined) return knownPrices[assetId]

  // Deterministic fallback: hash the assetId into [8, 120] sats/unit.
  // Kept intentionally humble so demo tokens don't dominate the portfolio total
  // over the user's real BTC balance.
  let hash = 0
  for (let i = 0; i < assetId.length; i++) {
    hash = ((hash << 5) - hash + assetId.charCodeAt(i)) | 0
  }
  const range = 112
  return 8 + (Math.abs(hash) % range)
}

/**
 * Convert an asset balance (in minor units — e.g. cents for decimals=2) into
 * a sats-equivalent using the mock price.
 */
export function assetToSats(assetId: string, amount: number, decimals: number): number {
  const satsPerUnit = mockAssetSatsPerUnit(assetId)
  const wholeUnits = amount / Math.pow(10, decimals)
  return Math.floor(wholeUnits * satsPerUnit)
}
