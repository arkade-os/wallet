import { useContext } from 'react'
import Decimal from 'decimal.js'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'
import { truncatedAssetId } from '../lib/assets'
import { fiatForTicker } from '../lib/format'

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
  const { assetBalances, assetMetadataCache, balance, isVerifiedAsset } = useContext(WalletContext)
  const { fromFiatAmount, toFiat } = useContext(FiatContext)
  const assetRows = assetBalances.map((asset) => {
    const meta = assetMetadataCache.get(asset.assetId)?.metadata
    const decimals = meta?.decimals ?? 8
    // only verified asset IDs may claim a fiat price via their ticker
    const fiat = isVerifiedAsset(asset.assetId) ? fiatForTicker(meta?.ticker) : undefined
    const fiatAmount = fiat ? Decimal.div(asset.amount.toString(), Decimal.pow(10, decimals)).toNumber() : 0
    const satsEquivalent = fiat ? fromFiatAmount(fiatAmount, fiat) : 0

    return {
      assetId: asset.assetId,
      name: meta?.name ?? truncatedAssetId(asset.assetId) ?? 'Asset',
      ticker: meta?.ticker ?? 'TKN',
      icon: meta?.icon,
      decimals,
      balance: asset.amount,
      fiatAmount: fiat ? toFiat(satsEquivalent) : 0,
      satsEquivalent,
      hasFiatPrice: Boolean(fiat && satsEquivalent),
    } satisfies PortfolioRow
  })
  const totalSats = assetRows.reduce((total, row) => total + row.satsEquivalent, balance)
  const totalFiat = toFiat(totalSats)

  return {
    totalFiat,
    totalSats,
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
