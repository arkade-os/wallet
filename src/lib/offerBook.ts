/**
 * The order book, read off the chain.
 *
 * An order here is not a row in a venue — it is a VTXO sitting at a covenant
 * script. `createOffer` embeds a type 0x03 packet in the funding transaction,
 * so every resting order announces its own terms, and the Arkade server streams
 * every transaction. That stream is the whole book.
 *
 * Nothing here polls. A notification carries the transaction AND the virtual
 * outputs it created and spent, so an order arriving and an order leaving are
 * both push events off one subscription:
 *
 *   funding tx with a 0x03 packet   -> a row appears (terms from the packet,
 *                                      deposit from the vtxo it created)
 *   spend of a row's outpoint       -> the row is gone
 *
 * The one read that is not a stream event is {@link deadOrders}, which answers
 * "did any of my cached rows die while the app was closed?" — asked once on
 * boot, and again only when the app already refreshes for its own reasons. It
 * is a reconciliation, not a heartbeat.
 *
 * What this deliberately does NOT do is classify how an order left the book. A
 * spent row is simply gone. Telling a fill from a cancel matters for your own
 * records, and `watchOfferSwaps` already does it there against the covenant
 * leaf that was actually taken.
 */
import { base64, hex } from '@scure/base'
import { Extension, Transaction, type ArkProvider, type IndexerProvider, type Vtxo } from '@arkade-os/sdk'
import { BTC_ASSET_ID, decodeOffer, OFFER_PACKET_TYPE, type Offer } from '@arkade-os/swap'

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

/** Compare two ratios without dividing. */
export const cmpRatio = (a: Ratio, b: Ratio): number => {
  const l = a.num * b.den
  const r = b.num * a.den
  return l < r ? -1 : l > r ? 1 : 0
}

export const ratioToNumber = ({ num, den }: Ratio): number => (den === 0n ? NaN : Number(num) / Number(den))

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

export const outpointId = (vtxo: Pick<Vtxo, 'outpoint'>): string => `${vtxo.outpoint.txid}:${vtxo.outpoint.vout}`

/**
 * Read the offer packet out of a transaction.
 *
 * Returns undefined for the overwhelming majority of transactions, which carry
 * no extension at all — `Extension.fromTx` throws in that case, and a throw per
 * non-offer tx is the normal path, not an error worth surfacing.
 */
export const offerFromTx = (tx: Transaction): { offer: Offer; offerHex: string } | undefined => {
  try {
    const packet = Extension.fromTx(tx).getPacketByType(OFFER_PACKET_TYPE)
    if (!packet) return undefined
    const payload = packet.serialize()
    return { offer: decodeOffer(payload), offerHex: hex.encode(payload) }
  } catch {
    // no extension, a foreign packet, or a malformed offer: not a funding tx
    return undefined
  }
}

/** `Vtxo.createdAt` is a string on the wire and has been both unix seconds and
 * an ISO timestamp. Read either; fall back to now rather than sorting on NaN. */
const createdAtMs = (raw: string | undefined): number => {
  if (!raw) return Date.now()
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

/**
 * Build a row from a funding transaction and the output it created.
 *
 * The want side comes off the wire — it is covenant-enforced, so the packet is
 * authoritative. The give side has to come from the VTXO: the covenant never
 * inspects its own deposit, which is exactly what lets one program carry BTC,
 * an asset, or an asset-for-asset swap. An asset deposit also carries sats as
 * its VTXO carrier; the asset is the substance, and a taker gets the carrier
 * along with it.
 */
export const bindOrder = (offer: Offer, offerHex: string, vtxo: Vtxo): BookOrder => {
  const deposited = vtxo.assets?.[0]
  return {
    id: outpointId(vtxo),
    fundingTxid: vtxo.outpoint.txid,
    vout: vtxo.outpoint.vout,
    offerHex,
    swapPkScript: hex.encode(offer.swapPkScript),
    give: deposited
      ? { assetId: deposited.assetId, amount: BigInt(deposited.amount) }
      : { assetId: BTC_ASSET_ID, amount: BigInt(vtxo.amount) },
    want: {
      assetId: offer.wantAsset ? offer.wantAsset.toString() : BTC_ASSET_ID,
      amount: offer.wantAmount,
    },
    makerPkScript: hex.encode(offer.makerPkScript),
    createdAt: createdAtMs(vtxo.createdAt),
  }
}

/**
 * Turn one stream notification into the order it funded, if it funded one.
 *
 * An offer naming a foreign co-signer is dropped here: our emulator cannot
 * execute that covenant, so listing it would be a row nobody using this wallet
 * could ever take.
 */
export const orderFromNotification = (
  notification: { tx: string; spendableVtxos?: Vtxo[] },
  emulatorPubkey: Uint8Array,
): BookOrder | undefined => {
  let tx: Transaction
  try {
    tx = Transaction.fromPSBT(base64.decode(notification.tx))
  } catch {
    return undefined
  }

  const found = offerFromTx(tx)
  if (!found) return undefined
  if (hex.encode(found.offer.emulatorPubkey) !== hex.encode(emulatorPubkey)) return undefined

  const script = hex.encode(found.offer.swapPkScript)
  const deposit = notification.spendableVtxos?.find((v) => v.script === script)
  // the packet rode a transaction that funded nothing at the covenant — a
  // derivation broadcast without its deposit, not an order
  if (!deposit) return undefined

  return bindOrder(found.offer, found.offerHex, deposit)
}

// ── the book ─────────────────────────────────────────────────────────────────

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

export interface Book {
  pairKey: string
  /** Cheapest first — the first row is what a buyer takes. */
  asks: BookRow[]
  /** Highest first — the first row is what a seller hits. */
  bids: BookRow[]
  spread?: Ratio
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

// ── following the chain ──────────────────────────────────────────────────────

export interface BookReaderParams {
  arkProvider: Pick<ArkProvider, 'getTransactionsStream'>
  /** This network's covenant co-signer, x-only. Offers naming another are
   * unfillable here and never reach the book. */
  emulatorPubkey: Uint8Array
  signal: AbortSignal
  /** Outpoint ids currently on screen, so a spend of one is recognised. Read
   * through a ref — the stream outlives any single render. */
  liveIds: () => ReadonlySet<string>
  onOrder: (order: BookOrder) => void
  onGone: (ids: string[]) => void
  onError?: (err: unknown) => void
}

/**
 * Follow the transaction stream and keep a book in step. Resolves when the
 * stream ends (the signal aborts).
 *
 * Both halves of an order's life are events on this one stream, so there is no
 * refetch anywhere in here — a notification is either a new row, the death of
 * one, or neither.
 */
export const readBook = async (params: BookReaderParams): Promise<void> => {
  const { arkProvider, emulatorPubkey, signal, liveIds, onOrder, onGone, onError } = params

  try {
    for await (const notification of arkProvider.getTransactionsStream(signal)) {
      if (signal.aborted) break
      const tx = notification.arkTx ?? notification.commitmentTx
      if (!tx?.tx) continue

      try {
        const order = orderFromNotification(tx, emulatorPubkey)
        if (order) onOrder(order)

        const live = liveIds()
        const gone = (tx.spentVtxos ?? []).map(outpointId).filter((id) => live.has(id))
        if (gone.length > 0) onGone(gone)
      } catch (err) {
        // one malformed notification must not end the stream
        onError?.(err)
      }
    }
  } catch (err) {
    if (!signal.aborted) onError?.(err)
  }
}

/**
 * Which of these cached orders are no longer resting.
 *
 * The stream only reports what happens while it is open, so rows cached from a
 * previous session need reconciling once — and again after any gap the app
 * already knows about, such as regaining focus or a reconnect. Not a heartbeat:
 * a row that slips through stale is caught at take time, where the covenant
 * reports the deposit already spent and the fill path treats that as "someone
 * else took it" rather than an error.
 */
export const deadOrders = async (
  indexer: Pick<IndexerProvider, 'getVtxos'>,
  orders: readonly BookOrder[],
): Promise<string[]> => {
  if (orders.length === 0) return []
  const scripts = [...new Set(orders.map((o) => o.swapPkScript))]
  const { vtxos } = await indexer.getVtxos({ scripts, spendableOnly: true })
  const resting = new Set(vtxos.map((v) => `${v.txid}:${v.vout}`))
  return orders.filter((o) => !resting.has(o.id)).map((o) => o.id)
}
