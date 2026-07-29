import { AssetDetails } from '@arkade-os/sdk'
import { Config, Wallet } from '../lib/types'
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
 * should degrade gracefully rather than throw at the caller. Returns whether
 * the write landed, for callers that must not report a phantom success. */
export const setStorageItemSafely = (key: string, value: string, context: string): boolean => {
  try {
    setStorageItem(key, value)
    return true
  } catch (err) {
    consoleError(err, context)
    return false
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

export const readTransactionActivityMetadata = (
  txids: (string | undefined)[],
): TransactionActivityMetadata | undefined => {
  const stored = getStorageItem<Record<string, TransactionActivityMetadata>>(
    TRANSACTION_ACTIVITY_METADATA_KEY,
    {},
    (value) => JSON.parse(value),
  )
  return txids
    .filter(Boolean)
    .map((txid) => stored[txid!])
    .find(Boolean)
}

// local storage caches the asset details for 24 hours
export const ASSET_METADATA_TTL_MS = 24 * 60 * 60 * 1000

export type CachedAssetDetails = AssetDetails & { cachedAt: number; hasIcon?: boolean }

export const saveAssetMetadataToStorage = (cache: Map<string, CachedAssetDetails>): void => {
  const now = Date.now()
  const obj: Record<string, CachedAssetDetails> = {}
  cache.forEach((v, k) => {
    // evict expired entries to prevent unbounded localStorage growth
    if (now - v.cachedAt >= ASSET_METADATA_TTL_MS) return
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
