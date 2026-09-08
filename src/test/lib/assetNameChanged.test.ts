import { describe, expect, it } from 'vitest'
import { assetNameChanged } from '../../lib/assets'

// Gates the repaint in `WalletProvider`: rows name assets through
// `assetMetadataCache`, which is a ref, so `setCacheEntry` bumps a version the
// `txs` memo depends on. Bumping unconditionally would re-derive the whole
// activity list on every TTL refresh, and `setCacheEntry` has a dozen callers,
// several in loops.
describe('assetNameChanged', () => {
  it('reports a change when the ticker changes', () => {
    expect(assetNameChanged({ ticker: 'ABC', decimals: 2 }, { ticker: 'DEPIX', decimals: 2 })).toBe(true)
  })

  it('reports a change when the decimals change', () => {
    expect(assetNameChanged({ ticker: 'DEPIX', decimals: 2 }, { ticker: 'DEPIX', decimals: 8 })).toBe(true)
  })

  it('reports a change when metadata arrives for the first time', () => {
    // the restored-wallet case: an empty cache, then the prefetch answers
    expect(assetNameChanged(undefined, { ticker: 'DEPIX', decimals: 2 })).toBe(true)
  })

  it('reports no change when a TTL refresh rewrites the same name', () => {
    expect(assetNameChanged({ ticker: 'DEPIX', decimals: 2 }, { ticker: 'DEPIX', decimals: 2 })).toBe(false)
  })

  it('reports no change when only fields the display never reads differ', () => {
    // `assetDisplay` returns the whole metadata object but the row reads only
    // ticker and decimals, so an icon or name edit must not re-derive the list
    const previous = { ticker: 'DEPIX', decimals: 2, name: 'DePix', icon: 'a' }
    const next = { ticker: 'DEPIX', decimals: 2, name: 'DePix Real', icon: 'b' }
    expect(assetNameChanged(previous, next)).toBe(false)
  })

  it('reports no change between two absent entries', () => {
    expect(assetNameChanged(undefined, undefined)).toBe(false)
  })
})
