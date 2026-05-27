import { Fiats } from './types'
import type { PortfolioRow } from '../hooks/usePortfolioFiat'

const TEMP_DEV_SWAP_ASSET_IDS = new Set(['dev-swap-test:usd', 'dev-swap-test:chf'])

export function areDevSwapTestAssetsEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_SWAP_TEST_ASSETS === 'true'
}

export function isDevSwapTestAssetId(assetId: string): boolean {
  return TEMP_DEV_SWAP_ASSET_IDS.has(assetId)
}

export function getDevSwapTestAssetRows(
  convertFiat: (amount: number, from: Fiats, to?: Fiats) => number,
): PortfolioRow[] {
  if (!areDevSwapTestAssetsEnabled()) return []

  const chfAmount = convertFiat(10, Fiats.USD, Fiats.CHF)
  const chfMinorUnits = BigInt(Math.max(0, Math.round(chfAmount * 100)))

  return [
    {
      assetId: 'dev-swap-test:usd',
      name: 'USD',
      ticker: 'USD',
      decimals: 2,
      balance: BigInt(1_000),
      fiatAmount: convertFiat(10, Fiats.USD),
      satsEquivalent: 0,
      hasFiatPrice: true,
    },
    {
      assetId: 'dev-swap-test:chf',
      name: 'CHF',
      ticker: 'CHF',
      decimals: 2,
      balance: chfMinorUnits,
      fiatAmount: convertFiat(chfAmount, Fiats.CHF),
      satsEquivalent: 0,
      hasFiatPrice: true,
    },
  ]
}
