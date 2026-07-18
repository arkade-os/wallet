import { describe, expect, it } from 'vitest'
import { base64, hex } from '@scure/base'
import { asset, Extension, Transaction, UnknownPacket } from '@arkade-os/sdk'
import { encodeOffer, Offer, OFFER_PACKET_TYPE } from '../../../lib/swap/offer'
import { restoreAssetSwaps } from '../../../lib/swap/restore'
import { swapPriceRateLabel } from '../../../lib/swapDisplay'
import type { Tx } from '../../../lib/types'

const ASSET_ID = 'f1'.repeat(34)
const SWAP_PK_SCRIPT = '5120' + 'ab'.repeat(32)

const makeOffer = (side: 'btc-to-asset' | 'asset-to-btc', wantAmount: bigint): Offer => ({
  swapPkScript: hex.decode(SWAP_PK_SCRIPT),
  wantAmount,
  ...(side === 'btc-to-asset'
    ? { wantAsset: asset.AssetId.fromString(ASSET_ID) }
    : { offerAsset: asset.AssetId.fromString(ASSET_ID) }),
  makerPkScript: hex.decode('5120' + 'cd'.repeat(32)),
  makerPublicKey: hex.decode('ef'.repeat(32)),
  emulatorPubkey: hex.decode('12'.repeat(32)),
})

/** A funding PSBT: covenant output + the offer packet in the extension. */
const fundingPsbt = (payload: Uint8Array): { psbt: string; txid: string } => {
  const tx = new Transaction({ allowUnknownOutputs: true })
  tx.addInput({ txid: new Uint8Array(32), index: 0 })
  tx.addOutput({ script: hex.decode(SWAP_PK_SCRIPT), amount: BigInt(10_000) })
  const ext = Extension.create([new UnknownPacket(OFFER_PACKET_TYPE, payload)]).txOut()
  tx.addOutput({ script: ext.script, amount: ext.amount })
  return { psbt: base64.encode(tx.toPSBT()), txid: tx.id }
}

const walletTx = (redeemTxid: string, type: string, overrides: Partial<Tx> = {}): Tx => ({
  amount: 330,
  boardingTxid: '',
  createdAt: 1_700_000_000,
  explorable: redeemTxid,
  preconfirmed: false,
  redeemTxid,
  roundTxid: '',
  settled: true,
  type,
  ...overrides,
})

const makeIndexer = (psbts: string[], vtxos: any[]) => {
  const calls: string[][] = []
  return {
    calls,
    getVirtualTxs: async (txids: string[]) => {
      calls.push(txids)
      return { txs: psbts }
    },
    getVtxos: async () => ({ vtxos }),
  } as any
}

const spentVtxo = (txid: string, spentBy: string) => ({
  txid,
  script: SWAP_PK_SCRIPT,
  value: 10_000,
  createdAt: new Date(1_700_000_000_000),
  virtualStatus: { state: 'spent' },
  arkTxId: spentBy,
})

describe('restoreAssetSwaps', () => {
  it('rebuilds a fulfilled BTC->asset swap from the funding tx offer packet and its spend', async () => {
    const offer = makeOffer('btc-to-asset', BigInt(992))
    const payload = encodeOffer(offer)
    const { psbt, txid } = fundingPsbt(payload)
    const txs = [
      walletTx(txid, 'sent'),
      walletTx('fill-txid', 'received', {
        createdAt: 1_700_000_100,
        assets: [{ assetId: ASSET_ID, amount: BigInt(992) }] as any,
      }),
    ]
    const indexer = makeIndexer([psbt], [spentVtxo(txid, 'fill-txid')])

    const { restored } = await restoreAssetSwaps(indexer, txs, new Set())

    expect(restored).toHaveLength(1)
    expect(restored[0]).toMatchObject({
      id: txid,
      fundingTxid: txid,
      fromAsset: 'btc',
      toAsset: ASSET_ID,
      fromAmount: '10000',
      toAmount: '992',
      swapPkScript: SWAP_PK_SCRIPT,
      offerHex: hex.encode(payload),
      status: 'fulfilled',
      spentTxid: 'fill-txid',
      createdAt: 1_700_000_000_000,
      completedAt: 1_700_000_100_000,
    })
  })

  it('recomputes the covenant price rate from the restored amounts', async () => {
    const offer = makeOffer('btc-to-asset', BigInt(500))
    const { psbt, txid } = fundingPsbt(encodeOffer(offer))
    const indexer = makeIndexer([psbt], [spentVtxo(txid, 'fill-txid')])

    const {
      restored: [restored],
    } = await restoreAssetSwaps(indexer, [walletTx(txid, 'sent')], new Set())

    // 10,000 sats bought 5.00 of a 2-decimals asset: the receipt derives the
    // rate purely from what the funding tx couple pinned on-chain
    const rateLabel = swapPriceRateLabel({
      assetSwap: {
        fromTicker: 'BTC',
        fromDecimals: 8,
        fromAmount: BigInt(restored.fromAmount),
        toTicker: 'USD',
        toDecimals: 2,
        toAmount: BigInt(restored.toAmount),
      },
    } as any)
    expect(rateLabel).toBe('1 BTC = 50,000.00 USD')
  })

  it('marks a spend that returned no want-asset as cancelled', async () => {
    const offer = makeOffer('btc-to-asset', BigInt(992))
    const { psbt, txid } = fundingPsbt(encodeOffer(offer))
    // the spend credited sats back, no asset delivered: our cancel
    const txs = [walletTx(txid, 'sent'), walletTx('cancel-txid', 'received', { amount: 10_000 })]
    const indexer = makeIndexer([psbt], [spentVtxo(txid, 'cancel-txid')])

    const {
      restored: [restored],
    } = await restoreAssetSwaps(indexer, txs, new Set())

    expect(restored).toMatchObject({ status: 'cancelled', spentTxid: 'cancel-txid' })
    expect(restored.completedAt).toBeUndefined()
  })

  it('rebuilds an asset->BTC swap with the deposit amount from the covenant vtxo assets', async () => {
    const offer = makeOffer('asset-to-btc', BigInt(21_000))
    const { psbt, txid } = fundingPsbt(encodeOffer(offer))
    const txs = [walletTx(txid, 'sent'), walletTx('fill-txid', 'received', { amount: 21_000 })]
    const vtxo = { ...spentVtxo(txid, 'fill-txid'), assets: [{ assetId: ASSET_ID, amount: BigInt(500) }] }
    const indexer = makeIndexer([psbt], [vtxo])

    const {
      restored: [restored],
    } = await restoreAssetSwaps(indexer, txs, new Set())

    expect(restored).toMatchObject({
      fromAsset: ASSET_ID,
      toAsset: 'btc',
      fromAmount: '500',
      toAmount: '21000',
      status: 'fulfilled',
    })
  })

  it('marks an asset->BTC spend that returned the deposit asset as cancelled', async () => {
    const offer = makeOffer('asset-to-btc', BigInt(21_000))
    const { psbt, txid } = fundingPsbt(encodeOffer(offer))
    const txs = [
      walletTx(txid, 'sent'),
      walletTx('cancel-txid', 'received', { assets: [{ assetId: ASSET_ID, amount: BigInt(500) }] as any }),
    ]
    const vtxo = { ...spentVtxo(txid, 'cancel-txid'), assets: [{ assetId: ASSET_ID, amount: BigInt(500) }] }
    const indexer = makeIndexer([psbt], [vtxo])

    const {
      restored: [restored],
    } = await restoreAssetSwaps(indexer, txs, new Set())

    expect(restored).toMatchObject({ status: 'cancelled' })
  })

  it('keeps an unspent deposit pending and a swept one recoverable', async () => {
    const offer = makeOffer('btc-to-asset', BigInt(992))
    const { psbt, txid } = fundingPsbt(encodeOffer(offer))
    for (const [state, status] of [
      ['settled', 'pending'],
      ['swept', 'recoverable'],
    ]) {
      const vtxo = { ...spentVtxo(txid, ''), arkTxId: undefined, virtualStatus: { state } }
      const indexer = makeIndexer([psbt], [vtxo])
      const {
        restored: [restored],
      } = await restoreAssetSwaps(indexer, [walletTx(txid, 'sent')], new Set())
      expect(restored.status).toBe(status)
      expect(restored.spentTxid).toBeUndefined()
    }
  })

  it('skips sent txs without an offer packet and already-known swaps', async () => {
    const offer = makeOffer('btc-to-asset', BigInt(992))
    const { psbt, txid } = fundingPsbt(encodeOffer(offer))
    const plainTx = new Transaction({ allowUnknownOutputs: true })
    plainTx.addInput({ txid: new Uint8Array(32), index: 1 })
    plainTx.addOutput({ script: hex.decode(SWAP_PK_SCRIPT), amount: BigInt(500) })
    const plain = base64.encode(plainTx.toPSBT())

    // known id: never fetched, never restored
    const known = await restoreAssetSwaps(makeIndexer([psbt], []), [walletTx(txid, 'sent')], new Set([txid]))
    expect(known).toEqual({ restored: [], scannedTxids: [] })

    // plain sends and received txs produce nothing
    const indexer = makeIndexer([plain], [])
    const result = await restoreAssetSwaps(
      indexer,
      [walletTx(plainTx.id, 'sent'), walletTx('other', 'received')],
      new Set(),
    )
    expect(result.restored).toEqual([])
    expect(result.scannedTxids).toEqual([plainTx.id])
    expect(indexer.calls).toEqual([[plainTx.id]])
  })

  it('never re-fetches txids that already got an authoritative answer', async () => {
    const { psbt, txid } = fundingPsbt(encodeOffer(makeOffer('btc-to-asset', BigInt(992))))
    const indexer = makeIndexer([psbt], [])

    const result = await restoreAssetSwaps(indexer, [walletTx(txid, 'sent')], new Set(), new Set([txid]))

    expect(result).toEqual({ restored: [], scannedTxids: [] })
    expect(indexer.calls).toEqual([])
  })

  it('leaves a failed fetch unscanned so it retries on a later scan', async () => {
    const { txid } = fundingPsbt(encodeOffer(makeOffer('btc-to-asset', BigInt(992))))
    const indexer = {
      getVirtualTxs: async () => {
        throw new Error('indexer down')
      },
      getVtxos: async () => ({ vtxos: [] }),
    } as any

    const result = await restoreAssetSwaps(indexer, [walletTx(txid, 'sent')], new Set())

    expect(result).toEqual({ restored: [], scannedTxids: [] })
  })
})
