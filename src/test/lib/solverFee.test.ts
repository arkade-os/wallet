import { describe, expect, it } from 'vitest'
import { planOffer, validateCard, type DiscoveredMarket } from '@arkade-os/solver-discovery'

/**
 * The wallet's own copy of `@arkade-os/solver-discovery` and the copy inside the
 * shipped `@arkade-os/swap` must agree on which cards are valid and what a card
 * costs. These pin the 0.2.7 side of that agreement: reverting the wallet's pin
 * to 0.2.5 turns every case below red.
 */

const BTC = 'arkade:mutinynet/slip44:1'
const TOKEN = `arkade:mutinynet/asset:${'f'.repeat(68)}`

const market = (extra: Record<string, unknown> = {}): DiscoveredMarket =>
  ({
    base_asset: { id: BTC, name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
    quote_asset: { id: TOKEN, name: 'Token', ticker: 'TOK', decimals: 2 },
    price_feed: 'https://feed.test/price',
    price_feed_schema: { type: 'json', price_path: '/price' },
    price_decimals: 6,
    fee_bps: 30,
    min_base_amount: '1000',
    max_base_amount: '5000000',
    min_quote_amount: '50',
    max_quote_amount: '500000',
    ...extra,
  }) as unknown as DiscoveredMarket

const card = (m: DiscoveredMarket) => ({
  version: 0,
  name: 'solver',
  discovery_pubkey: 'a'.repeat(64),
  transports: { nostr: { relays: ['wss://relay.test'] } },
  markets: [m],
})

const depositOf = (m: DiscoveredMarket, wantAmount: bigint): bigint =>
  planOffer({ market: m, give: 'base', wantAmount, feedValue: 100_000, safetyBps: 0 }).deposit.atomic

const receiveOf = (m: DiscoveredMarket, carrierSats?: bigint): bigint =>
  planOffer({ market: m, give: 'base', giveAmount: BigInt(100_000), feedValue: 100_000, safetyBps: 0, carrierSats })
    .receive.atomic

describe('solver_fee cards', () => {
  it('validates a card advertising solver_fee', () => {
    expect(validateCard(card(market({ solver_fee: { base: { bps: 30, flat: '100' } } })))).toMatchObject({ ok: true })
  })

  it('validates a card advertising charges_delivered_carrier', () => {
    expect(validateCard(card(market({ charges_delivered_carrier: true })))).toMatchObject({ ok: true })
  })

  it('refuses a card whose fee_bps understates the widest solver_fee spread', () => {
    const result = validateCard(card(market({ fee_bps: 30, solver_fee: { base: { bps: 55 } } })))
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.errors.join()).toMatch(/widest solver_fee spread/)
  })

  it('takes solver_fee.flat off the deposit before the spread', () => {
    expect(receiveOf(market())).toBe(BigInt(9970))
    expect(receiveOf(market({ solver_fee: { base: { bps: 30, flat: '100' } } }))).toBe(BigInt(9960))
  })

  it('inverts that charge when the user drives the received side', () => {
    expect(depositOf(market(), BigInt(9960))).toBe(BigInt(99_900))
    expect(depositOf(market({ solver_fee: { base: { bps: 30, flat: '100' } } }), BigInt(9960))).toBe(BigInt(100_000))
  })

  it('prices the direction traded, while fee_bps stays the widest spread for the fee row', () => {
    const perSide = market({ solver_fee: { base: { bps: 10 }, quote: { bps: 30 } } })
    expect(receiveOf(perSide)).toBe(BigInt(9990))
    expect(perSide.fee_bps).toBe(30)
  })

  it('supersedes fee_flat rather than summing with it', () => {
    expect(receiveOf(market({ fee_flat: '500' }))).toBe(BigInt(9470))
    expect(receiveOf(market({ fee_flat: '500', solver_fee: { base: { bps: 30 } } }))).toBe(BigInt(9970))
  })
})

describe('charges_delivered_carrier markets', () => {
  const charging = market({ charges_delivered_carrier: true })

  it('refuses to price without carrierSats rather than under-depositing', () => {
    expect(() => receiveOf(charging)).toThrow(/carrierSats/)
  })

  it('takes the carrier off the deposit when it is supplied', () => {
    expect(receiveOf(charging, BigInt(330))).toBe(BigInt(9937))
  })

  it('refuses a negative carrier charge', () => {
    expect(() => receiveOf(charging, BigInt(-1))).toThrow(/must not be negative/)
  })

  it('leaves a market that declares no carrier charge priced as before', () => {
    expect(receiveOf(market(), BigInt(330))).toBe(BigInt(9970))
  })
})
