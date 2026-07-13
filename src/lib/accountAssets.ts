import Decimal from 'decimal.js'
import type { Asset } from '@arkade-os/sdk'
import { Currencies } from './types'

export type WalletAccountTicker = 'BTC' | 'USD' | 'CHF' | 'BRL' | 'CNY' | 'EUR' | 'GBP' | 'JPY'

export interface FiatAccountSourceAsset {
  assetId: string
  balance: bigint
  decimals: number
}

export interface FiatAccountSend {
  assetId: string
  ticker: WalletAccountTicker
  balance: bigint
  decimals: number
  amount: bigint
  sources: FiatAccountSourceAsset[]
}

const ACCOUNT_CHART_COLOR_TOKENS: Record<WalletAccountTicker, string> = {
  BTC: '--account-chart-btc',
  USD: '--account-chart-usd',
  CHF: '--account-chart-chf',
  BRL: '--account-chart-brl',
  CNY: '--account-chart-cny',
  EUR: '--account-chart-eur',
  GBP: '--account-chart-gbp',
  JPY: '--account-chart-jpy',
}

export function walletAccountTicker(ticker: string | undefined): WalletAccountTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (normalized === 'BTC') return 'BTC'
  if (normalized === 'USD' || normalized === 'AUSD' || normalized === 'USDT' || normalized === 'USDC') return 'USD'
  if (normalized === 'CHF') return 'CHF'
  if (normalized === 'BRL' || normalized === 'DPIX' || normalized === 'DEPIX') return 'BRL'
  if (normalized === 'CNY') return 'CNY'
  if (normalized === 'EUR') return 'EUR'
  if (normalized === 'GBP') return 'GBP'
  if (normalized === 'JPY') return 'JPY'
}

export function accountChartColorToken(ticker: string | undefined): string {
  const accountTicker = walletAccountTicker(ticker)
  return accountTicker ? ACCOUNT_CHART_COLOR_TOKENS[accountTicker] : '--account-chart-default'
}

export function walletAssetPresentation(
  metadata: { name?: string; ticker?: string; icon?: string } | undefined,
  fallbackName = 'Asset',
): { name: string; ticker: string; icon?: string } {
  const accountTicker = walletAccountTicker(metadata?.ticker)
  if (accountTicker) return { name: accountTicker, ticker: accountTicker }

  return {
    name: metadata?.name ?? fallbackName,
    ticker: metadata?.ticker?.trim().toUpperCase() ?? '',
    icon: metadata?.icon,
  }
}

export function fiatAccountAssetSatoshis(
  amount: bigint,
  decimals: number,
  ticker: string | undefined,
  fromFiatAmount: (amount: number, currency: Currencies) => number,
): number | undefined {
  const accountTicker = walletAccountTicker(ticker)
  if (!accountTicker || accountTicker === 'BTC') return undefined

  const accountAmount = Decimal.div(amount.toString(), Decimal.pow(10, decimals)).toNumber()
  return fromFiatAmount(accountAmount, accountTicker as Currencies)
}

export function normalizeAssetMinorUnits(rawAmount: number | bigint, fromDecimals: number, toDecimals: number): bigint {
  const amount = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount)
  if (fromDecimals === toDecimals) return amount
  if (fromDecimals > toDecimals) return amount / BigInt(10) ** BigInt(fromDecimals - toDecimals)
  return amount * BigInt(10) ** BigInt(toDecimals - fromDecimals)
}

export function allocateFiatAccountAssets(
  amount: bigint,
  accountDecimals: number,
  sources: FiatAccountSourceAsset[],
): Asset[] {
  let remaining = amount > BigInt(0) ? amount : BigInt(0)
  const assets: Asset[] = []

  for (const source of sources) {
    if (remaining === BigInt(0)) break
    const available = normalizeAssetMinorUnits(source.balance, source.decimals, accountDecimals)
    const allocated = remaining < available ? remaining : available
    if (allocated <= BigInt(0)) continue

    assets.push({
      assetId: source.assetId,
      amount: normalizeAssetMinorUnits(allocated, accountDecimals, source.decimals),
    })
    remaining -= allocated
  }

  return assets
}

export function primaryFiatAccountSource(
  sources: FiatAccountSourceAsset[] | undefined,
  accountDecimals: number,
): FiatAccountSourceAsset | undefined {
  return sources?.reduce<FiatAccountSourceAsset | undefined>((primary, source) => {
    if (!primary) return source
    const sourceBalance = normalizeAssetMinorUnits(source.balance, source.decimals, accountDecimals)
    const primaryBalance = normalizeAssetMinorUnits(primary.balance, primary.decimals, accountDecimals)
    return sourceBalance > primaryBalance ? source : primary
  }, undefined)
}
