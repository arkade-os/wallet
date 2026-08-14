/**
 * Reading the book off the chain.
 *
 * An order is a VTXO at a covenant script. `createOffer` embeds a type 0x03
 * packet in the funding transaction, so every resting order announces its own
 * terms, and the Arkade server streams every transaction along with the virtual
 * outputs it created and spent. That stream is the whole book.
 *
 * Nothing here polls. Both halves of an order's life are push events:
 *
 *   funding tx with a 0x03 packet   -> a row appears (terms from the packet,
 *                                      deposit from the vtxo it created)
 *   spend of a row's outpoint       -> the row is gone
 *
 * The one read that is not a stream event is {@link deadOrders}, which answers
 * "did any cached row die while nothing was watching?" — a reconciliation, not
 * a heartbeat.
 *
 * What this deliberately does NOT do is classify how an order left the book. A
 * spent row is simply gone. Telling a fill from a cancel matters for your own
 * records, and `watchOfferSwaps` already does it there against the covenant
 * leaf that was actually taken.
 */
import { base64, hex } from '@scure/base'
import { Extension, Transaction, type ArkProvider, type IndexerProvider, type Vtxo } from '@arkade-os/sdk'
import { BTC_ASSET_ID, decodeOffer, OFFER_PACKET_TYPE, type Offer } from '@arkade-os/swap'
import type { BookOrder } from './types.ts'

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
 * Build a row from an offer and the output that funded it.
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
  const sats = BigInt(vtxo.amount)
  return {
    id: outpointId(vtxo),
    fundingTxid: vtxo.outpoint.txid,
    vout: vtxo.outpoint.vout,
    offerHex,
    swapPkScript: hex.encode(offer.swapPkScript),
    give: deposited
      ? { assetId: deposited.assetId, amount: BigInt(deposited.amount) }
      : { assetId: BTC_ASSET_ID, amount: sats },
    want: {
      assetId: offer.wantAsset ? offer.wantAsset.toString() : BTC_ASSET_ID,
      amount: offer.wantAmount,
    },
    makerPkScript: hex.encode(offer.makerPkScript),
    depositSats: sats,
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

export interface BookReaderParams {
  arkProvider: Pick<ArkProvider, 'getTransactionsStream'>
  /** This network's covenant co-signer, x-only. Offers naming another are
   * unfillable here and never reach the book. */
  emulatorPubkey: Uint8Array
  signal: AbortSignal
  /** Outpoint ids currently held, so a spend of one is recognised. A callback
   * rather than a value: the stream outlives any single render. */
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
 * previous session need reconciling once — and again after any gap the caller
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
