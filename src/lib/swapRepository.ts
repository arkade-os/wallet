/**
 * The wallet's swap record store.
 *
 * Storage moved out of localStorage into `@arkade-os/swap`'s IndexedDB
 * repository, which also backs the restore-scan cursor and the markets cache —
 * one seam instead of three ad hoc keys.
 *
 * A fourth store, `rfqSwaps`, arrived with `DB_VERSION` 2 and is written by
 * `RfqSwapManager` rather than by anything here: `LnReceiveProvider` wires this
 * object in as the manager's `repository`, and the manager composes every
 * record itself. So this file enumerates four consumers, only three of which
 * call it directly.
 *
 * That version bump is one-way. A browser at 2 cannot be served a bundle
 * pinning an older `@arkade-os/swap`: the open fails `VersionError` across the
 * WHOLE database, asset swaps and markets cache included. Rolling back this
 * release means rolling back the data, not just the bundle.
 */
import { promisifyRequest } from '@arkade-os/sdk'
import {
  IndexedDbAssetSwapRepository,
  type AssetSwap,
  type MarketsCacheEntry,
  type RfqSwapRecord,
} from '@arkade-os/swap'

// The package's store names and markets-cache key, restated because it does not
// export them. `swapRepository.test.ts` round-trips the package's own writes
// through the reads below, so a rename upstream fails there rather than in
// Safari.
const STORE_SWAPS = 'swaps'
const STORE_RFQ_SWAPS = 'rfqSwaps'
const STORE_SCANNED = 'scannedTxids'
const STORE_MARKETS = 'markets'
const marketsCacheKey = (network: string, registry: string) => `arkade-intents-markets-${network}-${registry}`

/**
 * `IndexedDbAssetSwapRepository` with reads that work in Safari.
 *
 * WebKit deactivates an IndexedDB transaction the moment the script that
 * created it returns — BEFORE the microtask queue drains. Chrome and Firefox
 * keep it active to the end of the microtask checkpoint, which is what the spec
 * asks for. The package reads through an async `readStore()` and issues the
 * request only after `await`ing it, so in Safari every read throws
 * `TransactionInactiveError`: `getAssetSwaps` swallows that into an empty list,
 * the activity resolver's `prepare()` fails and swaps render as bare sent and
 * received rows, and `addAssetSwap` (read, then write) rejects AFTER the
 * funding tx was sent. `RfqSwapManager.saveRecord` reads first too, so
 * Lightning sends lose their records the same way. Writes are unaffected —
 * `write()` issues its requests synchronously.
 *
 * Each read here creates the transaction and issues its request in one tick.
 * Drop this subclass once the package does the same.
 */
export class SafariSafeAssetSwapRepository extends IndexedDbAssetSwapRepository {
  private async readInOneTick<T>(store: string, request: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    // `ensureDb` is the package's private connection getter: the only way to
    // the IDBDatabase without opening a second connection to the same stores.
    const ensureDb: unknown = this['ensureDb']
    if (typeof ensureDb !== 'function') throw new Error('IndexedDbAssetSwapRepository.ensureDb is gone')
    const db = (await ensureDb.call(this)) as IDBDatabase
    return promisifyRequest(request(db.transaction([store], 'readonly').objectStore(store)))
  }

  override getAllSwaps(): Promise<AssetSwap[]> {
    return this.readInOneTick(STORE_SWAPS, (store) => store.getAll() as IDBRequest<AssetSwap[]>)
  }

  override getRfqSwap(rfqId: string): Promise<RfqSwapRecord | undefined> {
    return this.readInOneTick(STORE_RFQ_SWAPS, (store) => store.get(rfqId) as IDBRequest<RfqSwapRecord | undefined>)
  }

  override getAllRfqSwaps(): Promise<RfqSwapRecord[]> {
    return this.readInOneTick(STORE_RFQ_SWAPS, (store) => store.getAll() as IDBRequest<RfqSwapRecord[]>)
  }

  override async getScannedTxids(): Promise<Set<string>> {
    const keys = await this.readInOneTick(STORE_SCANNED, (store) => store.getAllKeys() as IDBRequest<string[]>)
    return new Set(keys)
  }

  override getCachedMarkets(network: string, registry: string): Promise<MarketsCacheEntry | undefined> {
    return this.readInOneTick(
      STORE_MARKETS,
      (store) => store.get(marketsCacheKey(network, registry)) as IDBRequest<MarketsCacheEntry | undefined>,
    )
  }
}

/** Shared per tab: the repository opens its database lazily on first use, and
 * a second instance would open a second connection to the same stores. */
export const assetSwapRepository: IndexedDbAssetSwapRepository = new SafariSafeAssetSwapRepository()

/** Display facts frozen at quote time — only what the activity UI reads.
 * Every field is optional: a restore can only backfill what is recoverable
 * (feeBps from the market card), and every consumer falls back per-field.
 * TODO: once fee bps rides in a packet inside the funding tx, feeBps stops
 * being a quote-time fact — read it from the tx (creation and restore alike)
 * and drop the field here. */
export interface AssetSwapQuoteSnapshot {
  fromTicker?: string
  fromDecimals?: number
  toTicker?: string
  toDecimals?: number
  feeBps?: number
  fiatCurrency?: string
  fromFiatAmount?: number
}

/** The package's record plus the quote snapshot it deliberately does not own.
 * The repository stores records whole, so `quote` survives package-side writes
 * (`cancelOffer`, the watcher) untouched. */
export type WalletAssetSwap = AssetSwap & { quote?: AssetSwapQuoteSnapshot }
