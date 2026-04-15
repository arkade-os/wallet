import { useContext } from 'react'
import { WalletContext } from '../providers/wallet'
import { FiatContext } from '../providers/fiat'
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
  /** Equivalent value in satoshis, computed via the live BTC→USD rate. */
  satsEquivalent: number
}

export interface PortfolioFiat {
  totalFiat: number
  totalSats: number
  rows: PortfolioRow[]
  /** True when at least one row's fiat value comes from the prototype mock. */
  hasMockPrices: boolean
}

/**
 * Aggregates BTC + all asset balances into a single fiat total using the
 * user's configured currency. Non-BTC assets are priced in USD per unit; we
 * convert USD → sats via the live BTC rate, then sats → user's fiat. This
 * keeps stablecoin values honest (a $1 stablecoin always shows as $1)
 * regardless of BTC price movement.
 */
export function usePortfolioFiat(): PortfolioFiat {
  const { balance, assetBalances, assetMetadataCache } = useContext(WalletContext)
  const { toFiat, fromUSD } = useContext(FiatContext)

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

  // Non-BTC asset rows. The prototype uses a fixed demo set instead of the
  // real SDK-backed assetBalances (which reflect the dev regtest env).
  if (USE_MOCK_PORTFOLIO) {
    for (const mock of MOCK_ASSETS) {
      const wholeUnits = mock.amount / Math.pow(10, mock.decimals)
      const usdValue = wholeUnits * mock.usdPricePerUnit
      const satsEq = fromUSD(usdValue)
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
      const satsEq = 0 // real price feed not yet wired; see mockAssetPrices for the prototype path
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
