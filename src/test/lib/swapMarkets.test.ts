import { describe, expect, it } from 'vitest'
import { planOffer, type DiscoveredMarket, type Side } from '@arkade-os/solver-discovery'
import { marketFeeBps, planFeeBps, preFeeDisplayRate } from '../../lib/swapMarkets'
import { btcUsdt, btcUsdtPerSide } from './swapFixtures'

describe('preFeeDisplayRate', () => {
  it('quotes the feed price giving the base side and its inverse giving the quote side', () => {
    const base = planOffer({ market: btcUsdt, give: 'base', giveAmount: BigInt(10_000), feedValue: 100_000 })
    expect(preFeeDisplayRate(base)).toBe(100_000)
    const quote = planOffer({ market: btcUsdt, give: 'quote', giveAmount: BigInt(1_000), feedValue: 100_000 })
    expect(preFeeDisplayRate(quote)).toBe(0.00001)
  })

  it('survives display prices below the 8-decimal floor of plan.priceDisplay', () => {
    // a registry may publish BTC as the QUOTE asset; a base token worth under
    // a satoshi then has a display price that priceDisplay truncates to
    // "0.00000000" — the exact rational must still price the Rate row
    const tokenBtc: DiscoveredMarket = {
      ...btcUsdt,
      pair: 'TOKEN/BTC',
      base_asset: { id: 'aa'.repeat(34), name: 'Token', ticker: 'TOK', decimals: 8 },
      quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      price_decimals: 0,
    }
    const base = planOffer({
      market: tokenBtc,
      give: 'base',
      giveAmount: BigInt(100_000_000),
      feedValue: '0.000000005',
    })
    expect(Number(base.priceDisplay)).toBe(0)
    expect(preFeeDisplayRate(base)).toBe(5e-9)
    const quote = planOffer({ market: tokenBtc, give: 'quote', giveAmount: BigInt(1_000), feedValue: '0.000000005' })
    expect(preFeeDisplayRate(quote)).toBe(200_000_000)
  })
})

describe('the spread the traded direction is actually priced at', () => {
  const plan = (market: DiscoveredMarket, give: Side) =>
    planOffer({ market, give, giveAmount: BigInt(10_000), feedValue: 100_000, safetyBps: 0 })

  it('reads the side solver_fee prices, not the widest spread fee_bps must pin', () => {
    expect(btcUsdtPerSide.fee_bps).toBe(30)
    expect(planFeeBps(plan(btcUsdtPerSide, 'base'))).toBe(10)
    expect(planFeeBps(plan(btcUsdtPerSide, 'quote'))).toBe(30)
    expect(marketFeeBps(btcUsdtPerSide, 'base')).toBe(10)
    expect(marketFeeBps(btcUsdtPerSide, 'quote')).toBe(30)
  })

  it('falls back to fee_bps for a card that prices no side, or not this one', () => {
    expect(planFeeBps(plan(btcUsdt, 'base'))).toBe(30)
    expect(marketFeeBps(btcUsdt, 'quote')).toBe(30)
    expect(marketFeeBps({ ...btcUsdtPerSide, solver_fee: { quote: { bps: 30 } } }, 'base')).toBe(30)
  })

  it('over-states the fee 3.006x where fee_bps stands in for the narrow direction', () => {
    const base = plan(btcUsdtPerSide, 'base')
    // planOffer already prices the direction; only the display, grossing the payout by f/(1-f), is wrong
    expect(base.receive.atomic).toBe(BigInt(999))
    const shownFee = (bps: number) => (Number(base.receive.atomic) * (bps / 10_000)) / (1 - bps / 10_000)
    expect(shownFee(planFeeBps(base))).toBeCloseTo(1, 10)
    expect(shownFee(base.market.fee_bps)).toBeCloseTo(3.006, 3)
    expect(shownFee(base.market.fee_bps) / shownFee(planFeeBps(base))).toBeCloseTo(3.006, 3)
  })
})
