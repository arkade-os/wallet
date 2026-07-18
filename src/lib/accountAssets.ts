import Decimal from 'decimal.js'
import { Currencies } from './types'

export type WalletAccountTicker = 'BTC' | 'USD' | 'CHF' | 'BRL' | 'CNY' | 'EUR' | 'GBP' | 'JPY'

export const MUTINYNET_DEPIX_ASSET_ID = '47004bf4a5fbdb2221f708030528de68ea28f5980044e546b7bb5a352457d1f30000'
export const MUTINYNET_USDT_ASSET_ID = 'f121ac9b7656797cc68d1e8fecacfbaa2069ec1461edf0bf2f3c37404cb9791a0000'

// ponytail: hand-pinned designations; source them from
// https://github.com/ArkLabsHQ/asset-registry once it publishes them
const DESIGNATED_ACCOUNT_ASSETS: Record<string, Partial<Record<string, Currencies>>> = {
  mutinynet: {
    [MUTINYNET_DEPIX_ASSET_ID]: Currencies.BRL,
    [MUTINYNET_USDT_ASSET_ID]: Currencies.USD,
  },
}

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
  source: FiatAccountSourceAsset
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
  if (normalized === 'USD') return 'USD'
  if (normalized === 'CHF') return 'CHF'
  if (normalized === 'BRL') return 'BRL'
  if (normalized === 'CNY') return 'CNY'
  if (normalized === 'EUR') return 'EUR'
  if (normalized === 'GBP') return 'GBP'
  if (normalized === 'JPY') return 'JPY'
}

export function designatedAccountCurrency(network: string | undefined, assetId: string): Currencies | undefined {
  return network ? DESIGNATED_ACCOUNT_ASSETS[network]?.[assetId] : undefined
}

/** A designated currency only applies once its asset id is verified —
 * otherwise anyone could mint a lookalike asset and claim the currency. */
export function verifiedDesignatedCurrency(
  network: string | undefined,
  assetId: string | undefined,
  isVerifiedAsset: (assetId: string) => boolean,
): Currencies | undefined {
  return assetId && isVerifiedAsset(assetId) ? designatedAccountCurrency(network, assetId) : undefined
}

export function accountChartColorToken(ticker: string | undefined): string {
  const accountTicker = walletAccountTicker(ticker)
  return accountTicker ? ACCOUNT_CHART_COLOR_TOKENS[accountTicker] : '--account-chart-default'
}

/** The asset's own name/ticker, with no account-currency mapping. */
export function rawAssetPresentation(
  metadata: { name?: string; ticker?: string; icon?: string } | undefined,
  fallbackName = 'Asset',
): { name: string; ticker: string; icon?: string } {
  return {
    name: metadata?.name ?? fallbackName,
    ticker: metadata?.ticker?.trim().toUpperCase() ?? '',
    icon: metadata?.icon,
  }
}

export function walletAssetPresentation(
  metadata: { name?: string; ticker?: string; icon?: string } | undefined,
  fallbackName = 'Asset',
): { name: string; ticker: string; icon?: string } {
  const accountTicker = walletAccountTicker(metadata?.ticker)
  if (accountTicker) return { name: accountTicker, ticker: accountTicker }

  return rawAssetPresentation(metadata, fallbackName)
}

export function walletAssetPresentationForId(
  network: string | undefined,
  assetId: string | undefined,
  isRegistered: (assetId: string) => boolean,
  metadata: { name?: string; ticker?: string; icon?: string } | undefined,
  fallbackName = 'Asset',
): { name: string; ticker: string; icon?: string } {
  const currency = assetId && isRegistered(assetId) ? designatedAccountCurrency(network, assetId) : undefined
  return currency
    ? { name: currency, ticker: currency, icon: metadata?.icon }
    : walletAssetPresentation(metadata, fallbackName)
}

export function walletAssetLabel(presentation: { name: string; ticker: string }): string {
  return !presentation.ticker || presentation.name === presentation.ticker
    ? presentation.name
    : `${presentation.name} (${presentation.ticker})`
}

/** Send-flow label: the currency account riding with the real asset identity,
 * e.g. "BRL · Decentralized Pix (DEPIX)". Without a designation it is just
 * the asset's own label. */
export function accountAssetLabel(
  currency: Currencies | undefined,
  presentation: { name: string; ticker: string },
): string {
  const label = walletAssetLabel(presentation)
  return currency ? `${currency} · ${label}` : label
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
