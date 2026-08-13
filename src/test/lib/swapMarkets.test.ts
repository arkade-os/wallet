import { describe, expect, it } from 'vitest'
import { planOffer, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { preFeeDisplayRate } from '../../lib/swapMarkets'
import { btcUsdt } from './swapFixtures'

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
