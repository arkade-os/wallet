import Decimal from 'decimal.js'
import { useContext } from 'react'
import { fiatDecimalsFor } from '../lib/fiat'
import { fiatForTicker } from '../lib/format'
import { Currencies } from '../lib/types'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'

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
  /** IDs of the underlying wallet assets when this is a product-level account row. */
  sourceAssetIds?: string[]
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
  const { balance, assetBalances, assetMetadataCache, prototypeAssetBalanceDeltas } = useContext(WalletContext)
  const { fromFiatAmount, toFiat } = useContext(FiatContext)
  const prototypeDeltas = prototypeAssetBalanceDeltas ?? {}
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

  const fiatAccountBalances = new Map<Currencies, bigint>()
  const fiatAccountSourceAssetIds = new Map<Currencies, string[]>()

  // Non-bitcoin asset rows from real SDK data.
  for (const ab of assetBalances) {
    const meta = assetMetadataCache.get(ab.assetId)?.metadata
    const decimals = meta?.decimals ?? 8
    const sourceFiat = fiatForTicker(meta?.ticker)

    if (sourceFiat) {
      const accountDecimals = fiatDecimalsFor(sourceFiat)
      const currentBalance = fiatAccountBalances.get(sourceFiat) ?? BigInt(0)
      fiatAccountBalances.set(sourceFiat, currentBalance + normalizeMinorUnits(ab.amount, decimals, accountDecimals))
      fiatAccountSourceAssetIds.set(sourceFiat, [...(fiatAccountSourceAssetIds.get(sourceFiat) ?? []), ab.assetId])
      continue
    }

    rows.push({
      assetId: ab.assetId,
      name: meta?.name ?? `Asset ${ab.assetId.slice(0, 8)}...`,
      ticker: meta?.ticker?.trim().toUpperCase() ?? 'TKN',
      icon: meta?.icon,
      decimals,
      balance: ab.amount,
      fiatAmount: 0,
      satsEquivalent: 0,
      hasFiatPrice: false,
    })
  }

  for (const sourceFiat of Object.values(Currencies)) {
    if (sourceFiat === Currencies.BTC) continue

    const accountId = `account:${sourceFiat.toLowerCase()}`
    const decimals = fiatDecimalsFor(sourceFiat)
    const minorUnits = (fiatAccountBalances.get(sourceFiat) ?? BigInt(0)) + (prototypeDeltas[accountId] ?? BigInt(0))
    if (minorUnits <= BigInt(0)) continue

    const amount = Decimal.div(minorUnits.toString(), Decimal.pow(10, decimals)).toNumber()
    const fiatAmount = convertToSelectedFiat(amount, sourceFiat)
    const satsEquivalent = fromFiatAmount(amount, sourceFiat)
    totalSats += satsEquivalent
    rows.push({
      assetId: accountId,
      name: sourceFiat,
      ticker: sourceFiat,
      decimals,
      balance: minorUnits,
      fiatAmount,
      satsEquivalent,
      hasFiatPrice: true,
      fiatCurrency: sourceFiat,
      sourceAssetIds: fiatAccountSourceAssetIds.get(sourceFiat) ?? [],
    })
  }

  return {
    totalFiat: toFiat(totalSats),
    totalSats,
    rows,
  }
}

function normalizeMinorUnits(rawAmount: number | bigint, fromDecimals: number, toDecimals: number): bigint {
  const amount = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount)
  if (fromDecimals === toDecimals) return amount
  if (fromDecimals > toDecimals) return amount / BigInt(10) ** BigInt(fromDecimals - toDecimals)
  return amount * BigInt(10) ** BigInt(toDecimals - fromDecimals)
}
