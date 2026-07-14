import { beforeEach, describe, expect, it } from 'vitest'
import { addAssetSwap, getAssetSwaps, updateAssetSwap, AssetSwap } from '../../../lib/swap/store'

const swap = (id: string): AssetSwap => ({
  id,
  fromAsset: 'btc',
  toAsset: 'f1'.repeat(34),
  fromAmount: '10000',
  toAmount: '992',
  swapAddress: 'tark1q...',
  swapPkScript: '5120' + 'ab'.repeat(32),
  offerHex: '0100',
  fundingTxid: id,
  status: 'pending',
  createdAt: 1,
})

describe('asset swap store', () => {
  beforeEach(() => localStorage.clear())

  it('adds swaps newest-first and dedups by id', () => {
    addAssetSwap(swap('a'))
    addAssetSwap(swap('b'))
    addAssetSwap(swap('a'))
    expect(getAssetSwaps().map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('updates a swap by id', () => {
    addAssetSwap(swap('a'))
    updateAssetSwap('a', { status: 'fulfilled', spentTxid: 'txid' })
    expect(getAssetSwaps()[0]).toMatchObject({ id: 'a', status: 'fulfilled', spentTxid: 'txid' })
  })

  it('returns [] on empty or corrupt storage', () => {
    expect(getAssetSwaps()).toEqual([])
    localStorage.setItem('assetSwaps', '{not json')
    expect(getAssetSwaps()).toEqual([])
  })
})
