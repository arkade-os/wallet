import { useContext } from 'react'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'

export interface PortfolioRow {
  /** 'btc' for the native bitcoin row. */
  assetId: string
  name: string
  ticker: string
  icon?: string
  decimals: number
  /** Raw balance in the asset's smallest unit (sats for BTC). */
  balance: number | bigint
  /** Fiat value in the user's selected currency. */
  fiatAmount: number
  /** Equivalent value in satoshis. */
  satsEquivalent: number
  /** True if this asset has a price feed and fiatAmount is meaningful. */
  hasFiatPrice: boolean
  /** IDs of the underlying wallet assets when this is a product-level account row. */
  sourceAssetIds?: string[]
}

export interface PortfolioFiat {
  totalFiat: number
  totalSats: number
  rows: PortfolioRow[]
}

export function usePortfolioFiat(): PortfolioFiat {
  const { balance } = useContext(WalletContext)
  const { toFiat } = useContext(FiatContext)
  const totalFiat = toFiat(balance)

  return {
    totalFiat,
    totalSats: balance,
    rows: [
      {
        assetId: 'btc',
        name: 'Bitcoin',
        ticker: 'BTC',
        decimals: 8,
        balance,
        fiatAmount: totalFiat,
        satsEquivalent: balance,
        hasFiatPrice: true,
      },
    ],
  }
}
