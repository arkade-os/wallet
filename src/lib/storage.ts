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
export type CachedAssetDetails = AssetDetails & { cachedAt: number; hasIcon?: boolean }

export const saveAssetMetadataToStorage = (cache: Map<string, CachedAssetDetails>): void => {
  const obj: Record<string, CachedAssetDetails> = {}
  cache.forEach((v, k) => {
    // strip icon from persisted data — it can be large (base64) and is re-fetched on demand
    const { metadata, ...rest } = v
    const { icon: _, ...metaWithoutIcon } = metadata ?? {}
    obj[k] = { ...rest, metadata: metaWithoutIcon }
  })
  setStorageItem('assetMetadataCache', JSON.stringify(obj))
}

export const readAssetMetadataFromStorage = (): Map<string, CachedAssetDetails> | undefined => {
  return getStorageItem('assetMetadataCache', undefined, (val) => {
    const obj = JSON.parse(val) as Record<string, CachedAssetDetails>
    return new Map(Object.entries(obj))
  })
}
