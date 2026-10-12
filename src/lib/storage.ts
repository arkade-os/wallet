import { AssetDetails } from '@arkade-os/sdk'
import { Config, LnSendActivity, Wallet } from '../lib/types'
import { consoleError } from './logs'

// clear localStorage but persist config (with asset data reset)
export async function clearStorage(): Promise<void> {
  const config = readConfigFromStorage()
  localStorage.clear()
  if (config) {
    config.importedAssets = []
    config.apps.assets.enabled = false
    saveConfigToStorage(config)
  }
}

export const getStorageItem = <T>(key: string, fallback: T, parser: (val: string) => T): T => {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? parser(item) : fallback
  } catch {
    return fallback
  }
}

const setStorageItem = (key: string, value: string): void => {
  localStorage.setItem(key, value)
}

/** For non-critical persistence where a failed write (quota, private mode)
 * should degrade silently rather than fail the caller. */
export const setStorageItemSafely = (key: string, value: string, context: string): void => {
  try {
    setStorageItem(key, value)
  } catch (err) {
    consoleError(err, context)
  }
}

export const saveConfigToStorage = (config: Config): void => {
  setStorageItem('config', JSON.stringify(config))
}

export const readConfigFromStorage = (): Config | undefined => {
  return getStorageItem('config', undefined, (val) => JSON.parse(val))
}

export const saveWalletToStorage = (wallet: Wallet): void => {
  setStorageItem('wallet', JSON.stringify(wallet))
}

export const readWalletFromStorage = (): Wallet | undefined => {
  return getStorageItem('wallet', undefined, (val) => JSON.parse(val))
}

export type TransactionActivityMetadata = {
  assetAction?: 'issued' | 'reissued' | 'burned'
  destination?: string
  /** When a unilaterally exited VTXO's exit transaction confirmed onchain, in
   * unix seconds. Shares its entry with the receive row that was created by the
   * same txid — harmless, since the graft in `activityHistory` reads none of
   * the other fields from here. See `lib/exitHistory`. */
  exitedAt?: number
  lnSend?: LnSendActivity
  networkFee?: number
  savedAt: number
}

const TRANSACTION_ACTIVITY_METADATA_KEY = 'transactionActivityMetadata'
const TRANSACTION_ACTIVITY_METADATA_LIMIT = 250

export const saveTransactionActivityMetadata = (
  txid: string,
  metadata: Omit<TransactionActivityMetadata, 'savedAt'>,
): void => {
  if (!txid) return
  const stored = getStorageItem<Record<string, TransactionActivityMetadata>>(
    TRANSACTION_ACTIVITY_METADATA_KEY,
    {},
    (value) => JSON.parse(value),
  )
  stored[txid] = { ...stored[txid], ...metadata, savedAt: Date.now() }
  const entries = Object.entries(stored)
    .sort(([, a], [, b]) => a.savedAt - b.savedAt)
    .slice(-TRANSACTION_ACTIVITY_METADATA_LIMIT)
  setStorageItemSafely(
    TRANSACTION_ACTIVITY_METADATA_KEY,
    JSON.stringify(Object.fromEntries(entries)),
    'Failed to save transaction activity metadata',
  )
}

export const readAllTransactionActivityMetadata = (): Record<string, TransactionActivityMetadata> =>
  getStorageItem<Record<string, TransactionActivityMetadata>>(TRANSACTION_ACTIVITY_METADATA_KEY, {}, (value) =>
    JSON.parse(value),
  )

// local storage caches the asset details for 24 hours
export const ASSET_METADATA_TTL_MS = 24 * 60 * 60 * 1000

export type CachedAssetDetails = AssetDetails & { cachedAt: number; hasIcon?: boolean }

/**
 * Persist the asset metadata cache, dropping stale entries.
 *
 * `keep` names the assets the UI can still be asked to render — every asset a
 * swap record or history row mentions, not just the ones the wallet currently
 * holds. Those are exempt from the TTL eviction: their metadata is not
 * refreshed by the owned-balance prefetch, so evicting one deletes the only
 * name and icon the row has and it never comes back. A swap out of the last of
 * an asset used to go unnamed exactly 24h later for precisely this reason.
 * Unreferenced entries still expire, which is what keeps localStorage bounded.
 */
export const saveAssetMetadataToStorage = (
  cache: Map<string, CachedAssetDetails>,
  keep: ReadonlySet<string> = new Set(),
): void => {
  const now = Date.now()
  const obj: Record<string, CachedAssetDetails> = {}
  cache.forEach((v, k) => {
    // evict expired entries to prevent unbounded localStorage growth
    if (now - v.cachedAt >= ASSET_METADATA_TTL_MS && !keep.has(k)) return
    obj[k] = v
  })
  setStorageItem(
    'assetMetadataCache',
    JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  )
}

export const readAssetMetadataFromStorage = (): Map<string, CachedAssetDetails> | undefined => {
  return getStorageItem('assetMetadataCache', undefined, (val) => {
    const obj = JSON.parse(val) as Record<string, CachedAssetDetails>
    Object.values(obj).forEach((x) => (x.supply = BigInt(x.supply)))
    return new Map(Object.entries(obj))
  })
}
