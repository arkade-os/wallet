import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveAssetMetadataToStorage,
  readAssetMetadataFromStorage,
  CachedAssetDetails,
  clearStorage,
} from '../../lib/storage'

describe('asset metadata storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const makeCached = (assetId: string, name: string, cachedAt = Date.now()): CachedAssetDetails => ({
    assetId,
    supply: 1000,
    metadata: { name, ticker: 'TKN', decimals: 8 },
    cachedAt,
  })

  it('should save and read cache roundtrip', () => {
    const cache = new Map<string, CachedAssetDetails>()
    cache.set('asset1', makeCached('asset1', 'Token A'))
    cache.set('asset2', makeCached('asset2', 'Token B'))

    saveAssetMetadataToStorage(cache)
    const loaded = readAssetMetadataFromStorage()

    expect(loaded).toBeDefined()
    expect(loaded!.size).toBe(2)
    expect(loaded!.get('asset1')?.metadata?.name).toBe('Token A')
    expect(loaded!.get('asset2')?.metadata?.name).toBe('Token B')
    expect(loaded!.get('asset1')?.cachedAt).toBeTypeOf('number')
  })

  it('should return undefined when nothing stored', () => {
    const loaded = readAssetMetadataFromStorage()
    expect(loaded).toBeUndefined()
  })

  it('should return undefined for corrupt data', () => {
    localStorage.setItem('assetMetadataCache', 'not json')
    const loaded = readAssetMetadataFromStorage()
    expect(loaded).toBeUndefined()
  })

  it('should overwrite on re-save', () => {
    const cache1 = new Map<string, CachedAssetDetails>()
    cache1.set('a', makeCached('a', 'First'))
    saveAssetMetadataToStorage(cache1)

    const cache2 = new Map<string, CachedAssetDetails>()
    cache2.set('b', makeCached('b', 'Second'))
    saveAssetMetadataToStorage(cache2)

    const loaded = readAssetMetadataFromStorage()
    expect(loaded!.size).toBe(1)
    expect(loaded!.has('a')).toBe(false)
    expect(loaded!.get('b')?.metadata?.name).toBe('Second')
  })
})

describe('clearStorage preserves approvedAssetIcons', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should preserve approvedAssetIcons across clearStorage', async () => {
    localStorage.setItem('approvedAssetIcons', JSON.stringify(['asset1', 'asset2']))
    localStorage.setItem('someOtherKey', 'value')

    await clearStorage()

    const approved = localStorage.getItem('approvedAssetIcons')
    expect(approved).toBe(JSON.stringify(['asset1', 'asset2']))
    expect(localStorage.getItem('someOtherKey')).toBeNull()
  })
})
