/**
 * Reading the book off the indexer.
 *
 * `createOffer` embeds a type 0x03 packet in the funding transaction, so every
 * resting order announces its own terms. SDK 0.5 asks the server to yield only
 * those transactions (`hasPacket(tx.extension, 3)`) instead of shipping every
 * tx for the client to filter. A funding event adds a row. A spend of that
 * outpoint removes it. Nothing here refetches the book on a timer.
 *
 * The one read that is not a stream event is {@link deadOrders}: rows cached
 * from a previous session, checked once against the indexer. The stream cannot
 * report what happened while it was closed.
 */
import { base64, hex } from '@scure/base'
import { Extension, Transaction, asset, type IndexerProvider, type VirtualCoin } from '@arkade-os/sdk'
import { BTC_ASSET_ID, OFFER_PACKET_TYPE, decodeOffer } from '@arkade-os/swap/protocol'
import type { BookOrder } from './types'

export const OFFER_SUBSCRIPTION = `hasPacket(tx.extension, ${OFFER_PACKET_TYPE})`

const outpointId = (txid: string, vout: number): string => `${txid}:${vout}`

type OfferView = {
  wantAmount: bigint
  wantAsset?: { toString(): string }
  offerAsset?: { toString(): string }
  swapPkScript: Uint8Array
  makerPkScript: Uint8Array
  emulatorPubkey: Uint8Array
}

/** The offer packet, or undefined for anything that is not a well-formed offer. */
export const offerFromTx = (tx: Transaction): { offer: OfferView; offerHex: string } | undefined => {
  try {
    const packet = Extension.fromTx(tx).getPacketByType(OFFER_PACKET_TYPE)
    if (!packet) return undefined
    const payload = packet.serialize()
    return { offer: decodeOffer(payload), offerHex: hex.encode(payload) }
  } catch {
    return undefined
  }
}

const createdAtMs = (raw: Date | string | number | undefined): number => {
  if (raw instanceof Date) return Number.isFinite(raw.getTime()) ? raw.getTime() : Date.now()
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw > 1e12 ? raw : raw * 1000
  if (typeof raw === 'string' && raw) {
    const asNumber = Number(raw)
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber > 1e12 ? asNumber : asNumber * 1000
    const parsed = Date.parse(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.now()
}

/**
 * How much of `assetId` the funding transaction pays to `vout`.
 *
 * The asset packet rides the same extension as the offer, so the transaction
 * already in hand states the deposit size. The subscription's vtxo often
 * carries `assets: null`, and reading the sat carrier as the size is what
 * turned asset asks into a phantom BTC market.
 */
export const assetAmountAt = (tx: Transaction, assetId: string, vout: number): bigint | undefined => {
  try {
    const packet = Extension.fromTx(tx).getPacketByType(asset.Packet.PACKET_TYPE)
    if (!packet) return undefined
    for (const group of asset.Packet.fromBytes(packet.serialize()).groups) {
      if (group.assetId?.toString() !== assetId) continue
      for (const output of group.outputs) if (output.vout === vout) return output.amount
    }
  } catch {
    return undefined
  }
  return undefined
}

export interface DepositCoin {
  txid: string
  vout: number
  value: number | bigint
  createdAt?: Date | string | number
  assets?: readonly { assetId: string; amount: bigint | number | string }[]
}

/**
 * One row from an offer and the output that funded it.
 *
 * `offerAsset` names the deposit and is covenant-bound, so it decides which
 * asset rests here. The amount comes from the funding packet, then from the
 * vtxo, and is skipped when neither can size it. A row we cannot size is not
 * a row. Both legs the same asset is a misread, and it is refused.
 */
export const bindOrder = (
  offer: OfferView,
  offerHex: string,
  coin: DepositCoin,
  depositAssetAmount?: bigint,
): BookOrder | undefined => {
  const sats = BigInt(coin.value)
  const depositAssetId = offer.offerAsset?.toString()
  let give: { assetId: string; amount: bigint }
  if (depositAssetId) {
    const fromCoin = coin.assets?.find((entry) => entry.assetId === depositAssetId)
    const amount = depositAssetAmount ?? (fromCoin !== undefined ? BigInt(fromCoin.amount) : undefined)
    if (amount === undefined || amount <= 0n) return undefined
    give = { assetId: depositAssetId, amount }
  } else {
    const deposited = coin.assets?.[0]
    give = deposited
      ? { assetId: deposited.assetId, amount: BigInt(deposited.amount) }
      : { assetId: BTC_ASSET_ID, amount: sats }
  }

  const want = {
    assetId: offer.wantAsset ? offer.wantAsset.toString() : BTC_ASSET_ID,
    amount: offer.wantAmount,
  }
  if (give.assetId === want.assetId || give.amount <= 0n || want.amount <= 0n) return undefined

  return {
    id: outpointId(coin.txid, coin.vout),
    fundingTxid: coin.txid,
    vout: coin.vout,
    offerHex,
    swapPkScript: hex.encode(offer.swapPkScript),
    give,
    want,
    makerPkScript: hex.encode(offer.makerPkScript),
    depositSats: sats,
    createdAt: createdAtMs(coin.createdAt),
  }
}

const txFromPayload = (payload: string): Transaction | undefined => {
  try {
    return Transaction.fromPSBT(base64.decode(payload))
  } catch {
    try {
      return Transaction.fromPSBT(hex.decode(payload))
    } catch {
      return undefined
    }
  }
}

const sameKey = (a: Uint8Array, b: Uint8Array): boolean => hex.encode(a) === hex.encode(b)

export interface BookEvent {
  tx?: string
  newVtxos?: readonly VirtualCoin[]
  spentVtxos?: readonly VirtualCoin[]
  sweptVtxos?: readonly VirtualCoin[]
}

export interface BookDelta {
  orders: BookOrder[]
  goneIds: string[]
}

/** What one subscription event does to the book. A foreign co-signer is dropped:
 * this wallet's emulator cannot execute that covenant. */
export const deltaFromEvent = (event: BookEvent, emulatorPubkey: Uint8Array): BookDelta => {
  const goneIds = [...(event.spentVtxos ?? []), ...(event.sweptVtxos ?? [])].map((coin) =>
    outpointId(coin.txid, coin.vout),
  )
  const tx = event.tx ? txFromPayload(event.tx) : undefined
  const found = tx ? offerFromTx(tx) : undefined
  if (!found || !sameKey(found.offer.emulatorPubkey, emulatorPubkey)) return { orders: [], goneIds }

  const script = hex.encode(found.offer.swapPkScript)
  const orders: BookOrder[] = []
  for (const coin of event.newVtxos ?? []) {
    if (coin.script.toLowerCase() !== script.toLowerCase()) continue
    const depositAssetId = found.offer.offerAsset?.toString()
    const sized = depositAssetId ? assetAmountAt(tx!, depositAssetId, coin.vout) : undefined
    const order = bindOrder(found.offer, found.offerHex, coin, sized)
    if (order) orders.push(order)
  }
  return { orders, goneIds }
}

export interface BookReaderParams {
  indexer: Pick<IndexerProvider, 'getFilteredSubscription'>
  /** This network's covenant co-signer, x-only. Offers naming another never reach the book. */
  emulatorPubkey: Uint8Array
  signal: AbortSignal
  onDelta: (delta: BookDelta) => void
  onError?: (err: unknown) => void
}

const pause = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })

/**
 * Follow the filtered subscription until `signal` aborts.
 *
 * The SDK stream reconnects on its own while the socket is merely quiet. This
 * loop only restarts it after it throws, with a short backoff, so one refused
 * connection does not end the book.
 */
export const readBook = async (params: BookReaderParams): Promise<void> => {
  const { indexer, emulatorPubkey, signal, onDelta, onError } = params
  let backoff = 1_000
  while (!signal.aborted) {
    try {
      for await (const message of indexer.getFilteredSubscription({ expressions: [OFFER_SUBSCRIPTION] }, signal)) {
        if (signal.aborted) return
        if (message.type !== 'event') continue
        try {
          onDelta(deltaFromEvent(message, emulatorPubkey))
        } catch (err) {
          onError?.(err)
        }
      }
      return
    } catch (err) {
      if (signal.aborted) return
      onError?.(err)
      await pause(backoff, signal)
      backoff = Math.min(backoff * 2, 30_000)
    }
  }
}

/**
 * Which of these cached orders are no longer resting.
 *
 * Not a heartbeat. A row that slips through is caught when a fill finds the
 * deposit already spent.
 */
export const deadOrders = async (
  indexer: Pick<IndexerProvider, 'getVtxos'>,
  orders: readonly BookOrder[],
): Promise<string[]> => {
  if (orders.length === 0) return []
  const scripts = [...new Set(orders.map((order) => order.swapPkScript))]
  const { vtxos } = await indexer.getVtxos({ scripts, spendableOnly: true })
  const resting = new Set(vtxos.map((coin) => outpointId(coin.txid, coin.vout)))
  return orders.filter((order) => !resting.has(order.id)).map((order) => order.id)
}
