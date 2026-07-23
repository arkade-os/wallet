import { describe, it, expect } from 'vitest'
import { swapRouteLabel, swapUnitOfAccountAmount } from '../../lib/swapDisplay'
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
