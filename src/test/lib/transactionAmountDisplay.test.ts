import { describe, expect, it } from 'vitest'
import { MUTINYNET_USDT_ASSET_ID } from '../../lib/accountAssets'
import { buildTransactionAmountDisplay } from '../../lib/transactionAmountDisplay'
import { Currencies, Unit } from '../../lib/types'

const metadata = { decimals: 2, name: 'Tether USD', ticker: 'USDT' }

describe('transaction amount display', () => {
  it('uses the configured currency first and the designated USD account amount second', () => {
    const result = buildTransactionAmountDisplay({
      assets: [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(200) }],
      bitcoinUnit: Unit.BTC,
      currency: Currencies.EUR,
      fromFiatAmount: (amount, currency) => (currency === Currencies.USD ? amount * 1_000 : 0),
      isVerifiedAsset: () => true,
      metadataForAsset: () => metadata,
      network: 'mutinynet',
      satoshis: 0,
      toFiatAmount: (satoshis, currency) => (currency === Currencies.EUR ? satoshis * 0.000875 : 0),
    })

    expect(result.configured?.value).toBe('€1.75')
    expect(result.raw[0]).toMatchObject({ ticker: 'USD', trusted: true, value: '2.00 USD' })
  })

  it('does not let an unverified lookalike asset claim the USD account identity', () => {
    const result = buildTransactionAmountDisplay({
      assets: [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(200) }],
      bitcoinUnit: Unit.BTC,
      currency: Currencies.EUR,
      fromFiatAmount: () => 2_000,
      isVerifiedAsset: () => false,
      metadataForAsset: () => metadata,
      network: 'mutinynet',
      satoshis: 0,
      toFiatAmount: () => 1.75,
    })

    expect(result.configured).toBeUndefined()
    expect(result.raw[0]).toMatchObject({ ticker: 'USDT', trusted: false, value: '2 USDT' })
  })

  it('falls back to the actual amount when account pricing is unavailable', () => {
    const result = buildTransactionAmountDisplay({
      assets: [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(200) }],
      bitcoinUnit: Unit.BTC,
      currency: Currencies.EUR,
      fromFiatAmount: () => 0,
      isVerifiedAsset: () => true,
      metadataForAsset: () => metadata,
      network: 'mutinynet',
      satoshis: 0,
      toFiatAmount: () => 0,
    })

    expect(result.configured).toBeUndefined()
    expect(result.raw[0].value).toBe('2.00 USD')
  })

  it('formats the configured bitcoin unit without inventing an asset conversion', () => {
    const result = buildTransactionAmountDisplay({
      bitcoinUnit: Unit.SATS,
      currency: Currencies.BTC,
      fromFiatAmount: () => 0,
      isVerifiedAsset: () => false,
      satoshis: 1_234,
      toFiatAmount: (satoshis) => satoshis,
    })

    expect(result.configured?.value).toBe('1,234 sats')
    expect(result.raw[0].value).toBe('1,234 sats')
  })
})
