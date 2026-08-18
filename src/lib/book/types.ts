/**
 * The book's vocabulary and its pure arithmetic. No I/O, no injected anything —
 * every function here is total and synchronous, which is what makes the book
 * testable without a chain and reusable from a CLI.
 */
import { BTC_ASSET_ID } from '@arkade-os/swap'

/** A resting order: one unspent deposit at one covenant script. */
export interface BookOrder {
  /** `${fundingTxid}:${vout}` — identical offers share an address, so the
   * outpoint is the only thing that identifies one deposit. */
  id: string
  fundingTxid: string
  vout: number
  /** The encoded offer. The only input `cancelOffer` needs to rebuild the covenant. */
  offerHex: string
  swapPkScript: string
  /** What the covenant holds — what a taker receives. */
  give: { assetId: string; amount: bigint }
  /** What a fill must deliver to the maker. Covenant-enforced. */
  want: { assetId: string; amount: bigint }
  /** Where a fill must pay. Also what makes an order "mine". */
  makerPkScript: string
  /** Sats sitting at the covenant. Equals `give.amount` for a BTC deposit; for
   * an asset deposit this is the VTXO carrier, which a taker also receives. */
  depositSats: bigint
  createdAt: number
}

/** Exact ratio. Kept as integers: a book sorted on floats mis-ranks rungs that
 * differ in the last atomic unit, which is exactly where rungs cluster. */
export interface Ratio {
  num: bigint
  den: bigint
}

/** An order placed against a pair, with the side and price that implies. */
export interface BookRow extends BookOrder {
  side: 'bid' | 'ask'
  /** Quote-atomic per base-atomic. For an asset/BTC pair: sats per asset unit. */
  price: Ratio
  mine: boolean
}

export interface Book {
  pairKey: string
  /** Cheapest first — the first row is what a buyer takes. */
  asks: BookRow[]
  /** Highest first — the first row is what a seller hits. */
  bids: BookRow[]
  spread?: Ratio
}

/** Compare two ratios without dividing. */
export const cmpRatio = (a: Ratio, b: Ratio): number => {
  const l = a.num * b.den
  const r = b.num * a.den
  return l < r ? -1 : l > r ? 1 : 0
}

export const ratioToNumber = ({ num, den }: Ratio): number => (den === 0n ? NaN : Number(num) / Number(den))

/**
 * Render a price for display, scaled from atomic units to whole units.
 *
 * A price is quote-atomic per base-atomic; humans read quote-display per
 * base-display. The two differ by 10^(baseDecimals - quoteDecimals), which for
 * a 6dp asset against sats is a factor of a million — the difference between
 * "50 sats" and "0.00005 sats".
 */
export const displayPrice = (price: Ratio, baseDecimals: number, quoteDecimals: number): number =>
  ratioToNumber(price) * 10 ** (baseDecimals - quoteDecimals)

/**
 * A pair's canonical key. BTC is always the quote side, so an asset/BTC book
 * reads in sats and both directions of the same market group together instead
 * of forming two half-empty books.
 */
export const pairKeyOf = (a: string, b: string): string => {
  if (a === BTC_ASSET_ID) return `${b}/${a}`
  if (b === BTC_ASSET_ID) return `${a}/${b}`
  return a < b ? `${a}/${b}` : `${b}/${a}`
}

/** The base (priced) asset of a pair key. */
export const baseOf = (pairKey: string): string => pairKey.split('/')[0]
/** The quote (pricing) asset of a pair key. */
export const quoteOf = (pairKey: string): string => pairKey.split('/')[1]

export const pairKeyOfOrder = (order: BookOrder): string => pairKeyOf(order.give.assetId, order.want.assetId)

/**
 * Place an order on a pair.
 *
 * Giving the base asset to receive quote is an ask; giving quote to receive the
 * base is a bid. Price is quote-atomic per base-atomic in both cases, which is
 * what lets the two sides be compared at all — they are quoted in opposite
 * directions on the wire.
 */
export const toRow = (order: BookOrder, pairKey: string, myPkScripts: ReadonlySet<string>): BookRow | undefined => {
  const base = baseOf(pairKey)
  const quote = quoteOf(pairKey)
  const mine = myPkScripts.has(order.makerPkScript)

  if (order.give.assetId === base && order.want.assetId === quote) {
    return { ...order, side: 'ask', price: { num: order.want.amount, den: order.give.amount }, mine }
  }
  if (order.give.assetId === quote && order.want.assetId === base) {
    return { ...order, side: 'bid', price: { num: order.give.amount, den: order.want.amount }, mine }
  }
  return undefined // not this pair
}

/** Sort a pair's orders into a book. A zero-denominator order is dropped
 * rather than ranked: it has no price, and no UI should offer to take it. */
export const buildBook = (orders: Iterable<BookOrder>, pairKey: string, myPkScripts: ReadonlySet<string>): Book => {
  const rows: BookRow[] = []
  for (const order of orders) {
    if (pairKeyOfOrder(order) !== pairKey) continue
    const row = toRow(order, pairKey, myPkScripts)
    if (row && row.price.den > 0n && row.price.num > 0n) rows.push(row)
  }

  const asks = rows.filter((r) => r.side === 'ask').sort((a, b) => cmpRatio(a.price, b.price))
  const bids = rows.filter((r) => r.side === 'bid').sort((a, b) => cmpRatio(b.price, a.price))

  // Only a real gap is a spread. A crossed book (best bid at or above best ask)
  // is not an error to hide — it means the top rows are takeable against each
  // other, and reporting a negative spread would invite a UI to render one.
  const spread =
    asks[0] && bids[0] && cmpRatio(asks[0].price, bids[0].price) > 0
      ? {
          num: asks[0].price.num * bids[0].price.den - bids[0].price.num * asks[0].price.den,
          den: asks[0].price.den * bids[0].price.den,
        }
      : undefined

  return { pairKey, asks, bids, spread }
}

/** One step of the depth curve. A price with the size resting at or better
 * than it, on whichever side reaches that far. */
export interface DepthPoint {
  price: number
  bid?: number
  ask?: number
}

/**
 * The book as a depth curve, ascending by price.
 *
 * This is the one chart an order book can honestly draw. A price chart needs
 * trade history — which fills happened, when — and resting covenants record
 * none of that. Depth needs only the book as it stands right now, so it is
 * exact rather than accumulated.
 *
 * The two sides deliberately do not meet: bids stop at the best bid and asks
 * start at the best ask, leaving the spread as a literal gap in the middle.
 * Rendered with `connectNulls={false}` that gap is the point of the picture.
 *
 * Sizes are the BASE asset, cumulative outward from the middle — walking down
 * the bids or up the asks — which is what makes the curve read as "how much
 * could I fill before the price moves this far".
 */
export const depthCurve = (book: Book, baseDecimals: number, quoteDecimals = 0): DepthPoint[] => {
  const scale = 10 ** baseDecimals
  // an ask deposits the base asset; a bid asks for it
  const baseSize = (row: BookRow) => (row.side === 'ask' ? row.give.amount : row.want.amount)

  // Cumulative sums stay exact in bigint and only become numbers at the edge,
  // where a chart pixel cannot tell the difference anyway.
  const walk = (rows: BookRow[], side: 'bid' | 'ask'): DepthPoint[] => {
    let cumulative = 0n
    return rows.map((row) => {
      cumulative += baseSize(row)
      return {
        price: displayPrice(row.price, baseDecimals, quoteDecimals),
        [side]: Number(cumulative) / scale,
      } as DepthPoint
    })
  }

  // bids arrive highest-first, so reversing puts the whole curve in price order
  return [...walk(book.bids, 'bid')].reverse().concat(walk(book.asks, 'ask'))
}

/** Every pair with at least one resting order, most orders first. */
export const pairsOf = (orders: Iterable<BookOrder>): { pairKey: string; count: number }[] => {
  const counts = new Map<string, number>()
  for (const order of orders) {
    const key = pairKeyOfOrder(order)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([pairKey, count]) => ({ pairKey, count }))
    .sort((a, b) => b.count - a.count || a.pairKey.localeCompare(b.pairKey))
}
