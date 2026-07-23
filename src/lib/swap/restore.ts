/**
 * Rebuild swap records after a wallet restore.
 *
 * The localStorage swap store dies with the browser profile, but everything
 * the activity UI needs is recomputable from chain data: the funding tx we
 * sent carries the offer packet (type 0x03) in its extension, the covenant
 * vtxo at the offer's script holds the deposit, and that vtxo's spender is
 * the completion (or cancel) tx. Scan the sent virtual txs, decode the
 * offers, and bind each funding vtxo to its spend.
 *
 * The scan is incremental: txids checked with an authoritative answer are
 * remembered, so late-synced history is picked up by later scans and nothing
 * is ever fetched twice.
 */
import { base64, hex } from '@scure/base'
import { Extension, RestIndexerProvider, Transaction } from '@arkade-os/sdk'
import { decodeOffer, Offer, OFFER_PACKET_TYPE } from './offer'
import { getStorageItem, setStorageItemSafely } from '../storage'
import type { AssetSwap, AssetSwapStatus } from './store'
import type { Tx } from '../types'

/** localStorage key: sent txids already checked for offer packets. */
export const SWAP_RESTORE_SCAN_KEY = 'assetSwapsScanned'

// ponytail: fixed request size; tune only if histories outgrow it
const TXS_PER_REQUEST = 50

type RestoreIndexer = Pick<RestIndexerProvider, 'getVirtualTxs' | 'getVtxos'>

export const getScannedTxids = (): Set<string> =>
  getStorageItem(SWAP_RESTORE_SCAN_KEY, new Set<string>(), (val) => {
    const parsed = JSON.parse(val)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  })

export const markTxidsScanned = (txids: Iterable<string>): void => {
  const merged = getScannedTxids()
  for (const txid of txids) merged.add(txid)
  // persistence is an optimization; an unsaved set only means a re-scan
  setStorageItemSafely(SWAP_RESTORE_SCAN_KEY, JSON.stringify([...merged]), 'failed to persist swap-scan progress')
}

/** The candidate txs a scan would fetch: sent virtual txs with no stored swap
 * record and no previous authoritative answer. */
export const unscannedSwapCandidates = (txs: Tx[], existingIds: ReadonlySet<string>, scanned: ReadonlySet<string>) =>
  txs.filter(
    (tx) => tx.type === 'sent' && tx.redeemTxid && !existingIds.has(tx.redeemTxid) && !scanned.has(tx.redeemTxid),
  )

/** The cancel spend returns the deposit: a BTC offer gets its sats back (no
 * want-asset delivered), an asset offer gets the asset back. */
export function isCancelSpend(offer: Offer, spend: Tx): boolean {
  if (offer.wantAsset) {
    const wantId = offer.wantAsset.toString()
    return !spend.assets?.some((a) => a.assetId === wantId && a.amount > BigInt(0))
  }
  const offerId = offer.offerAsset!.toString()
  return Boolean(spend.assets?.some((a) => a.assetId === offerId && a.amount > BigInt(0)))
}

/**
 * Scan the given candidates for offer packets and rebuild the AssetSwap
 * records the store lost. Returns the rebuilt swaps plus the txids that got
 * an authoritative answer (fetched fine, vtxo lookup fine) — the caller
 * persists those so they are never fetched again. Quote-time facts are not
 * on chain: the caller backfills the fee rate from the pair's current market
 * card; the fiat snapshot is gone for good and its consumers fall back to
 * valuing the BTC leg at the current rate. TODO: once fee bps rides in its
 * own packet in the funding tx, decode it here next to the offer packet and
 * the caller's market-card approximation goes away.
 */
export async function restoreAssetSwaps(
  indexer: RestoreIndexer,
  txs: Tx[],
  existingIds: ReadonlySet<string>,
  scanned: ReadonlySet<string> = new Set(),
): Promise<{ restored: AssetSwap[]; scannedTxids: string[] }> {
  const candidates = unscannedSwapCandidates(txs, existingIds, scanned)
  if (candidates.length === 0) return { restored: [], scannedTxids: [] }

  // fetch the raw txs and pick out the ones carrying an offer packet, binding
  // by the PSBT's own unsigned txid rather than trusting response order; a
  // failed chunk is simply not marked scanned and retries on a later scan.
  // Chunks are independent requests, so fetch them all concurrently.
  const byTxid = new Map(candidates.map((tx) => [tx.redeemTxid, tx]))
  const chunks: string[][] = []
  for (let i = 0; i < candidates.length; i += TXS_PER_REQUEST) {
    chunks.push(candidates.slice(i, i + TXS_PER_REQUEST).map((tx) => tx.redeemTxid))
  }
  const chunkResults = await Promise.allSettled(
    chunks.map(async (txids) => ({ txids, psbts: (await indexer.getVirtualTxs(txids)).txs })),
  )

  const fetchedTxids: string[] = []
  const found: { fundingTx: Tx; offer: Offer; offerHex: string }[] = []
  for (const result of chunkResults) {
    if (result.status !== 'fulfilled') continue
    const { txids, psbts } = result.value
    fetchedTxids.push(...txids)
    for (const psbt of psbts) {
      try {
        const parsed = Transaction.fromPSBT(base64.decode(psbt), { allowUnknown: true, allowUnknownOutputs: true })
        const packet = Extension.fromTx(parsed).getPacketByType(OFFER_PACKET_TYPE)
        const fundingTx = packet && byTxid.get(parsed.id)
        if (!packet || !fundingTx) continue
        const payload = packet.serialize()
        found.push({ fundingTx, offer: decodeOffer(payload), offerHex: hex.encode(payload) })
      } catch {
        // no extension, foreign packet or malformed offer: not a swap funding
      }
    }
  }
  if (found.length === 0) return { restored: [], scannedTxids: fetchedTxids }

  // one vtxo lookup binds every funding deposit to its (possible) spend; if
  // it fails, nothing is marked scanned and the whole batch retries later
  const scripts = [...new Set(found.map((f) => hex.encode(f.offer.swapPkScript)))]
  const { vtxos } = await indexer.getVtxos({ scripts })

  // one O(txs) pass so each restored swap's spend lookup below is O(1)
  const txByAnyId = new Map<string, Tx>()
  for (const tx of txs) {
    for (const id of [tx.boardingTxid, tx.redeemTxid, tx.roundTxid]) {
      if (id) txByAnyId.set(id, tx)
    }
  }

  const restored: AssetSwap[] = []
  for (const { fundingTx, offer, offerHex } of found) {
    const swapPkScript = hex.encode(offer.swapPkScript)
    const vtxo = vtxos.find((v) => v.script === swapPkScript && v.txid === fundingTx.redeemTxid)
    if (!vtxo) continue // deposit unknown to the indexer: nothing to bind

    const fromAsset = offer.offerAsset?.toString() ?? 'btc'
    const toAsset = offer.wantAsset?.toString() ?? 'btc'
    const fromAmount = offer.offerAsset
      ? (vtxo.assets?.find((a) => a.assetId === fromAsset)?.amount ?? BigInt(0)).toString()
      : String(vtxo.value)

    const state = vtxo.virtualStatus.state
    const spentTxid = state === 'spent' ? (vtxo.arkTxId ?? vtxo.spentBy) : undefined
    const spendTx = spentTxid ? txByAnyId.get(spentTxid) : undefined
    // TODO(arkade-os/wallet#836): if state === 'spent' but spendTx hasn't synced
    // locally yet, status defaults to 'fulfilled' — a genuinely cancelled swap
    // could be permanently mislabeled, since a persisted swap is skipped by
    // future scans (see existingIds in unscannedSwapCandidates). No safer
    // default exists without local wallet-initiated-cancel tracking (the live
    // SSE monitor in assetSwaps.tsx has the same gap).
    let status: AssetSwapStatus = 'pending'
    if (state === 'swept') status = 'recoverable'
    else if (state === 'spent') status = spendTx && isCancelSpend(offer, spendTx) ? 'cancelled' : 'fulfilled'

    restored.push({
      id: fundingTx.redeemTxid,
      fromAsset,
      toAsset,
      fromAmount,
      toAmount: offer.wantAmount.toString(),
      // ponytail: empty address makes cancel fall back to the current server
      // key; store the funded address if server-key rotations become real
      swapAddress: '',
      swapPkScript,
      offerHex,
      fundingTxid: fundingTx.redeemTxid,
      spentTxid,
      status,
      createdAt: fundingTx.createdAt ? fundingTx.createdAt * 1000 : vtxo.createdAt.getTime(),
      ...(status === 'fulfilled' && spendTx?.createdAt ? { completedAt: spendTx.createdAt * 1000 } : {}),
    })
  }
  return { restored, scannedTxids: fetchedTxids }
}
