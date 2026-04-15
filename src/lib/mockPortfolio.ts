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
  /** Price expressed as sats per whole unit. BTC's fiat rate converts into the user's currency. */
  satsPerUnit: number
  avatar: MockAvatar
}

export interface MockAvatar {
  symbol: ReactNode
  bg: string
  color: string
}

export const USE_MOCK_PORTFOLIO = true

/**
 * Demo stablecoins priced against BTC at ~$100k. Per-unit sats are picked so each
 * token's fiat value looks sane to a US/EU reader glancing at the prototype.
 */
export const MOCK_ASSETS: MockAsset[] = [
  {
    assetId: 'mock-usda',
    name: 'US Dollar',
    ticker: 'USDA',
    decimals: 2,
    amount: 2450, // $24.50
    satsPerUnit: 1000,
    avatar: { symbol: '$', bg: '#E6F4EA', color: '#1E7C3A' },
  },
  {
    assetId: 'mock-chfa',
    name: 'Swiss Franc',
    ticker: 'CHFA',
    decimals: 2,
    amount: 4217, // CHF 42.17
    satsPerUnit: 1130,
    avatar: { symbol: 'Fr', bg: '#FCEAEA', color: '#B3261E' },
  },
  {
    assetId: 'mock-pepe',
    name: 'Pepe',
    ticker: 'PEPE',
    decimals: 8,
    amount: 125_000_000_000, // 1,250 PEPE
    satsPerUnit: 0.01,
    avatar: { symbol: '🐸', bg: '#EEF7E6', color: '#43701E' },
  },
]

export function mockAvatarFor(assetId: string): MockAvatar | undefined {
  return MOCK_ASSETS.find((a) => a.assetId === assetId)?.avatar
}
