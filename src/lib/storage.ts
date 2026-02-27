import { AssetDetails } from '@arkade-os/sdk'
import { Config, Wallet } from '../lib/types'
import { APPROVED_ICONS_KEY } from './assetIconApproval'

// clear localStorage but persist config
export async function clearStorage(): Promise<void> {
  const config = readConfigFromStorage()
  const assetMeta = readAssetMetadataFromStorage()
  const approvedIcons = localStorage.getItem(APPROVED_ICONS_KEY)
  localStorage.clear()
  if (config) saveConfigToStorage(config)
  if (assetMeta) saveAssetMetadataToStorage(assetMeta)
  if (approvedIcons) localStorage.setItem(APPROVED_ICONS_KEY, approvedIcons)
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
    obj[k] = v
  })
  setStorageItem('assetMetadataCache', JSON.stringify(obj))
}

export const readAssetMetadataFromStorage = (): Map<string, CachedAssetDetails> | undefined => {
  return getStorageItem('assetMetadataCache', undefined, (val) => {
    const obj = JSON.parse(val) as Record<string, CachedAssetDetails>
    return new Map(Object.entries(obj))
  })
}
