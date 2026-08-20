import { AssetDetails } from '@arkade-os/sdk'
import { Config, LnSendActivity, Wallet } from '../lib/types'
import { consoleError } from './logs'
import { LocalCardInput, validateCard } from '@arkade-os/solver-discovery'

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

export const saveSolverCardsToStorage = (cards: LocalCardInput[]): void => {
  const data = Array.isArray(cards) ? cards.filter(isLocalCardInput) : []
  setStorageItem('solverCards', JSON.stringify(data))
}

export const readSolverCardsFromStorage = (): LocalCardInput[] => {
  const items = getStorageItem('solverCards', [], (val) => JSON.parse(val))
  return Array.isArray(items) ? items.filter(isLocalCardInput) : []
}

const isLocalCardInput = (obj: unknown): obj is LocalCardInput => {
  const input = obj as LocalCardInput | null
  return Boolean(
    input &&
      typeof input.network === 'string' &&
      typeof input.label === 'string' &&
      typeof input.card === 'object' &&
      validateCard(input.card).ok,
  )
}
