import { AssetDetails } from '@arkade-os/sdk'
import { Config, Wallet } from '../lib/types'

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

// local storage caches the asset details for 24 hours
export const ASSET_METADATA_TTL_MS = 24 * 60 * 60 * 1000

export type CachedAssetDetails = AssetDetails & { cachedAt: number; hasIcon?: boolean }

// AssetDetails.supply is bigint; vanilla JSON.stringify throws on bigint and
// JSON.parse returns string. Tag/untag bigints to round-trip them safely.
const bigintReplacer = (_key: string, value: unknown): unknown =>
  typeof value === 'bigint' ? { __bigint: value.toString() } : value

const bigintReviver = (_key: string, value: unknown): unknown => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    if (typeof obj.__bigint === 'string' && Object.keys(obj).length === 1) {
      return BigInt(obj.__bigint)
    }
  }
  return value
}

export const saveAssetMetadataToStorage = (cache: Map<string, CachedAssetDetails>): void => {
  const now = Date.now()
  const obj: Record<string, CachedAssetDetails> = {}
  cache.forEach((v, k) => {
    // evict expired entries to prevent unbounded localStorage growth
    if (now - v.cachedAt >= ASSET_METADATA_TTL_MS) return
    obj[k] = v
  })
  setStorageItem('assetMetadataCache', JSON.stringify(obj, bigintReplacer))
}

export const readAssetMetadataFromStorage = (): Map<string, CachedAssetDetails> | undefined => {
  return getStorageItem('assetMetadataCache', undefined, (val) => {
    const obj = JSON.parse(val, bigintReviver) as Record<string, CachedAssetDetails>
    return new Map(Object.entries(obj))
  })
}
