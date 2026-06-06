import { Currencies } from './types'
import type { PortfolioRow } from '../hooks/usePortfolioFiat'

const TEMP_DEV_SWAP_ASSET_IDS = new Set(['dev-swap-test:usd', 'dev-swap-test:chf'])

export function areDevSwapTestAssetsEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_SWAP_TEST_ASSETS === 'true'
}

export function isDevSwapTestAssetId(assetId: string): boolean {
  return TEMP_DEV_SWAP_ASSET_IDS.has(assetId)
}

export function getDevSwapTestAssetRows(
  convertToSelectedFiat: (amount: number, from: Currencies) => number,
  convertFiatAmount: (amount: number, from: Currencies, to: Currencies) => number,
): PortfolioRow[] {
  if (!areDevSwapTestAssetsEnabled()) return []

  const chfAmount = convertFiatAmount(10, Currencies.USD, Currencies.CHF)
  const chfMinorUnits = BigInt(Math.max(0, Math.round(chfAmount * 100)))

  return [
    {
      assetId: 'dev-swap-test:usd',
      name: 'USD',
      ticker: 'USD',
      decimals: 2,
      balance: BigInt(1_000),
      fiatAmount: convertToSelectedFiat(10, Currencies.USD),
      satsEquivalent: 0,
      hasFiatPrice: true,
    },
    {
      assetId: 'dev-swap-test:chf',
      name: 'CHF',
      ticker: 'CHF',
      decimals: 2,
      balance: chfMinorUnits,
      fiatAmount: convertToSelectedFiat(chfAmount, Currencies.CHF),
      satsEquivalent: 0,
      hasFiatPrice: true,
    },
  ]
}
