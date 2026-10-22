import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NETWORK, planOffer, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { BUNDLED_CARDS, discoveryOptions, preFeeDisplayRate, watchSwapMarkets } from '../../lib/swapMarkets'
import { sharedTransportCards } from '../../lib/solverCardRemote'
import { btcUsdt } from './swapFixtures'

const mocks = vi.hoisted(() => ({
  watchMarkets: vi.fn(),
}))

const { mockNostrCardFetcher } = vi.hoisted(() => ({
  mockNostrCardFetcher: vi.fn(() => ({ fetch: vi.fn() })),
}))

vi.mock('@arkade-os/swap/nostr', () => ({
  nostrCardFetcher: mockNostrCardFetcher,
}))

vi.mock('@arkade-os/swap/protocol', () => ({
  discoverMarkets: vi.fn(),
  watchMarkets: mocks.watchMarkets,
}))

describe('discoveryOptions', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNostrCardFetcher.mockClear()
  })

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

  it('hands discovery the shared transport reader', () => {
    const opts = discoveryOptions('bitcoin')
    expect(opts.transportCards).toBe(sharedTransportCards())
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

describe('watchSwapMarkets', () => {
  it('bypasses the market cache so every watch tick reads solver-published cards', () => {
    const stop = vi.fn()
    mocks.watchMarkets.mockReturnValue(stop)

    expect(watchSwapMarkets('bitcoin', () => {})).toBe(stop)
    expect(mocks.watchMarkets).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'bitcoin',
        repository: expect.anything(),
        transportCards: expect.anything(),
        useCache: false,
      }),
      expect.any(Function),
    )
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
