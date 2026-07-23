import { beforeEach, describe, expect, it } from 'vitest'
import { addAssetSwap, getAssetSwaps, updateAssetSwap, AssetSwap } from '../../../lib/swap/store'
import { mergeAssetSwapActivity } from '../../../lib/swapDisplay'
import type { Tx } from '../../../lib/types'
import { MUTINYNET_USDT_ASSET_ID } from '../../../lib/accountAssets'

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

  it('returns swaps newest-first even when a restore scan inserted them out of order', () => {
    // the restore scan rebuilds records in tx-scan order, so an older
    // completed swap can be added after a newer pending one — the prepend
    // alone would then bury the pending swap (and its Cancel button) at the
    // bottom of the Your swaps list
    addAssetSwap({ ...swap('newer-pending'), createdAt: 2_000 })
    addAssetSwap({ ...swap('older-completed'), status: 'fulfilled', createdAt: 1_000 })
    expect(getAssetSwaps().map((s) => s.id)).toEqual(['newer-pending', 'older-completed'])
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

  it('collapses linked funding and fill rows into one swap activity with the actual fill and quote metadata', () => {
    const fulfilled = {
      ...swap('funding-txid'),
      status: 'fulfilled' as const,
      createdAt: 2_000,
      spentTxid: 'fill-txid',
      completedAt: 2_000,
      quote: {
        fromTicker: 'USD',
        fromDecimals: 2,
        toTicker: 'BRL',
        toDecimals: 2,
        feeBps: 30,
        fiatCurrency: 'USD',
        fromFiatAmount: 100,
      },
    }
    const tx = (redeemTxid: string, assets?: Tx['assets']): Tx => ({
      amount: 330,
      assets,
      boardingTxid: '',
      createdAt: 1,
      explorable: redeemTxid,
      preconfirmed: false,
      redeemTxid,
      roundTxid: '',
      settled: true,
      type: 'received',
    })
    const fillAmount = BigInt(54_321)
    const unrelated = tx('unrelated-txid')

    const activity = mergeAssetSwapActivity(
      [tx('funding-txid'), tx('fill-txid', [{ assetId: fulfilled.toAsset, amount: fillAmount }]), unrelated],
      [fulfilled],
    )

    expect(activity).toHaveLength(2)
    expect(activity[0]).toMatchObject({
      type: 'swap',
      redeemTxid: 'fill-txid',
      assetSwap: {
        fromTicker: 'USD',
        toTicker: 'BRL',
        toAmount: fillAmount,
        feeBps: 30,
        fiatAmount: 100,
        status: 'completed',
        fundingTxid: 'funding-txid',
        fillTxid: 'fill-txid',
      },
    })
    expect(activity[1]).toBe(unrelated)
  })

  it('labels older Mutinynet swap records from their designated asset IDs', () => {
    const legacySwap = { ...swap('funding-txid'), toAsset: MUTINYNET_USDT_ASSET_ID }
    const [activity] = mergeAssetSwapActivity([], [legacySwap], 'mutinynet')

    expect(activity.assetSwap).toMatchObject({ fromTicker: 'sats', toTicker: 'USD' })
  })

  it('prefers the currency designation over the asset metadata ticker', () => {
    const restoredSwap = { ...swap('funding-txid'), toAsset: MUTINYNET_USDT_ASSET_ID }
    const [activity] = mergeAssetSwapActivity([], [restoredSwap], 'mutinynet', () => ({ ticker: 'USDT', decimals: 2 }))

    expect(activity.assetSwap).toMatchObject({ fromTicker: 'sats', toTicker: 'USD', toDecimals: 2 })
  })
})
