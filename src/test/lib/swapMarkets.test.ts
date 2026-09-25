import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_NETWORK, planOffer, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { BUNDLED_CARDS, discoveryOptions, preFeeDisplayRate } from '../../lib/swapMarkets'
import { btcUsdt } from './swapFixtures'

describe('discoveryOptions', () => {
  beforeEach(() => localStorage.clear())

  const stored = (network: string) =>
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network, label: 'beta-solver', card: BUNDLED_CARDS[0].card }]),
    )

  it('offers the bundled card, and a stored one, on a network discovery names', () => {
    stored('bitcoin')
    const opts = discoveryOptions('bitcoin')
    expect(opts.network).toBe('bitcoin')
    expect(opts.registryUrl).toBeDefined()
    expect(opts.localCards).toHaveLength(2)
  })

  it('offers no card on a network solver discovery has no name for', () => {
    // Settings stamps `aspInfo.network` on the cards it stores, so a card added
    // while on testnet carries `network: 'testnet'`. The filter used to compare
    // that raw name while `network` fell back to DEFAULT_NETWORK — so the card
    // passed, and was then discovered as a mainnet market.
    stored('testnet')
    expect(discoveryOptions('testnet')).toMatchObject({
      network: DEFAULT_NETWORK,
      registryUrl: undefined,
      localCards: [],
    })
  })
})

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
