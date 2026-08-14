import { describe, expect, it } from 'vitest'
import { BTC_ASSET_ID } from '@arkade-os/swap'
import { buildBook, cmpRatio, pairKeyOf, pairsOf, toRow, type BookOrder } from '../../lib/book'

const SEED = 'aa'.repeat(34)
const OTHER = 'bb'.repeat(34)
const MINE = 'ff'.repeat(34)
const THEIRS = 'ee'.repeat(34)
const nobody = new Set<string>()

/** A resting order. `give`/`want` are the two facts a book is built from. */
const order = (o: Partial<BookOrder> & Pick<BookOrder, 'id' | 'give' | 'want'>): BookOrder => ({
  fundingTxid: o.id.split(':')[0],
  vout: 0,
  offerHex: '00',
  swapPkScript: '51'.repeat(17),
  makerPkScript: THEIRS,
  depositSats: 330n,
  createdAt: 0,
  ...o,
})

/** 100 SEED (6dp) offered for `sats` — an ask on the SEED/BTC book. */
const ask = (id: string, sats: bigint, maker = THEIRS) =>
  order({
    id,
    give: { assetId: SEED, amount: 100_000_000n },
    want: { assetId: BTC_ASSET_ID, amount: sats },
    makerPkScript: maker,
  })

/** `sats` bid for 100 SEED. */
const bid = (id: string, sats: bigint, maker = THEIRS) =>
  order({
    id,
    give: { assetId: BTC_ASSET_ID, amount: sats },
    want: { assetId: SEED, amount: 100_000_000n },
    makerPkScript: maker,
  })

describe('pairKeyOf', () => {
  it('always makes BTC the quote side, so both directions group under one book', () => {
    expect(pairKeyOf(SEED, BTC_ASSET_ID)).toBe(`${SEED}/${BTC_ASSET_ID}`)
    expect(pairKeyOf(BTC_ASSET_ID, SEED)).toBe(`${SEED}/${BTC_ASSET_ID}`)
  })

  it('orders an asset-for-asset pair deterministically', () => {
    expect(pairKeyOf(OTHER, SEED)).toBe(pairKeyOf(SEED, OTHER))
  })
})

describe('toRow', () => {
  const pair = pairKeyOf(SEED, BTC_ASSET_ID)

  it('prices both sides in quote-per-base despite opposite wire directions', () => {
    // give 100 SEED want 5150 sats, and give 4950 sats want 100 SEED, both
    // price as sats per SEED atomic unit — otherwise the sides cannot compare
    expect(toRow(ask('a:0', 5_150n), pair, nobody)).toMatchObject({
      side: 'ask',
      price: { num: 5_150n, den: 100_000_000n },
    })
    expect(toRow(bid('b:0', 4_950n), pair, nobody)).toMatchObject({
      side: 'bid',
      price: { num: 4_950n, den: 100_000_000n },
    })
  })

  it('flags an order whose payout script is ours', () => {
    expect(toRow(ask('a:0', 5_150n, MINE), pair, new Set([MINE]))?.mine).toBe(true)
    expect(toRow(ask('a:0', 5_150n, THEIRS), pair, new Set([MINE]))?.mine).toBe(false)
  })

  it('rejects an order belonging to another pair', () => {
    const foreign = order({
      id: 'c:0',
      give: { assetId: OTHER, amount: 1n },
      want: { assetId: BTC_ASSET_ID, amount: 1n },
    })
    expect(toRow(foreign, pair, nobody)).toBeUndefined()
  })
})

describe('buildBook', () => {
  const pair = pairKeyOf(SEED, BTC_ASSET_ID)

  it('sorts asks cheapest-first and bids highest-first', () => {
    const book = buildBook(
      [ask('a1:0', 5_150n), ask('a2:0', 5_050n), ask('a3:0', 5_100n), bid('b1:0', 4_850n), bid('b2:0', 4_950n)],
      pair,
      nobody,
    )
    expect(book.asks.map((r) => r.id)).toEqual(['a2:0', 'a3:0', 'a1:0'])
    expect(book.bids.map((r) => r.id)).toEqual(['b2:0', 'b1:0'])
  })

  it('ranks rungs that differ by a single atomic unit', () => {
    // the case a float price collapses: 1e18 and 1e18+1 are the same double,
    // so a book sorted on numbers would put these in input order
    const huge = 1_000_000_000_000_000_000n
    const a = order({ id: 'a:0', give: { assetId: SEED, amount: 1n }, want: { assetId: BTC_ASSET_ID, amount: huge } })
    const b = order({
      id: 'b:0',
      give: { assetId: SEED, amount: 1n },
      want: { assetId: BTC_ASSET_ID, amount: huge + 1n },
    })
    expect(buildBook([b, a], pair, nobody).asks.map((r) => r.id)).toEqual(['a:0', 'b:0'])
    expect(cmpRatio({ num: huge, den: 1n }, { num: huge + 1n, den: 1n })).toBe(-1)
  })

  it('reports a spread only when the book is not crossed', () => {
    const open = buildBook([ask('a:0', 5_050n), bid('b:0', 4_950n)], pair, nobody)
    // 5050/1e8 - 4950/1e8 = 100/1e8 sats per atomic unit
    expect(open.spread).toBeDefined()
    expect(cmpRatio(open.spread!, { num: 100n, den: 100_000_000n })).toBe(0)

    // best bid at or above best ask: the top rows are takeable against each
    // other, and a negative "spread" would invite the UI to render one
    expect(buildBook([ask('a:0', 4_900n), bid('b:0', 4_950n)], pair, nobody).spread).toBeUndefined()
    expect(buildBook([ask('a:0', 5_000n), bid('b:0', 5_000n)], pair, nobody).spread).toBeUndefined()
  })

  it('drops an unpriceable order rather than ranking it', () => {
    const zero = order({
      id: 'z:0',
      give: { assetId: SEED, amount: 0n },
      want: { assetId: BTC_ASSET_ID, amount: 5_000n },
    })
    expect(buildBook([zero, ask('a:0', 5_050n)], pair, nobody).asks.map((r) => r.id)).toEqual(['a:0'])
  })

  it('ignores orders from other pairs', () => {
    const foreign = order({
      id: 'f:0',
      give: { assetId: OTHER, amount: 10n },
      want: { assetId: BTC_ASSET_ID, amount: 10n },
    })
    const book = buildBook([foreign, ask('a:0', 5_050n)], pair, nobody)
    expect(book.asks).toHaveLength(1)
    expect(book.bids).toHaveLength(0)
  })
})

describe('pairsOf', () => {
  it('groups both directions of a market under one pair, busiest first', () => {
    const pairs = pairsOf([
      ask('a:0', 5_050n),
      bid('b:0', 4_950n),
      order({ id: 'c:0', give: { assetId: OTHER, amount: 1n }, want: { assetId: BTC_ASSET_ID, amount: 1n } }),
    ])
    expect(pairs).toEqual([
      { pairKey: pairKeyOf(SEED, BTC_ASSET_ID), count: 2 },
      { pairKey: pairKeyOf(OTHER, BTC_ASSET_ID), count: 1 },
    ])
  })
})
