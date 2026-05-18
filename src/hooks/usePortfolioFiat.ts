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
  const { convertFiat, toFiat } = useContext(FiatContext)
  const prototypeDeltas = prototypeAssetBalanceDeltas ?? {}

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

  let usdMinorUnits = BigInt(0)
  const usdSourceAssetIds: string[] = []
  let chfMinorUnits = BigInt(0)
  const chfSourceAssetIds: string[] = []
  let brlMinorUnits = BigInt(0)
  const brlSourceAssetIds: string[] = []

  // Non-BTC asset rows from real SDK data.
  for (const ab of assetBalances) {
    const meta = assetMetadataCache.get(ab.assetId)?.metadata
    if (shouldHideDevPrototypeAsset(meta?.ticker, meta?.name)) continue

    const decimals = meta?.decimals ?? 8
    const normalizedTicker = meta?.ticker?.trim().toUpperCase()

    if (normalizedTicker === 'USDT' || normalizedTicker === 'USDC') {
      usdMinorUnits += normalizeMinorUnits(ab.amount, decimals, 2)
      usdSourceAssetIds.push(ab.assetId)
      continue
    }

    if (normalizedTicker === 'CHF') {
      chfMinorUnits += normalizeMinorUnits(ab.amount, decimals, 2)
      chfSourceAssetIds.push(ab.assetId)
      continue
    }

    if (normalizedTicker === 'BRL' || normalizedTicker === 'DPIX' || normalizedTicker === 'DEPIX') {
      brlMinorUnits += normalizeMinorUnits(ab.amount, decimals, 2)
      brlSourceAssetIds.push(ab.assetId)
      continue
    }

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

  usdMinorUnits += prototypeDeltas['account:usd'] ?? 0n
  const usdFiatAmount = Math.max(0, Number(usdMinorUnits) / 100)
  const usdAccountFiatAmount = convertFiat(usdFiatAmount, Fiats.USD)
  if (usdFiatAmount > 0 || import.meta.env.DEV) {
    assetFiatTotal += usdAccountFiatAmount
    rows.push({
      assetId: 'account:usd',
      name: 'USD',
      ticker: 'USD',
      decimals: 2,
      balance: usdMinorUnits,
      fiatAmount: usdAccountFiatAmount,
      satsEquivalent: 0,
      hasFiatPrice: true,
      sourceAssetIds: usdSourceAssetIds,
    })
  }

  const chfAccountMinorUnits =
    (chfMinorUnits > 0 ? chfMinorUnits : import.meta.env.DEV ? 3047n : 0n) + (prototypeDeltas['account:chf'] ?? 0n)
  const brlAccountMinorUnits =
    (brlMinorUnits > 0 ? brlMinorUnits : import.meta.env.DEV ? 12890n : 0n) + (prototypeDeltas['account:brl'] ?? 0n)

  const fiatAccounts = [
    {
      assetId: 'account:chf',
      name: 'CHF',
      ticker: 'CHF',
      minorUnits: chfAccountMinorUnits,
      sourceFiat: Fiats.CHF,
      sourceAssetIds: chfSourceAssetIds,
    },
    {
      assetId: 'account:brl',
      name: 'BRL',
      ticker: 'BRL',
      minorUnits: brlAccountMinorUnits,
      sourceFiat: Fiats.BRL,
      sourceAssetIds: brlSourceAssetIds,
    },
  ]

  for (const account of fiatAccounts) {
    if (account.minorUnits <= 0n) continue

    const amount = Number(account.minorUnits) / 100
    const fiatAmount = convertFiat(amount, account.sourceFiat)
    assetFiatTotal += fiatAmount

    rows.push({
      assetId: account.assetId,
      name: account.name,
      ticker: account.ticker,
      decimals: 2,
      balance: account.minorUnits,
      fiatAmount,
      satsEquivalent: 0,
      hasFiatPrice: true,
      sourceAssetIds: account.sourceAssetIds,
    })
  }

  return {
    totalFiat: toFiat(totalSats) + assetFiatTotal,
    totalSats,
    rows,
  }
}

function normalizeMinorUnits(rawAmount: number | bigint, fromDecimals: number, toDecimals: number): bigint {
  const amount = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount)
  if (fromDecimals === toDecimals) return amount
  if (fromDecimals > toDecimals) return amount / 10n ** BigInt(fromDecimals - toDecimals)
  return amount * 10n ** BigInt(toDecimals - fromDecimals)
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
  if (
    normalizedTicker === 'USDT' ||
    normalizedTicker === 'USDC' ||
    normalizedTicker === 'USD' ||
    normalizedTicker === 'AUSD'
  )
    return 'USD'
  if (normalizedTicker === 'CHF') return 'CHF'
  if (normalizedTicker === 'BRL' || normalizedTicker === 'DPIX' || normalizedTicker === 'DEPIX') return 'BRL'
  return name
}

function fiatForAssetTicker(ticker: string | undefined): Fiats | undefined {
  const normalized = ticker?.trim().toUpperCase()

  if (normalized === 'USDT' || normalized === 'USDC' || normalized === 'USD' || normalized === 'AUSD') return Fiats.USD
  if (normalized === 'CHF') return Fiats.CHF
  if (normalized === 'BRL' || normalized === 'DPIX' || normalized === 'DEPIX') return Fiats.BRL
  if (normalized === 'EUR') return Fiats.EUR
  if (normalized === 'GBP') return Fiats.GBP
  if (normalized === 'JPY') return Fiats.JPY
  if (normalized === 'CNY') return Fiats.CNY
}

function shouldHideDevPrototypeAsset(ticker: string | undefined, name: string | undefined): boolean {
  if (!import.meta.env.DEV) return false

  const normalizedTicker = ticker?.trim().toUpperCase()
  const normalizedName = name?.trim().toLowerCase()

  return normalizedTicker === 'POP' || normalizedName === 'poop' || normalizedName === 'hoop'
}
