/**
 * The book's vocabulary and its integer arithmetic.
 *
 * A resting offer is the swap covenant `createOffer` already funds: one leg is
 * sats, the other is an asset, and a fill takes the whole deposit. Prices stay
 * ratios so two rungs one atomic unit apart do not collapse into the same
 * number and sort in input order.
 */
import { BTC_ASSET_ID } from '@arkade-os/swap/protocol'

export const isBtc = (assetId: string): boolean => assetId === BTC_ASSET_ID

/** A resting order: one unspent deposit at one covenant script. */
export interface BookOrder {
  /** `${fundingTxid}:${vout}`. Identical offers share an address, so the
   * outpoint is the only identity of one deposit. */
  id: string
  fundingTxid: string
  vout: number
  /** The encoded offer. The only input `cancelOffer` needs to rebuild the covenant. */
  offerHex: string
  swapPkScript: string
  /** What the covenant holds — what a taker receives, in full. */
  give: { assetId: string; amount: bigint }
  /** What a fill must deliver to the maker. The covenant enforces this. */
  want: { assetId: string; amount: bigint }
  /** Where a fill must pay. Also what makes an order ours. */
  makerPkScript: string
  /** Sats sitting at the covenant. The asset itself when the deposit is BTC;
   * the carrier when the deposit is an asset. */
  depositSats: bigint
  createdAt: number
}

/** Exact ratio. Compared by cross-multiplication, never by division. */
export interface Ratio {
  num: bigint
  den: bigint
}

export interface BookRow extends BookOrder {
  side: 'bid' | 'ask'
  /** Quote-atomic per base-atomic. For an asset/BTC pair: sats per asset unit. */
  price: Ratio
  mine: boolean
}

export interface Book {
  pairKey: string
  /** Cheapest first. The first row is what a buyer takes. */
  asks: BookRow[]
  /** Highest first. The first row is what a seller hits. */
  bids: BookRow[]
  spread?: Ratio
}

export interface AssetAmount {
  assetId: string
  amount: bigint
}

/** What a buy or a sell deposits, and what a fill must deliver. */
export interface OrderTerms {
  give: AssetAmount
  want: AssetAmount
}

export const cmpRatio = (a: Ratio, b: Ratio): number => {
  const left = a.num * b.den
  const right = b.num * a.den
  return left < right ? -1 : left > right ? 1 : 0
}

export const ratioToNumber = ({ num, den }: Ratio): number => (den === 0n ? NaN : Number(num) / Number(den))

/**
 * Quote-display per one whole base unit.
 *
 * A price is quote-atomic per base-atomic. Humans read sats per whole token,
 * which differs by 10^(baseDecimals - quoteDecimals).
 */
export const displayPrice = (price: Ratio, baseDecimals: number, quoteDecimals = 0): number =>
  ratioToNumber(price) * 10 ** (baseDecimals - quoteDecimals)

/** BTC is always the quote, so both directions of one market share a book. */
export const pairKeyOf = (a: string, b: string): string => {
  if (a === BTC_ASSET_ID) return `${b}/${a}`
  if (b === BTC_ASSET_ID) return `${a}/${b}`
  return a < b ? `${a}/${b}` : `${b}/${a}`
}

export const baseOf = (pairKey: string): string => pairKey.split('/')[0]

export const quoteOf = (pairKey: string): string => pairKey.split('/')[1]

export const pairKeyOfOrder = (order: BookOrder): string => pairKeyOf(order.give.assetId, order.want.assetId)

/** Giving the base for quote is an ask. Giving quote for the base is a bid. */
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
  return undefined
}

/** A zero-denominator order is dropped: it has no price, and nothing should offer to take it. */
export const buildBook = (orders: Iterable<BookOrder>, pairKey: string, myPkScripts: ReadonlySet<string>): Book => {
  const rows: BookRow[] = []
  for (const order of orders) {
    if (pairKeyOfOrder(order) !== pairKey) continue
    const row = toRow(order, pairKey, myPkScripts)
    if (row && row.price.den > 0n && row.price.num > 0n) rows.push(row)
  }
  const asks = rows.filter((row) => row.side === 'ask').sort((a, b) => cmpRatio(a.price, b.price))
  const bids = rows.filter((row) => row.side === 'bid').sort((a, b) => cmpRatio(b.price, a.price))
  const spread =
    asks[0] && bids[0] && cmpRatio(asks[0].price, bids[0].price) > 0
      ? {
          num: asks[0].price.num * bids[0].price.den - bids[0].price.num * asks[0].price.den,
          den: asks[0].price.den * bids[0].price.den,
        }
      : undefined
  return { pairKey, asks, bids, spread }
}

/**
 * Sats a base amount is worth at a display price of `sats per whole token`.
 *
 * `price` is that display price as an exact fraction. Asks round up and bids
 * round down, so a rounded rung is never better than the number the person typed.
 * Returns 0 when the amount is too small to be worth one satoshi.
 */
export const quoteAtomsFor = (baseAtoms: bigint, price: Ratio, baseDecimals: number, round: 'up' | 'down'): bigint => {
  if (baseAtoms <= 0n || price.num <= 0n || price.den <= 0n || baseDecimals < 0) return 0n
  const scale = price.den * 10n ** BigInt(baseDecimals)
  const product = baseAtoms * price.num
  if (round === 'up') return (product + scale - 1n) / scale
  return product / scale
}

/** Parse a positive decimal. `1.50` is 3/2. More than 8 fractional digits is refused. */
export const parseDecimal = (text: string): Ratio | undefined => {
  const trimmed = text.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined
  const [whole, fraction = ''] = trimmed.split('.')
  const digits = fraction.replace(/0+$/, '')
  if (digits.length > 8) return undefined
  const den = 10n ** BigInt(digits.length)
  const num = BigInt(whole) * den + (digits ? BigInt(digits) : 0n)
  if (num <= 0n) return undefined
  return { num, den }
}

/** Parse a token amount into atomic units. Extra precision past `decimals` is refused. */
export const parseAtoms = (text: string, decimals: number): bigint | undefined => {
  const price = parseDecimal(text)
  if (!price || decimals < 0) return undefined
  const scale = 10n ** BigInt(decimals)
  if (price.den > scale) return undefined
  return (price.num * scale) / price.den
}

/** Buy deposits sats and wants the asset. Sell deposits the asset and wants sats. */
export const termsFor = (
  side: 'buy' | 'sell',
  assetId: string,
  baseAtoms: bigint,
  quoteAtoms: bigint,
): OrderTerms | undefined => {
  if (isBtc(assetId) || baseAtoms <= 0n || quoteAtoms <= 0n) return undefined
  if (side === 'buy')
    return { give: { assetId: BTC_ASSET_ID, amount: quoteAtoms }, want: { assetId, amount: baseAtoms } }
  return { give: { assetId, amount: baseAtoms }, want: { assetId: BTC_ASSET_ID, amount: quoteAtoms } }
}

/**
 * The resting row these terms can take, if any.
 *
 * A fill has no remainder. The row must GIVE exactly the amount wanted — a
 * resting 1,000 cannot settle an order for 100 — and WANT no more than what
 * is offered. Own rows are excluded: taking your own deposit pays yourself.
 * Without an emulator the covenant spend cannot be submitted, so a match
 * would be a promise the trade cannot keep.
 */
export const matchRow = (book: Book, terms: OrderTerms, takeable: boolean): BookRow | undefined => {
  if (!takeable) return undefined
  const rows = isBtc(terms.want.assetId) ? book.bids : book.asks
  return rows.find(
    (row) =>
      !row.mine &&
      row.give.assetId === terms.want.assetId &&
      row.give.amount === terms.want.amount &&
      row.want.assetId === terms.give.assetId &&
      row.want.amount <= terms.give.amount,
  )
}
