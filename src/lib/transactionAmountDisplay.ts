import type { Asset } from '@arkade-os/sdk'
import { prettyBitcoinAmount, prettyCurrencyAssetAmount, prettyFiatAmount, prettyFiatHide } from './format'
import { fiatAccountAssetSatoshis, verifiedDesignatedCurrency } from './accountAssets'
import { Currencies, Unit } from './types'

const hiddenAmount = '·'.repeat(8)

export interface SensitiveAmountDisplay {
  masked: string
  value: string
}

export interface RawAssetAmountDisplay extends SensitiveAmountDisplay {
  assetId?: string
  ticker: string
  trusted?: boolean
}

export interface TransactionAmountDisplay {
  configured?: SensitiveAmountDisplay
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
  const raw = assets?.length
    ? assets.map((asset) => rawAssetAmount(asset, metadataForAsset(asset.assetId), network, isVerifiedAsset))
    : [rawBitcoinAmount(satoshis, bitcoinUnit)]
  const satsEquivalent = assets?.length
    ? assetSatoshisEquivalent(assets, metadataForAsset, network, isVerifiedAsset, fromFiatAmount)
    : Math.abs(satoshis)

  return {
    configured: configuredAmount(satsEquivalent, currency, bitcoinUnit, toFiatAmount),
    raw,
  }
}

function rawAssetAmount(
  asset: Asset,
  metadata: AssetMetadata | undefined,
  network: string | undefined,
  isVerifiedAsset: (assetId: string) => boolean,
): RawAssetAmountDisplay {
  const amount = absoluteBigInt(BigInt(asset.amount))
  const trusted = isVerifiedAsset(asset.assetId)
  const accountCurrency = verifiedDesignatedCurrency(network, asset.assetId, isVerifiedAsset)
  const ticker =
    accountCurrency ?? metadata?.ticker?.trim().toUpperCase() ?? metadata?.name ?? shortAssetId(asset.assetId)

  return {
    assetId: asset.assetId,
    masked: `${hiddenAmount} ${ticker}`,
    ticker,
    trusted,
    value: `${prettyCurrencyAssetAmount(amount, metadata?.decimals ?? 8, trusted ? ticker : undefined)} ${ticker}`,
  }
}

function rawBitcoinAmount(satoshis: number, bitcoinUnit: Unit): RawAssetAmountDisplay {
  const amount = Math.abs(satoshis)

  return {
    masked: prettyFiatHide(amount, Currencies.BTC, { bitcoinUnit }),
    ticker: 'BTC',
    value: prettyBitcoinAmount(amount, bitcoinUnit),
  }
}

function assetSatoshisEquivalent(
  assets: Asset[],
  metadataForAsset: (assetId: string) => AssetMetadata | undefined,
  network: string | undefined,
  isVerifiedAsset: (assetId: string) => boolean,
  fromFiatAmount: (amount: number, currency: Currencies) => number,
): number | undefined {
  const values = assets.map((asset) => {
    const currency = verifiedDesignatedCurrency(network, asset.assetId, isVerifiedAsset)
    if (!currency) return undefined

    const amount = absoluteBigInt(BigInt(asset.amount))
    const value = fiatAccountAssetSatoshis(
      amount,
      metadataForAsset(asset.assetId)?.decimals ?? 8,
      currency,
      fromFiatAmount,
    )
    return value !== undefined && Number.isFinite(value) && (amount === BigInt(0) || value !== 0)
      ? Math.abs(value)
      : undefined
  })

  return values.every((value) => value !== undefined)
    ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
    : undefined
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
