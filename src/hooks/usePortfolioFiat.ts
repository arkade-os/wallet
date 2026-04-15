import { useContext } from 'react'
import { WalletContext } from '../providers/wallet'
import { FiatContext } from '../providers/fiat'
import { assetToSats } from '../lib/mockAssetPrices'
import { MOCK_ASSETS, USE_MOCK_PORTFOLIO } from '../lib/mockPortfolio'

export interface PortfolioRow {
  /** 'btc' for the native Bitcoin row, otherwise the asset's on-chain id. */
  assetId: string
  name: string
  ticker: string
  icon?: string
  decimals: number
  /** Raw balance in the asset's smallest unit (sats for BTC, minor units otherwise). */
  balance: number
  /** Fiat value in the user's selected currency. */
  fiatAmount: number
  /** Equivalent value in satoshis, computed via the mock price feed for non-BTC assets. */
  satsEquivalent: number
}

export interface PortfolioFiat {
  totalFiat: number
  totalSats: number
  rows: PortfolioRow[]
  /** True when at least one row's fiat value comes from the prototype mock price. */
  hasMockPrices: boolean
}

/**
 * Aggregates BTC + all asset balances into a single fiat total using the
 * user's configured currency. Non-BTC assets use the mock sats-per-unit feed
 * in `mockAssetPrices.ts` — the BTC fiat rate then converts the total into
 * whichever currency the user picked.
 */
export function usePortfolioFiat(): PortfolioFiat {
  const { balance, assetBalances, assetMetadataCache } = useContext(WalletContext)
  const { toFiat } = useContext(FiatContext)

  const rows: PortfolioRow[] = []
  let totalSats = 0
  let hasMockPrices = false

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
  })

  // Non-BTC asset rows. For the prototype we ignore the SDK-backed
  // assetBalances (which reflect the dev regtest environment) and show a
  // fixed realistic demo set instead.
  if (USE_MOCK_PORTFOLIO) {
    for (const mock of MOCK_ASSETS) {
      const satsEq = assetToSats(mock.assetId, mock.amount, mock.decimals)
      totalSats += satsEq
      hasMockPrices = true
      rows.push({
        assetId: mock.assetId,
        name: mock.name,
        ticker: mock.ticker,
        decimals: mock.decimals,
        balance: mock.amount,
        fiatAmount: toFiat(satsEq),
        satsEquivalent: satsEq,
      })
    }
  } else {
    for (const ab of assetBalances) {
      const meta = assetMetadataCache.get(ab.assetId)?.metadata
      const decimals = meta?.decimals ?? 8
      const satsEq = assetToSats(ab.assetId, ab.amount, decimals)
      totalSats += satsEq
      hasMockPrices = true

      rows.push({
        assetId: ab.assetId,
        name: meta?.name ?? `Asset ${ab.assetId.slice(0, 8)}…`,
        ticker: meta?.ticker ?? 'TKN',
        icon: meta?.icon,
        decimals,
        balance: ab.amount,
        fiatAmount: toFiat(satsEq),
        satsEquivalent: satsEq,
      })
    }
  }

  return {
    totalFiat: toFiat(totalSats),
    totalSats,
    rows,
    hasMockPrices,
  }
}
