import { describe, expect, it } from 'vitest'
import { referencedAssetIds } from '../../lib/assets'
import { DEPIX_ID, USDT_ID } from './swapFixtures'

describe('referencedAssetIds', () => {
  it('names an asset the wallet no longer holds but still has rows for', () => {
    // The regression this exists to stop: swap the last DePix into BTC, and the
    // owned-balance prefetch stops covering it, so the swap row falls back to a
    // truncated asset id once the cached entry expires.
    const ids = referencedAssetIds({ owned: [], swaps: ['btc', DEPIX_ID] })

    expect([...ids]).toEqual([DEPIX_ID])
  })

  it('unions owned balances, history rows and swap legs without duplicates', () => {
    const ids = referencedAssetIds({
      owned: [{ assetId: USDT_ID }],
      rows: [USDT_ID, DEPIX_ID],
      swaps: [DEPIX_ID, 'btc'],
    })

    expect(ids).toEqual(new Set([USDT_ID, DEPIX_ID]))
  })

  it('excludes the btc sentinel and empty ids', () => {
    // 'btc' is bitcoin itself: no asset metadata to fetch, and every surface
    // names it from the unit setting instead.
    expect(referencedAssetIds({ owned: [{ assetId: 'btc' }], rows: [''], swaps: ['btc'] }).size).toBe(0)
  })

  it('tolerates every source being absent', () => {
    expect(referencedAssetIds({}).size).toBe(0)
  })
})
