import { describe, expect, it } from 'vitest'
import { BTC_ASSET_ID } from '@arkade-os/swap'
import { asset } from '@arkade-os/sdk'
import { bindOrder, buildBook, cmpRatio, depthCurve, pairKeyOf, pairsOf, toRow, type BookOrder } from '../../lib/book'

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

describe('bindOrder', () => {
  const assetId = 'aa'.repeat(32) + '0000'
  const vtxo = (assets?: { assetId: string; amount: string }[]) =>
    ({
      outpoint: { txid: 'dd'.repeat(32), vout: 0 },
      createdAt: '1700000000',
      expiresAt: null,
      amount: '330', // the sat carrier an asset deposit rides on
      script: '51'.repeat(17),
      isPreconfirmed: false,
      isSwept: false,
      isUnrolled: false,
      isSpent: false,
      spentBy: null,
      commitmentTxids: [],
      assets,
    }) as never

  /** An ask: deposit the asset, want sats. `offerAsset` names the deposit. */
  const askOffer = {
    swapPkScript: new Uint8Array(34),
    wantAmount: 10_000_000n,
    offerAsset: asset.AssetId.fromString(assetId),
    makerPkScript: new Uint8Array(34),
    makerPublicKey: new Uint8Array(32),
    emulatorPubkey: new Uint8Array(32),
  } as never

  it('sizes an asset deposit from the tx packet, not from its sat carrier', () => {
    // the stream reports assets: null on every vtxo, so the size arrives
    // separately — read from the funding tx's own asset packet
    const order = bindOrder(askOffer, '00', vtxo(undefined), 100_000_000n)
    expect(order?.give).toEqual({ assetId, amount: 100_000_000n })
    expect(order?.want.assetId).toBe(BTC_ASSET_ID)
    // the carrier is recorded, but it is NOT the size
    expect(order?.depositSats).toBe(330n)
  })

  it('never falls back to BTC for an asset deposit it cannot size', () => {
    // the first regression: falling back to BTC made give=btc/want=btc, which
    // priced the maker's want against the 330-sat carrier and surfaced a
    // phantom "btc/btc" market at ~30 billion sats. Skipping is correct here —
    // the size is missing, not zero.
    expect(bindOrder(askOffer, '00', vtxo(undefined), undefined)).toBeUndefined()
    expect(bindOrder(askOffer, '00', vtxo(undefined), 0n)).toBeUndefined()
  })

  it('refuses an order whose two legs are the same asset', () => {
    const degenerate = { ...(askOffer as object), offerAsset: undefined } as never
    // no offerAsset and no assets on the vtxo => give reads BTC, want is BTC
    expect(bindOrder(degenerate, '00', vtxo(undefined))).toBeUndefined()
  })
})

describe('depthCurve', () => {
  const pair = pairKeyOf(SEED, BTC_ASSET_ID)
  // 100 SEED at 6dp is 100_000_000 atomic, so each rung is 100 display units
  const book = buildBook(
    [ask('a1:0', 5_050n), ask('a2:0', 5_150n), bid('b1:0', 4_950n), bid('b2:0', 4_850n)],
    pair,
    nobody,
  )

  it('accumulates outward from the middle, in whole base units', () => {
    const curve = depthCurve(book, 6, 0)
    // ascending by price: worst bid, best bid, best ask, worst ask
    expect(curve.map((p) => p.price)).toEqual([48.5, 49.5, 50.5, 51.5])
    // bids accumulate walking DOWN from the best, asks walking UP
    expect(curve.map((p) => p.bid)).toEqual([200, 100, undefined, undefined])
    expect(curve.map((p) => p.ask)).toEqual([undefined, undefined, 100, 200])
  })

  it('leaves the spread as a gap rather than joining the sides', () => {
    // every point carries exactly one side, so a chart drawn with
    // connectNulls={false} renders the spread as empty space
    for (const point of depthCurve(book, 6, 0)) {
      expect(point.bid === undefined || point.ask === undefined).toBe(true)
    }
  })

  it('is empty for an empty book', () => {
    expect(depthCurve(buildBook([], pair, nobody), 6, 0)).toEqual([])
  })
})

describe('what crosses a book', () => {
  // The rule trade() applies, stated in the covenant's own language: a row I
  // can take GIVES exactly what I want and WANTS no more than I offer. These
  // are the cases the user hit — a buy and a sell that never met.
  const pair = pairKeyOf(SEED, BTC_ASSET_ID)
  const crosses = (
    rows: BookOrder[],
    give: { assetId: string; amount: bigint },
    want: { assetId: string; amount: bigint },
    mine = nobody,
  ) =>
    [...buildBook(rows, pair, mine).asks, ...buildBook(rows, pair, mine).bids].find(
      (row) =>
        !row.mine &&
        row.give.assetId === want.assetId &&
        row.give.amount === want.amount &&
        row.want.assetId === give.assetId &&
        row.want.amount <= give.amount,
    )

  const sats = (n: bigint) => ({ assetId: BTC_ASSET_ID, amount: n })
  const seed = (n: bigint) => ({ assetId: SEED, amount: n })

  it('fills a buy against an ask of the same size at or under the price', () => {
    expect(crosses([ask('a:0', 5_000n)], sats(5_000n), seed(100_000_000n))?.id).toBe('a:0')
    // paying more than asked still fills — the covenant only enforces a floor
    expect(crosses([ask('a:0', 5_000n)], sats(6_000n), seed(100_000_000n))?.id).toBe('a:0')
  })

  it('does not fill when the sizes differ — the reason two opposing orders sit crossed', () => {
    // buy 100 against a resting sell of 1,000: no partial fill exists, so this
    // rests beside it rather than matching
    const smaller = 1_000_000n
    expect(crosses([ask('a:0', 5_000n)], sats(50_000n), seed(smaller))).toBeUndefined()
  })

  it('does not fill under the asking price', () => {
    expect(crosses([ask('a:0', 5_000n)], sats(4_999n), seed(100_000_000n))).toBeUndefined()
  })

  it('never fills against my own order', () => {
    const rows = [ask('a:0', 5_000n, MINE)]
    expect(crosses(rows, sats(5_000n), seed(100_000_000n), new Set([MINE]))).toBeUndefined()
    expect(crosses(rows, sats(5_000n), seed(100_000_000n), nobody)?.id).toBe('a:0')
  })

  it('takes the cheapest ask when several qualify', () => {
    const rows = [ask('a1:0', 5_200n), ask('a2:0', 5_000n), ask('a3:0', 5_100n)]
    expect(crosses(rows, sats(9_000n), seed(100_000_000n))?.id).toBe('a2:0')
  })

  it('fills a sell against a bid of the same size at or above the price', () => {
    expect(crosses([bid('b:0', 5_000n)], seed(100_000_000n), sats(5_000n))?.id).toBe('b:0')
    expect(crosses([bid('b:0', 5_000n)], seed(100_000_000n), sats(5_001n))).toBeUndefined()
  })
})
