import { useContext } from 'react'
import { WalletContext } from '../providers/wallet'
import { FiatContext } from '../providers/fiat'

export interface PortfolioRow {
  /** 'btc' for the native Bitcoin row, otherwise the asset's on-chain id. */
  assetId: string
  name: string
  ticker: string
  icon?: string
  decimals: number
  /** Raw balance in the asset's smallest unit (sats for BTC, minor units otherwise). */
  balance: number
  /** Fiat value in the user's selected currency (0 if no price feed). */
  fiatAmount: number
  /** Equivalent value in satoshis, computed via the live BTC→USD rate. */
  satsEquivalent: number
  /** True if this asset has a price feed and fiatAmount is meaningful. */
  hasFiatPrice: boolean
}

export interface PortfolioFiat {
  totalFiat: number
  totalSats: number
  rows: PortfolioRow[]
}

/**
 * Aggregates BTC + all asset balances into a single fiat total using the
 * user's configured currency. Non-BTC assets currently show balance only
 * (no fiat conversion without a price feed).
 */
export function usePortfolioFiat(): PortfolioFiat {
  const { balance, assetBalances, assetMetadataCache } = useContext(WalletContext)
  const { toFiat } = useContext(FiatContext)

  const rows: PortfolioRow[] = []
  let totalSats = 0

  // BTC row first — always present.
  totalSats += balance
  rows.push({
    assetId: 'btc',
    name: 'Bitcoin',
    ticker: 'BTC',
    decimals: 8,
    balance,
    fiatAmount: toFiat(balance),
    satsEquivalent: balance,
    hasFiatPrice: true,
  })

  // Non-BTC asset rows from real SDK data.
  for (const ab of assetBalances) {
    const meta = assetMetadataCache.get(ab.assetId)?.metadata
    const decimals = meta?.decimals ?? 8
    // No price feed yet for non-BTC assets — show balance only.
    const satsEq = 0
    totalSats += satsEq

    rows.push({
      assetId: ab.assetId,
      name: meta?.name ?? `Asset ${ab.assetId.slice(0, 8)}…`,
      ticker: meta?.ticker ?? 'TKN',
      icon: meta?.icon,
      decimals,
      balance: ab.amount,
      fiatAmount: toFiat(satsEq),
      satsEquivalent: satsEq,
      hasFiatPrice: false,
    })
  }

  return {
    totalFiat: toFiat(totalSats),
    totalSats,
    rows,
  }
}
