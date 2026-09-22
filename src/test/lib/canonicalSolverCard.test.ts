import { beforeEach, describe, expect, it } from 'vitest'
import { discover, marketCorridor, marketNetworkErrors, planOffer, validateCard } from '@arkade-os/solver-discovery'
import { findMarket } from '@arkade-os/swap/protocol'
import betaSolverCard from '../../lib/beta-solver.card.json'
import { BUNDLED_CARDS, discoveryOptions } from '../../lib/swapMarkets'
import { readSolverCards } from '../../lib/solverCards'

/**
 * The card a solver publishes. Asset ids are CAIP-19, both legs settle through
 * Arkade, and the price is the feed — there is no rendezvous because nothing
 * is negotiated. This is the document Settings stores; discovery is what turns
 * it into the index shape the quote path prices.
 */
const DEPIX_ID = '0abcbc23c60028511880807dfe42aa16de88bd56df210a0b9135262d5d3959510000'
const DEPIX_CAIP = `arkade:bitcoin/asset:${DEPIX_ID}`
const BTC_CAIP = 'arkade:bitcoin/slip44:0'

const canonicalCard = {
  version: 0,
  name: 'solver-ae6c048f',
  markets: [
    {
      base_asset: { id: BTC_CAIP, name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: {
        id: DEPIX_CAIP,
        name: 'Decentralized PIX',
        ticker: 'DePix',
        decimals: 8,
      },
      price_feed: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL',
      price_feed_schema: { type: 'json', price_path: '/price' },
      price_decimals: 0,
      fee_bps: 140,
      min_base_amount: '1001',
      max_base_amount: '10000000000000',
      min_quote_amount: '330',
      max_quote_amount: '10000000000000',
    },
  ],
}

const discoverCard = (card: unknown, network: 'bitcoin' | 'mutinynet' = 'bitcoin') =>
  discover({
    registries: [],
    localCards: [{ card, network, label: 'pinned' }],
    network,
  })

describe('canonical solver card', () => {
  beforeEach(() => localStorage.clear())

  it('is a card Settings can store', () => {
    expect(validateCard(canonicalCard).ok).toBe(true)
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'bitcoin', label: canonicalCard.name, card: canonicalCard }]),
    )
    expect(readSolverCards().map(({ label }) => label)).toEqual([canonicalCard.name])
  })

  it('names the network mismatch Settings rejects on save', () => {
    const result = validateCard(canonicalCard)
    expect(result.ok).toBe(true)
    const errors = result.value!.markets.flatMap((market) => marketNetworkErrors(market, 'mutinynet'))
    expect(errors.join(' ')).toMatch(/bitcoin/)
    expect(result.value!.markets.flatMap((market) => marketNetworkErrors(market, 'bitcoin'))).toEqual([])
  })

  it('discovers as the index shape the quote path prices', async () => {
    const { markets, warnings } = await discoverCard(canonicalCard)
    expect(warnings).toEqual([])
    expect(markets).toHaveLength(1)
    const [market] = markets
    // Short ids are what the wallet's balances and the offer covenant speak.
    // caip19_id keeps the rail, which is how a delivered-carrier charge still
    // sees an Arkade asset after the id is down-projected.
    expect(market.base_asset).toMatchObject({ id: 'btc', caip19_id: BTC_CAIP })
    expect(market.quote_asset).toMatchObject({ id: DEPIX_ID, caip19_id: DEPIX_CAIP, ticker: 'DePix' })
    expect(market.pair).toBe('BTC/DePix')
    expect(market).not.toHaveProperty('quote_corridor')
    expect(market.price_feed).toBe(canonicalCard.markets[0].price_feed)
    expect(marketCorridor(market, 'base')).toBe('arkade')
    expect(marketCorridor(market, 'quote')).toBe('arkade')

    const givingBase = findMarket(markets, 'btc', DEPIX_ID)
    expect(givingBase).toMatchObject({ give: 'base' })
    const givingQuote = findMarket(markets, DEPIX_ID, 'btc')
    expect(givingQuote).toMatchObject({ give: 'quote' })

    const plan = planOffer({
      market,
      give: 'base',
      giveAmount: BigInt(100_000),
      feedValue: 600_000,
    })
    expect(plan.deposit.asset.id).toBe('btc')
    expect(plan.receive.asset.id).toBe(DEPIX_ID)
    expect(plan.receive.atomic).toBeGreaterThan(0n)
  })

  it('still charges for a delivered carrier, which the down-projected id must not hide', () => {
    return discoverCard({
      ...canonicalCard,
      markets: [{ ...canonicalCard.markets[0], charges_delivered_carrier: true }],
    }).then(({ markets }) => {
      expect(() =>
        planOffer({ market: markets[0], give: 'base', giveAmount: BigInt(100_000), feedValue: 600_000 }),
      ).toThrow(/carrierSats/)
    })
  })

  it('does not price a card filed under a different network than its asset ids', async () => {
    const { markets, warnings } = await discoverCard(canonicalCard, 'mutinynet')
    expect(markets).toEqual([])
    expect(warnings.join(' ')).toMatch(/bitcoin/)
  })

  it('keeps the bundled lightning card addressable after the same projection', async () => {
    const { markets, warnings } = await discover({
      registries: [],
      localCards: [{ card: betaSolverCard, network: 'bitcoin' }],
      network: 'bitcoin',
    })
    expect(warnings).toEqual([])
    expect(markets).toHaveLength(1)
    expect(markets[0].base_asset.id).toBe('btc')
    expect(markets[0].quote_asset.id).toBe('btc')
    expect(markets[0].quote_corridor).toBe('lightning')
    expect(marketCorridor(markets[0], 'quote')).toBe('bolt11')
    expect(markets[0].discovery_pubkey).toBe(betaSolverCard.discovery_pubkey)
    expect(markets[0].transports?.nostr?.relays).toEqual(betaSolverCard.transports.nostr.relays)
  })

  it('leaves a legacy card in the index shape it was already published in', async () => {
    const legacy = {
      version: 0,
      name: 'legacy-solver',
      markets: [
        {
          pair: 'BTC/DePix',
          base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
          quote_asset: { id: DEPIX_ID, name: 'Decentralized PIX', ticker: 'DePix', decimals: 8 },
          price_feed: canonicalCard.markets[0].price_feed,
          price_feed_schema: canonicalCard.markets[0].price_feed_schema,
          price_decimals: 0,
          fee_bps: 140,
          min_base_amount: '1001',
          max_base_amount: '10000000000000',
          min_quote_amount: '330',
          max_quote_amount: '10000000000000',
        },
      ],
    }
    const { markets, warnings } = await discoverCard(legacy)
    expect(warnings).toEqual([])
    expect(markets[0].base_asset).toEqual(legacy.markets[0].base_asset)
    expect(markets[0].quote_asset).toEqual(legacy.markets[0].quote_asset)
    expect(markets[0].pair).toBe('BTC/DePix')
    expect(markets[0]).not.toHaveProperty('quote_corridor')
  })

  it('stores the canonical bytes and lets discovery project them', () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'bitcoin', label: canonicalCard.name, card: canonicalCard }]),
    )
    const pinned = discoveryOptions('bitcoin').localCards?.find((card) => card.label === canonicalCard.name)
    // The signature covers the canonical document, and Settings shows what was
    // saved. Down-projection happens inside discovery, not in storage.
    expect(readSolverCards()[0].card).toMatchObject({ markets: [{ base_asset: { id: BTC_CAIP } }] })
    expect(pinned?.card).toEqual(canonicalCard)
    expect(BUNDLED_CARDS[0].card).toBe(betaSolverCard)
  })
})
