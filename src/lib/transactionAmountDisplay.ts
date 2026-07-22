import type { Asset } from '@arkade-os/sdk'
import {
  prettyBitcoinAmount,
  prettyBitcoinHide,
  prettyCurrencyAssetAmount,
  prettyFiatAmount,
  prettyFiatHide,
  prettyHide,
} from './format'
import { fiatAccountAssetSatoshis, verifiedDesignatedCurrency } from './accountAssets'
import { Currencies, Unit } from './types'
import type { SwapDisplayAmount } from './swapDisplay'

export type SensitiveAmountDisplay = SwapDisplayAmount

export interface RawAssetAmountDisplay extends SensitiveAmountDisplay {
  assetId?: string
  ticker: string
  trusted?: boolean
  /** True for an asset entry whose ID is not registry-verified — render the badge. */
  unverified?: boolean
}

export interface TransactionAmountDisplay {
  configured?: SensitiveAmountDisplay
  /** The leading line: the configured denomination when priceable, else the first raw amount. */
  primary?: SensitiveAmountDisplay
  raw: RawAssetAmountDisplay[]
}

interface AssetMetadata {
  decimals?: number
  name?: string
  ticker?: string
}

interface BuildTransactionAmountDisplayArgs {
  assets?: Asset[]
  bitcoinUnit: Unit
  currency: Currencies
  fromFiatAmount: (amount: number, currency: Currencies) => number
  isVerifiedAsset: (assetId: string) => boolean
  metadataForAsset?: (assetId: string) => AssetMetadata | undefined
  network?: string
  satoshis: number
  toFiatAmount: (satoshis: number, currency: Currencies) => number
}

export function buildTransactionAmountDisplay({
  assets,
  bitcoinUnit,
  currency,
  fromFiatAmount,
  isVerifiedAsset,
  metadataForAsset = () => undefined,
  network,
  satoshis,
  toFiatAmount,
}: BuildTransactionAmountDisplayArgs): TransactionAmountDisplay {
  // one pass per asset: the display entry and its sats-equivalent share the
  // resolved currency/metadata instead of re-deriving them
  const resolved = assets?.length
    ? assets.map((asset) =>
        resolveAsset(asset, metadataForAsset(asset.assetId), network, isVerifiedAsset, fromFiatAmount),
      )
    : undefined
  const raw = resolved ? resolved.map((entry) => entry.raw) : [rawBitcoinAmount(satoshis, bitcoinUnit)]
  const satsEquivalent = resolved
    ? resolved.every((entry) => entry.satsEquivalent !== undefined)
      ? resolved.reduce((total, entry) => total + (entry.satsEquivalent ?? 0), 0)
      : undefined
    : Math.abs(satoshis)
  const configured = configuredAmount(satsEquivalent, currency, bitcoinUnit, toFiatAmount)

  return { configured, primary: configured ?? raw[0], raw }
}

function resolveAsset(
  asset: Asset,
  metadata: AssetMetadata | undefined,
  network: string | undefined,
  isVerifiedAsset: (assetId: string) => boolean,
  fromFiatAmount: (amount: number, currency: Currencies) => number,
): { raw: RawAssetAmountDisplay; satsEquivalent?: number } {
  const amount = absoluteBigInt(BigInt(asset.amount))
  const trusted = isVerifiedAsset(asset.assetId)
  const accountCurrency = verifiedDesignatedCurrency(network, asset.assetId, isVerifiedAsset)
  const ticker =
    accountCurrency ?? metadata?.ticker?.trim().toUpperCase() ?? metadata?.name ?? shortAssetId(asset.assetId)
  const decimals = metadata?.decimals ?? 8
  const value = accountCurrency
    ? fiatAccountAssetSatoshis(amount, decimals, accountCurrency, fromFiatAmount)
    : undefined
  const satsEquivalent =
    value !== undefined && Number.isFinite(value) && (amount === BigInt(0) || value !== 0) ? Math.abs(value) : undefined

  return {
    raw: {
      assetId: asset.assetId,
      masked: prettyHide(amount, ticker),
      ticker,
      trusted,
      unverified: !trusted,
      value: `${prettyCurrencyAssetAmount(amount, decimals, trusted ? ticker : undefined)} ${ticker}`,
    },
    satsEquivalent,
  }
}

function rawBitcoinAmount(satoshis: number, bitcoinUnit: Unit): RawAssetAmountDisplay {
  const amount = Math.abs(satoshis)

  return {
    masked: prettyBitcoinHide(amount, bitcoinUnit),
    ticker: 'BTC',
    value: prettyBitcoinAmount(amount, bitcoinUnit),
  }
}

function configuredAmount(
  satoshis: number | undefined,
  currency: Currencies,
  bitcoinUnit: Unit,
  toFiatAmount: (satoshis: number, currency: Currencies) => number,
): SensitiveAmountDisplay | undefined {
  if (satoshis === undefined) return undefined

  const amount = toFiatAmount(Math.abs(satoshis), currency)
  if (!Number.isFinite(amount) || (satoshis !== 0 && amount === 0)) return undefined

  return {
    masked: prettyFiatHide(amount, currency, { bitcoinUnit }),
    value: prettyFiatAmount(amount, currency, { bitcoinUnit }),
  }
}

function absoluteBigInt(value: bigint): bigint {
  return value < BigInt(0) ? -value : value
}

function shortAssetId(assetId: string): string {
  return assetId.length > 8 ? `${assetId.slice(0, 8)}…` : assetId
}
