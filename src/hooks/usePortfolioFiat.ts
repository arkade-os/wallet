import { useContext } from 'react'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'
import { truncatedAssetId } from '../lib/assets'

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
  const { assetBalances, assetMetadataCache, balance } = useContext(WalletContext)
  const { toFiat } = useContext(FiatContext)
  const totalFiat = toFiat(balance)
  const assetRows = assetBalances.map((asset) => {
    const meta = assetMetadataCache.get(asset.assetId)?.metadata
    const decimals = meta?.decimals ?? 8

    return {
      assetId: asset.assetId,
      name: meta?.name ?? truncatedAssetId(asset.assetId) ?? 'Asset',
      ticker: meta?.ticker ?? 'TKN',
      icon: meta?.icon,
      decimals,
      balance: asset.amount,
      fiatAmount: 0,
      satsEquivalent: 0,
      hasFiatPrice: false,
    } satisfies PortfolioRow
  })

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
      ...assetRows,
    ],
  }
}
