import { AssetDetails } from '@arkade-os/sdk'
import { Config, Wallet } from '../lib/types'
import { LAST_PASSKEY_STORAGE_KEY } from './storageKeys'

// clear localStorage but persist config (with asset data reset) and the
// last-used passkey id — a plain identifier (no secret) that lets "Log in
// with Passkey" target the right credential after a reset instead of showing
// the browser's full passkey picker
export async function clearStorage(): Promise<void> {
  const config = readConfigFromStorage()
  const lastPasskeyId = localStorage.getItem(LAST_PASSKEY_STORAGE_KEY)
  localStorage.clear()
  if (config) {
    config.importedAssets = []
    config.apps.assets.enabled = false
    saveConfigToStorage(config)
  }
  if (lastPasskeyId) localStorage.setItem(LAST_PASSKEY_STORAGE_KEY, lastPasskeyId)
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
