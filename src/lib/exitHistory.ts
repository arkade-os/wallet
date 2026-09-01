import { Asset, ESPLORA_URL, EsploraProvider, NetworkName } from '@arkade-os/sdk'
import { getRestApiExplorerURL } from './explorers'
import { consoleError } from './logs'
import { readAllTransactionActivityMetadata, saveTransactionActivityMetadata } from './storage'
import type { Vtxo } from './types'

/**
 * One unilaterally exited VTXO, with the time its exit landed onchain.
 *
 * The wallet's own view of an exit, assembled here because no single source has
 * it: the coin comes from the VTXO repo, the timestamp from the chain. Carrying
 * the resolved `exitedAt` on the record rather than leaving it in the metadata
 * store is what lets an unconfirmed exit still produce a row — that case is
 * deliberately not persisted.
 */
export interface ExitRecord {
  txid: string
  vout: number
  value: number
  /** Unix seconds, matching `Tx.createdAt`. */
  exitedAt: number
}

/**
 * Esplora for `network`, or undefined when we cannot name one.
 *
 * `explorers.ts` has no `api` entry for mainnet, and `EsploraProvider`'s own
 * constructor default is the mainnet URL — which would be right on mainnet by
 * coincidence and wrong on every other network. So the SDK's per-network table
 * is the fallback, never the constructor's.
 */
const exitProvider = (network?: string): EsploraProvider | undefined => {
  const name = network as NetworkName | undefined
  const url = name ? (getRestApiExplorerURL(name) ?? ESPLORA_URL[name]) : undefined
  return url ? new EsploraProvider(url) : undefined
}

/**
 * When the coin was received. The fallback for an exit we cannot date, and
 * wrong on purpose rather than absent: it keeps the row in the list.
 *
 * `normalizeVtxo` coerces `expiresAt` but leaves `createdAt` alone, and the
 * SDK's own note at that coercion says why it matters — a store that round-trips
 * through JSON hands back an ISO string that typechecks as `Date` and returns
 * NaN from `getTime()`. A NaN date sorts nowhere, so it becomes 0, which
 * `sortLocalTxs` floats to the top where an undated row belongs.
 */
const receivedAt = (vtxo: Vtxo): number => {
  const ms = new Date(vtxo.createdAt).getTime()
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000)
}

/** The exit tx's confirmation time in unix seconds, or undefined while it is
 * unconfirmed or the lookup fails. Never throws: the caller runs inside the
 * reload whose catch blocks first load. */
const confirmedAt = async (provider: EsploraProvider, txid: string): Promise<number | undefined> => {
  try {
    const status = await provider.getTxStatus(txid)
    // `blockTime` is already unix seconds, which is what `Tx.createdAt` wants.
    return status.confirmed ? status.blockTime : undefined
  } catch (err) {
    consoleError(err, `error resolving exit time for ${txid}`)
    return undefined
  }
}

/**
 * Date each exited coin by its exit, not by its receive.
 *
 * A VTXO's `createdAt` is when the money arrived, so ordering an exit row by it
 * puts the exit next to the receive and reads as nonsense. Once unrolled,
 * `vtxo.txid` is an onchain txid — `prepareUnrollTransaction` relies on exactly
 * that — so the chain can answer when the exit happened.
 *
 * Resolved times are persisted, so this is one lookup per exit transaction for
 * the life of the wallet. Two things reopen it, both self-healing: an
 * unconfirmed exit is deliberately not persisted and is retried on the next
 * reload, and the metadata store's LRU cap can evict an old entry.
 *
 * Never rejects. It runs inside `reloadWallet`'s try block, whose catch blocks
 * the first load, so a slow explorer must cost a row's date and nothing more.
 */
export const resolveExits = async (vtxos: Vtxo[], network?: string): Promise<ExitRecord[]> => {
  if (vtxos.length === 0) return []
  const stored = readAllTransactionActivityMetadata()
  const provider = exitProvider(network)
  // Keyed by TRANSACTION, not by coin: `exitedAt` is a property of the exit tx,
  // and one exit can carry several of the wallet's outputs.
  const resolved = new Map<string, number>()
  const attempted = new Set<string>()
  const records: ExitRecord[] = []
  for (const vtxo of vtxos) {
    let exitedAt = resolved.get(vtxo.txid) ?? stored[vtxo.txid]?.exitedAt
    if (exitedAt === undefined && provider && !attempted.has(vtxo.txid)) {
      attempted.add(vtxo.txid)
      const confirmed = await confirmedAt(provider, vtxo.txid)
      if (confirmed !== undefined) {
        saveTransactionActivityMetadata(vtxo.txid, { exitedAt: confirmed })
        resolved.set(vtxo.txid, confirmed)
        exitedAt = confirmed
      }
    }
    records.push({
      txid: vtxo.txid,
      vout: vtxo.vout,
      value: vtxo.value,
      exitedAt: exitedAt ?? receivedAt(vtxo),
    })
  }
  return records
}

/**
 * `assets` minus what rides on the exited coins.
 *
 * The satoshi half of this needs no help — `getBalance` reports `unrolled` as
 * its own bucket. Assets have no such split: `computeOffchainBalance` adds every
 * non-terminally-spent VTXO's assets to the owned map *before* it branches on
 * `isUnrolled`, so `balance.assets` counts assets on exited coins while
 * `availableAssets` does not. We hold the exited set, so the subtraction is
 * exact rather than inferred.
 *
 * Clamped at zero and dropped when empty. The two figures come from one
 * snapshot, but a balance read racing a repo sync is not worth a negative.
 */
export const subtractExitedAssets = (assets: Asset[], exited: Vtxo[]): Asset[] => {
  if (exited.length === 0) return assets
  const owed = new Map<string, bigint>()
  for (const vtxo of exited) {
    for (const asset of vtxo.assets ?? []) {
      owed.set(asset.assetId, (owed.get(asset.assetId) ?? BigInt(0)) + asset.amount)
    }
  }
  if (owed.size === 0) return assets
  const remaining: Asset[] = []
  for (const asset of assets) {
    const amount = asset.amount - (owed.get(asset.assetId) ?? BigInt(0))
    if (amount > BigInt(0)) remaining.push({ ...asset, amount })
  }
  return remaining
}
