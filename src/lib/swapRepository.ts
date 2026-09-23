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
import { IndexedDbAssetSwapRepository, type AssetSwap } from '@arkade-os/swap'

/** Shared per tab: the repository opens its database lazily on first use, and
 * a second instance would open a second connection to the same stores. */
export const assetSwapRepository = new IndexedDbAssetSwapRepository()

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
