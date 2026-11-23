import { describe, expect, it } from 'vitest'
import { hex } from '@scure/base'
import {
  OFFER_SUBSCRIPTION,
  bindOrder,
  buildBook,
  deltaFromEvent,
  displayPrice,
  fundingFor,
  matchRow,
  pairKeyOf,
  parseAtoms,
  quoteAtomsFor,
  termsFor,
  type BookOrder,
} from '../../lib/book'
import type { FillFunding } from '@arkade-os/swap/protocol'

const ASSET = 'ab'.repeat(32) + '0000'
const SCRIPT = hex.decode('5120' + '11'.repeat(32))
const MAKER = hex.decode('5120' + '22'.repeat(32))
const EMULATOR = hex.decode('33'.repeat(32))

const offer = {
  wantAmount: 5_000n,
  offerAsset: { toString: () => ASSET },
  swapPkScript: SCRIPT,
  makerPkScript: MAKER,
  emulatorPubkey: EMULATOR,
}

const coin = {
  txid: 'aa'.repeat(32),
  vout: 0,
  value: 330,
  createdAt: new Date(1_700_000_000_000),
}

const order = (over: Partial<BookOrder> = {}): BookOrder => ({
  id: 'aa:0',
  fundingTxid: 'aa'.repeat(32),
  vout: 0,
  offerHex: '00',
  swapPkScript: '5120' + '11'.repeat(32),
  give: { assetId: ASSET, amount: 100n },
  want: { assetId: 'btc', amount: 5_000n },
  makerPkScript: '5120' + '22'.repeat(32),
  depositSats: 330n,
  createdAt: 1,
  ...over,
})

const fundCoin = (value: number, assetAmount?: bigint, vout = 0) => ({
  txid: 'bb'.repeat(32),
  vout,
  value,
  forfeitTapLeafScript: {} as FillFunding['tapLeafScript'],
  tapTree: new Uint8Array(),
  assets: assetAmount === undefined ? [] : [{ assetId: ASSET, amount: assetAmount }],
})

describe('standing book arithmetic', () => {
  it('quotes an asset against sats in one pair', () => {
    expect(pairKeyOf(ASSET, 'btc')).toBe(pairKeyOf('btc', ASSET))
    expect(pairKeyOf(ASSET, 'btc')).toBe(`${ASSET}/btc`)
  })

  it('sorts asks cheap-first and leaves a crossed book without a spread', () => {
    const book = buildBook(
      [
        order({ id: 'expensive', give: { assetId: ASSET, amount: 100n }, want: { assetId: 'btc', amount: 9_000n } }),
        order({ id: 'cheap', give: { assetId: ASSET, amount: 100n }, want: { assetId: 'btc', amount: 4_000n } }),
        order({
          id: 'bid',
          give: { assetId: 'btc', amount: 8_000n },
          want: { assetId: ASSET, amount: 100n },
        }),
      ],
      `${ASSET}/btc`,
      new Set(),
    )
    expect(book.asks.map((row) => row.id)).toEqual(['cheap', 'expensive'])
    expect(book.bids.map((row) => row.id)).toEqual(['bid'])
    expect(book.spread).toBeUndefined()
  })

  it('scales a price from atomic units to whole tokens', () => {
    // 5,000 sats for 1.000000 token is 5,000 sats per token, not 0.005.
    const price = { num: 5_000n, den: 1_000_000n }
    expect(displayPrice(price, 6, 0)).toBe(5_000)
  })

  it('rounds asks up and bids down, and refuses a price below one satoshi', () => {
    const fifty = { num: 50n, den: 1n }
    expect(quoteAtomsFor(1_000_000n, fifty, 6, 'up')).toBe(50n)
    expect(quoteAtomsFor(1n, fifty, 6, 'down')).toBe(0n)
    expect(quoteAtomsFor(1n, fifty, 6, 'up')).toBe(1n)
  })

  it('refuses an amount more precise than the asset', () => {
    expect(parseAtoms('1.5', 0)).toBeUndefined()
    expect(parseAtoms('1.5', 1)).toBe(15n)
  })

  it('takes only a row that gives exactly the wanted amount', () => {
    const book = buildBook(
      [order(), order({ id: 'other', give: { assetId: ASSET, amount: 50n } })],
      `${ASSET}/btc`,
      new Set(),
    )
    const buy = termsFor('buy', ASSET, 100n, 5_000n)!
    expect(matchRow(book, buy, true)?.id).toBe('aa:0')
    expect(matchRow(book, termsFor('buy', ASSET, 50n, 9_000n)!, true)?.id).toBe('other')
    expect(matchRow(book, termsFor('buy', ASSET, 100n, 4_999n)!, true)).toBeUndefined()
    expect(matchRow(book, buy, false)).toBeUndefined()
  })

  it('does not take the row this wallet posted', () => {
    const book = buildBook([order()], `${ASSET}/btc`, new Set([order().makerPkScript]))
    expect(matchRow(book, termsFor('buy', ASSET, 100n, 5_000n)!, true)).toBeUndefined()
    expect(book.asks[0].mine).toBe(true)
  })
})

describe('binding an offer to its deposit', () => {
  it('sizes an asset deposit from the packet, not the sat carrier', () => {
    const row = bindOrder(offer, 'abcd', coin, 1_000_000n)
    expect(row?.give).toEqual({ assetId: ASSET, amount: 1_000_000n })
    expect(row?.want).toEqual({ assetId: 'btc', amount: 5_000n })
    expect(row?.depositSats).toBe(330n)
  })

  it('skips an asset deposit nobody could size', () => {
    expect(bindOrder(offer, 'abcd', coin)).toBeUndefined()
  })

  it('refuses a row whose two legs are the same asset', () => {
    const btcForBtc = { ...offer, offerAsset: undefined, wantAsset: undefined, wantAmount: 100n }
    expect(bindOrder(btcForBtc, 'abcd', { ...coin, value: 100 })).toBeUndefined()
  })

  it('reads a spend even when the transaction is not an offer', () => {
    const delta = deltaFromEvent(
      {
        tx: 'not-a-transaction',
        spentVtxos: [{ txid: coin.txid, vout: 1 } as never],
      },
      EMULATOR,
    )
    expect(delta.orders).toEqual([])
    expect(delta.goneIds).toEqual([`${coin.txid}:1`])
  })

  it('asks the server for offer packets only', () => {
    expect(OFFER_SUBSCRIPTION).toBe('hasPacket(tx.extension, 3)')
  })
})

describe('funding a fill', () => {
  it('selects sats for an ask and keeps every asset on those coins', () => {
    const ask = order()
    const carrying = { ...fundCoin(4_000, 7n, 1), value: 4_000 }
    const plain = fundCoin(2_000, undefined, 2)
    const fund = fundingFor(ask, [plain, carrying])
    expect(fund.reduce((sum, input) => sum + input.value, 0)).toBeGreaterThanOrEqual(5_000)
    expect(fund.find((input) => input.vout === 1)?.assets).toEqual([{ assetId: ASSET, amount: 7n }])
  })

  it('spends the fewest asset coins that cover a bid, whole', () => {
    const bid = order({
      give: { assetId: 'btc', amount: 5_000n },
      want: { assetId: ASSET, amount: 500n },
    })
    const fund = fundingFor(bid, [fundCoin(330, 100n, 0), fundCoin(330, 800n, 1), fundCoin(330, 50n, 2)])
    expect(fund).toHaveLength(1)
    expect(fund[0].vout).toBe(1)
    expect(fund[0].assets?.[0].amount).toBe(800n)
  })

  it('refuses a bid the wallet cannot cover', () => {
    const bid = order({ want: { assetId: ASSET, amount: 500n }, give: { assetId: 'btc', amount: 1n } })
    expect(() => fundingFor(bid, [fundCoin(330, 100n)])).toThrow(/not enough/)
  })
})
