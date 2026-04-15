import { ReactNode } from 'react'

/**
 * PROTOTYPE MOCK: a realistic demo portfolio so the home screen shows a
 * meaningful multi-asset dashboard without depending on whatever happens to be
 * in the dev regtest environment.
 *
 * TODO: gate behind a build flag (or replace with real balances) before ship.
 */

export interface MockAsset {
  assetId: string
  name: string
  ticker: string
  decimals: number
  /** Balance in minor units — displayed as `amount / 10^decimals`. */
  amount: number
  /**
   * Unit price in US Dollars. The hook translates this to sats via the live
   * BTC→USD rate and then converts to whatever fiat the user picked, so the
   * displayed fiat value always matches the asset's denomination (a $1
   * stablecoin always shows as $1, regardless of where BTC is).
   */
  usdPricePerUnit: number
  avatar: MockAvatar
}

export interface MockAvatar {
  symbol: ReactNode
  bg: string
  color: string
}

export const USE_MOCK_PORTFOLIO = true

export const MOCK_ASSETS: MockAsset[] = [
  {
    assetId: 'mock-usd',
    name: 'US Dollar',
    ticker: 'USD',
    decimals: 2,
    amount: 2450, // $24.50
    usdPricePerUnit: 1.0,
    avatar: { symbol: '$', bg: '#E6F4EA', color: '#1E7C3A' },
  },
  {
    assetId: 'mock-chf',
    name: 'Swiss Franc',
    ticker: 'CHF',
    decimals: 2,
    amount: 4217, // CHF 42.17 → ≈ $47.23 at CHF/USD = 1.12
    usdPricePerUnit: 1.12,
    avatar: { symbol: 'Fr', bg: '#FCEAEA', color: '#B3261E' },
  },
  {
    assetId: 'mock-pepe',
    name: 'Pepe',
    ticker: 'PEPE',
    decimals: 8,
    amount: 420_690_00000000, // 420,690 PEPE — memey round number
    usdPricePerUnit: 0.00002, // → ≈ $8.41
    avatar: { symbol: '🐸', bg: '#EEF7E6', color: '#43701E' },
  },
]

export function mockAvatarFor(assetId: string): MockAvatar | undefined {
  return MOCK_ASSETS.find((a) => a.assetId === assetId)?.avatar
}
