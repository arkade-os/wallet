import { describe, it, expect } from 'vitest'
import {
  buildAssetSwapActivityTx,
  lnSwapLabel,
  swapAmountBeforeFee,
  swapFeeAmount,
  swapRouteLabel,
  swapUnitOfAccountAmount,
} from '../../lib/swapDisplay'
import type { WalletAssetSwap } from '../../lib/swapRepository'
import { MUTINYNET_USDT_ASSET_ID } from '../../lib/accountAssets'
import { Currencies, Tx, Unit } from '../../lib/types'

const PRICE = 63_750 // USD per whole BTC

// Mirror providers/fiat.tsx: fiat conversions go through the price feed and are
// unit-independent, while the BTC "currency" routes through fromBTC/toBTC,
// which DO depend on the wallet's bitcoin-unit setting.
const makeFiat = (unit: Unit) => ({
  fromFiatAmount: (amount: number, currency: Currencies) => {
    if (currency === Currencies.BTC) return unit === Unit.BTC ? Math.round(amount * 1e8) : Math.floor(amount)
    return Math.round((amount / PRICE) * 1e8) // fiat -> sats
  },
  toFiatAmount: (sats: number, currency: Currencies) => {
    if (currency === Currencies.BTC) return unit === Unit.BTC ? sats / 1e8 : sats
    return (sats / 1e8) * PRICE // sats -> fiat
  },
})

// A 1,600 sats -> ~1.02 USD swap. Persisted while the unit of account was BTC,
// so the snapshot is denominated in BTC (fiatCurrency 'BTC', fiatAmount in sats).
const btcCurrencySwap = (): Tx =>
  ({
    type: 'swap',
    assetSwap: {
      fromAssetId: 'btc',
      fromTicker: 'sats',
      fromDecimals: 0,
      fromAmount: BigInt(1600),
      toAssetId: 'usd-asset',
      toTicker: 'USD',
      toDecimals: 8,
      toAmount: BigInt(102_265_046),
      fiatAmount: 1604, // the unit-of-account snapshot in sats (currency was BTC)
      fiatCurrency: 'BTC',
      feeBps: 0,
      status: 'completed',
    },
  }) as unknown as Tx

describe('swapRouteLabel', () => {
  it('uses the BTC ticker for either bitcoin leg regardless of its persisted denomination', () => {
    expect(swapRouteLabel(btcCurrencySwap())).toBe('BTC to USD')

    const reverse = btcCurrencySwap()
    reverse.assetSwap = {
      ...reverse.assetSwap!,
      fromAssetId: 'usd-asset',
      fromTicker: 'USD',
      toAssetId: 'btc',
      toTicker: 'sats',
    }
    expect(swapRouteLabel(reverse)).toBe('USD to BTC')
  })
})

describe('swap receipt amounts', () => {
  it('shows a zero fee and keeps the total received equal to the before-fee amount', () => {
    const tx = btcCurrencySwap()

    expect(swapFeeAmount(tx)?.value).toBe('0.00 USD')
    expect(swapAmountBeforeFee(tx)?.value).toBe('1.02 USD')
  })

  it('reconciles the before-fee amount, fee, and received total', () => {
    const tx = btcCurrencySwap()
    tx.assetSwap!.feeBps = 200
    tx.assetSwap!.toAmount = BigInt(645_000_000)

    expect(swapFeeAmount(tx)?.value).toBe('0.13 USD')
    expect(swapAmountBeforeFee(tx)?.value).toBe('6.58 USD')
  })
})

describe('swapUnitOfAccountAmount', () => {
  it('does not inflate a BTC-denominated snapshot by 1e8 when viewed in a fiat currency', () => {
    // Regression: viewing a BTC-currency swap while the unit is BTC used to
    // route fiatAmount (sats) through fromBTC -> toSatoshis -> x1e8, rendering
    // $102,265,046 for a $1.02 swap.
    const { toFiatAmount, fromFiatAmount } = makeFiat(Unit.BTC)
    const result = swapUnitOfAccountAmount({
      currency: Currencies.USD,
      fromFiatAmount,
      toFiatAmount,
      tx: btcCurrencySwap(),
    })
    expect(result?.value).toBe('$1.02')
  })

  it('shows the BTC-leg satoshis when the unit of account is BTC, regardless of unit setting', () => {
    for (const unit of [Unit.SATS, Unit.BTC]) {
      const { toFiatAmount, fromFiatAmount } = makeFiat(unit)
      const result = swapUnitOfAccountAmount({
        currency: Currencies.BTC,
        fromFiatAmount,
        toFiatAmount,
        tx: btcCurrencySwap(),
      })
      expect(result?.value).toBe('1,600 sats')
    }
  })

  it('reconverts a stable fiat snapshot into the display currency', () => {
    const { toFiatAmount, fromFiatAmount } = makeFiat(Unit.SATS)
    const tx = btcCurrencySwap()
    tx.assetSwap!.fiatCurrency = 'USD'
    tx.assetSwap!.fiatAmount = 1.02
    const result = swapUnitOfAccountAmount({ currency: Currencies.USD, fromFiatAmount, toFiatAmount, tx })
    expect(result?.value).toBe('$1.02')
  })
})

const swap = (id: string): WalletAssetSwap => ({
  id,
  fromAsset: 'btc',
  toAsset: 'f1'.repeat(34),
  fromAmount: '10000',
  toAmount: '992',
  swapAddress: 'tark1q...',
  swapPkScript: '5120' + 'ab'.repeat(32),
  offerHex: '0100',
  fundingTxid: id,
  status: 'pending',
  createdAt: 1,
})

describe('buildAssetSwapActivityTx', () => {
  it('builds the row from the actual fill and the quote metadata', () => {
    const fulfilled = {
      ...swap('funding-txid'),
      status: 'fulfilled' as const,
      createdAt: 2_000,
      spentTxid: 'fill-txid',
      completedAt: 2_000,
      quote: {
        fromTicker: 'USD',
        fromDecimals: 2,
        toTicker: 'BRL',
        toDecimals: 2,
        feeBps: 30,
        fiatCurrency: 'USD',
        fromFiatAmount: 100,
      },
    }
    const tx = (redeemTxid: string, assets?: Tx['assets']): Tx => ({
      amount: 330,
      assets,
      boardingTxid: '',
      createdAt: 1,
      explorable: redeemTxid,
      preconfirmed: false,
      redeemTxid,
      roundTxid: '',
      settled: true,
      type: 'received',
    })
    const fillAmount = BigInt(54_321)

    const activity = buildAssetSwapActivityTx(fulfilled, [
      tx('funding-txid'),
      tx('fill-txid', [{ assetId: fulfilled.toAsset, amount: fillAmount }]),
    ])

    expect(activity).toMatchObject({
      type: 'swap',
      redeemTxid: 'fill-txid',
      assetSwap: {
        fromTicker: 'USD',
        toTicker: 'BRL',
        toAmount: fillAmount,
        feeBps: 30,
        fiatAmount: 100,
        status: 'completed',
        fundingTxid: 'funding-txid',
        fillTxid: 'fill-txid',
      },
    })
  })

  it('labels older Mutinynet swap records from their designated asset IDs', () => {
    const legacySwap = { ...swap('funding-txid'), toAsset: MUTINYNET_USDT_ASSET_ID }
    const activity = buildAssetSwapActivityTx(legacySwap, [], { network: 'mutinynet' })

    expect(activity.assetSwap).toMatchObject({ fromTicker: 'sats', toTicker: 'USD' })
  })

  it('prefers the currency designation over the asset metadata ticker', () => {
    const restoredSwap = { ...swap('funding-txid'), toAsset: MUTINYNET_USDT_ASSET_ID }
    const activity = buildAssetSwapActivityTx(restoredSwap, [], {
      network: 'mutinynet',
      assetDisplay: () => ({ ticker: 'USDT', decimals: 2 }),
    })

    expect(activity.assetSwap).toMatchObject({ fromTicker: 'sats', toTicker: 'USD', toDecimals: 2 })
  })

  it('reads an unrecognised package status as still in flight', () => {
    // the package's AssetSwapStatus covers corridors an offer swap never uses
    const claimable = { ...swap('funding-txid'), status: 'claimable' as const }

    expect(buildAssetSwapActivityTx(claimable, []).assetSwap).toMatchObject({ status: 'pending' })
  })
})

describe('lnSwapLabel', () => {
  const row = (lnSwap?: Tx['lnSwap']) => ({ lnSwap }) as Tx

  it('names the outcome, and calls a refund a refund rather than a failure', () => {
    expect(lnSwapLabel(row({ label: 'Lightning send', outcome: 'refunded' }))).toBe('Lightning send refunded')
    expect(lnSwapLabel(row({ label: 'Lightning send', outcome: 'pending' }))).toBe('Lightning send pending')
    expect(lnSwapLabel(row({ label: 'Lightning send', outcome: 'failed' }))).toBe('Lightning send failed')
  })

  it('calls a lost receive lost, which is the opposite of a refund', () => {
    // The resolver emits `lost` for a `lightning_receive` that ended
    // `refunded`. On that leg every non-claim leaf of the covenant is the
    // SOLVER's, so the lockup going back means the payment never arrived —
    // money gone, not money returned. Reading it as "refunded" would tell the
    // user the exact opposite of what happened.
    expect(lnSwapLabel(row({ label: 'Lightning receive', outcome: 'lost' }))).toBe('Lightning receive lost')
    expect(lnSwapLabel(row({ label: 'Lightning receive', outcome: 'lost' }))).not.toContain('refunded')
  })

  it('still calls a SEND that came back refunded, on the same token set', () => {
    // The two legs read `refunded` in opposite directions, and the package is
    // what tells them apart — the wallet must not collapse the distinction.
    expect(lnSwapLabel(row({ label: 'Lightning send', outcome: 'refunded' }))).toBe('Lightning send refunded')
  })

  it('says nothing extra once the payment simply went through', () => {
    expect(lnSwapLabel(row({ label: 'Lightning send', outcome: 'settled' }))).toBe('Lightning send')
    expect(lnSwapLabel(row({ label: 'Lightning receive', outcome: 'settled' }))).toBe('Lightning receive')
  })

  it('falls back to the corridor name for an outcome token it does not know', () => {
    expect(lnSwapLabel(row({ outcome: 'something-new' }))).toBe('Lightning send')
  })

  it('leaves a row the resolver never tagged alone', () => {
    expect(lnSwapLabel(row())).toBeUndefined()
  })
})
