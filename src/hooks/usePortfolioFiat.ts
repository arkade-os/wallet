import { useContext } from 'react'
import { WalletContext } from '../providers/wallet'
import { FiatContext } from '../providers/fiat'
import { Fiats } from '../lib/types'

export interface PortfolioRow {
  /** 'btc' for the native Bitcoin row, otherwise the asset's on-chain id. */
  assetId: string
  name: string
  ticker: string
  icon?: string
  decimals: number
  /** Raw balance in the asset's smallest unit (sats for BTC, minor units otherwise). */
  balance: number | bigint
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
 * user's configured currency. Recognized fiat-pegged assets use the same
 * price feed as the rest of the wallet.
 */
export function usePortfolioFiat(): PortfolioFiat {
  const { balance, assetBalances, assetMetadataCache } = useContext(WalletContext)
  const { convertFiat, toFiat } = useContext(FiatContext)

  const rows: PortfolioRow[] = []
  let totalSats = 0
  let assetFiatTotal = 0

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
    if (shouldHideDevPrototypeAsset(meta?.ticker, meta?.name)) continue

    const decimals = meta?.decimals ?? 8
    const pricedFiat = priceAssetFiat(ab.amount, decimals, meta?.ticker, convertFiat)
    assetFiatTotal += pricedFiat

    rows.push({
      assetId: ab.assetId,
      name: displayNameForAsset(meta?.ticker, meta?.name) ?? `Asset ${ab.assetId.slice(0, 8)}…`,
      ticker: meta?.ticker?.trim().toUpperCase() ?? 'TKN',
      icon: meta?.icon,
      decimals,
      balance: ab.amount,
      fiatAmount: pricedFiat,
      satsEquivalent: 0,
      hasFiatPrice: pricedFiat > 0,
    })
  }

  return {
    totalFiat: toFiat(totalSats) + assetFiatTotal,
    totalSats,
    rows,
  }
}

function priceAssetFiat(
  rawAmount: number | bigint,
  decimals: number,
  ticker: string | undefined,
  convertFiat: (amount: number, from: Fiats) => number,
): number {
  const sourceFiat = fiatForAssetTicker(ticker)
  if (!sourceFiat) return 0

  const normalizedRawAmount = typeof rawAmount === 'bigint' ? Number(rawAmount) : rawAmount
  return convertFiat(normalizedRawAmount / 10 ** decimals, sourceFiat)
}

function displayNameForAsset(ticker: string | undefined, name: string | undefined): string | undefined {
  const normalizedTicker = ticker?.trim().toUpperCase()
  if (normalizedTicker === 'USDT' || normalizedTicker === 'USDC') return normalizedTicker
  return name
}

function fiatForAssetTicker(ticker: string | undefined): Fiats | undefined {
  const normalized = ticker?.trim().toUpperCase()

  if (normalized === 'USDT' || normalized === 'USDC' || normalized === 'USD' || normalized === 'AUSD') return Fiats.USD
  if (normalized === 'CHF') return Fiats.CHF
  if (normalized === 'EUR') return Fiats.EUR
  if (normalized === 'GBP') return Fiats.GBP
  if (normalized === 'JPY') return Fiats.JPY
  if (normalized === 'CNY') return Fiats.CNY
}

function shouldHideDevPrototypeAsset(ticker: string | undefined, name: string | undefined): boolean {
  if (!import.meta.env.DEV) return false

  const normalizedTicker = ticker?.trim().toUpperCase()
  const normalizedName = name?.trim().toLowerCase()

  return (
    normalizedTicker === 'POP' ||
    normalizedName === 'poop' ||
    normalizedName === 'hoop' ||
    (normalizedTicker === 'CHF' && normalizedName === 'swiss franc')
  )
}
