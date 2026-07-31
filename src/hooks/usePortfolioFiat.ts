import Decimal from 'decimal.js'
import { useContext } from 'react'
import { fiatDecimalsFor } from '../lib/fiat'
import { Currencies } from '../lib/types'
import { AspContext } from '../providers/asp'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'
import { designatedAccountCurrency, normalizeAssetMinorUnits, type FiatAccountSourceAsset } from '../lib/accountAssets'

export interface PortfolioRow {
  /** 'btc' for the native bitcoin row, otherwise the asset's on-chain id. */
  assetId: string
  name: string
  ticker: string
  icon?: string
  decimals: number
  /** Raw balance in the asset's smallest unit (sats for BTC, minor units otherwise). */
  balance: number | bigint
  /** Fiat value in the user's selected currency (0 if no price feed). */
  fiatAmount: number
  /** Equivalent value in satoshis, computed via the live BTC price feed. */
  satsEquivalent: number
  /** True if this asset has a price feed and fiatAmount is meaningful. */
  hasFiatPrice: boolean
  /** Fiat currency represented by this product-level account. */
  fiatCurrency?: Currencies
  /** Backing wallet asset used internally to fulfill account actions. */
  sourceAsset?: FiatAccountSourceAsset
}

export interface PortfolioFiat {
  totalFiat: number
  totalSats: number
  rows: PortfolioRow[]
}

/**
 * Aggregates BTC + all asset balances into a single fiat total using the
 * user's configured currency. Recognized fiat-pegged assets use the same
 * price feed as the rest of the wallet.
 */
export function usePortfolioFiat(): PortfolioFiat {
  const { aspInfo } = useContext(AspContext)
  const { balance, assetBalances, assetMetadataCache, isVerifiedAsset } = useContext(WalletContext)
  const { fromFiatAmount, toFiat } = useContext(FiatContext)
  const convertToSelectedFiat = (amount: number, from: Currencies) => toFiat(fromFiatAmount(amount, from))

  const rows: PortfolioRow[] = []
  let totalSats = 0

  // bitcoin row first, always present.
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

  // Non-bitcoin asset rows from real SDK data.
  for (const ab of assetBalances) {
    const meta = assetMetadataCache.get(ab.assetId)?.metadata
    const assetDecimals = meta?.decimals ?? 8
    // only verified asset IDs may claim currency-account treatment
    const sourceFiat = isVerifiedAsset(ab.assetId) ? designatedAccountCurrency(aspInfo.network, ab.assetId) : undefined

    if (sourceFiat) {
      const accountDecimals = fiatDecimalsFor(sourceFiat)
      const sourceAsset: FiatAccountSourceAsset = {
        assetId: ab.assetId,
        balance: BigInt(ab.amount),
        decimals: assetDecimals,
      }
      const minorUnits = normalizeAssetMinorUnits(sourceAsset.balance, assetDecimals, accountDecimals)
      const amount = Decimal.div(minorUnits.toString(), Decimal.pow(10, accountDecimals)).toNumber()
      const fiatAmount = convertToSelectedFiat(amount, sourceFiat)
      const satsEquivalent = fromFiatAmount(amount, sourceFiat)
      totalSats += satsEquivalent
      rows.push({
        assetId: ab.assetId,
        name: sourceFiat,
        ticker: sourceFiat,
        decimals: accountDecimals,
        balance: minorUnits,
        fiatAmount,
        satsEquivalent,
        hasFiatPrice: true,
        fiatCurrency: sourceFiat,
        sourceAsset,
      })
      continue
    }

    rows.push({
      assetId: ab.assetId,
      name: meta?.name ?? `Asset ${ab.assetId.slice(0, 8)}...`,
      ticker: meta?.ticker?.trim().toUpperCase() ?? 'TKN',
      icon: meta?.icon,
      decimals: assetDecimals,
      balance: ab.amount,
      fiatAmount: 0,
      satsEquivalent: 0,
      hasFiatPrice: false,
    })
  }

  return {
    totalFiat: toFiat(totalSats),
    totalSats,
    rows,
  }
}
