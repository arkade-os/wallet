import { beforeEach, describe, it, expect } from 'vitest'
import { createDefaultActivityRegistry, ServiceWorkerWallet, type Activity, type ArkTransaction } from '@arkade-os/sdk'
import { activitiesToTxs, getActivityTxHistory } from '../../lib/activityHistory'
import { ASSET_SWAP_ACTIVITY_KIND, assetSwapResolver } from '../../lib/activity/assetSwapResolver'
import { readAllTransactionActivityMetadata, saveTransactionActivityMetadata } from '../../lib/storage'
import type { WalletAssetSwap } from '../../lib/swapRepository'

beforeEach(() => localStorage.clear())

const arkTx = (arkTxid: string, over: Partial<ArkTransaction> = {}): ArkTransaction =>
  ({
    amount: 1000,
    createdAt: 1_700_000_000_000,
    settled: true,
    type: 'RECEIVED',
    ...over,
    key: { arkTxid, boardingTxid: '', commitmentTxid: '' },
  }) as ArkTransaction

const activity = (id: string, txs: ArkTransaction[], intent?: Activity['intent']): Activity => ({
  id,
  intent,
  txs,
  amount: 0,
  createdAt: txs[0].createdAt,
  settled: txs.every((tx) => tx.settled),
})

const swapIntent = (swapId: string): Activity['intent'] => ({
  kind: ASSET_SWAP_ACTIVITY_KIND,
  label: 'Swap',
  metadata: { swapId },
})

const swap = (over: Partial<WalletAssetSwap> = {}): WalletAssetSwap =>
  ({
    id: 'swap-1',
    fromAsset: 'btc',
    toAsset: 'f1'.repeat(34),
    fromAmount: '10000',
    toAmount: '992',
    swapAddress: 'tark1q...',
    swapPkScript: '5120' + 'ab'.repeat(32),
    offerHex: '0100',
    fundingTxid: 'funding-txid',
    status: 'pending',
    createdAt: 2_000,
    ...over,
  }) as WalletAssetSwap

const empty = { swaps: [], metadata: {} }

describe('activitiesToTxs', () => {
  it('collapses a swap group into one row keyed on the activity id', () => {
    const fulfilled = swap({ status: 'fulfilled', spentTxid: 'fill-txid' })
    const fill = arkTx('fill-txid', { assets: [{ assetId: fulfilled.toAsset, amount: BigInt(54_321) }] })

    const txs = activitiesToTxs([activity('swap:swap-1', [arkTx('funding-txid'), fill], swapIntent('swap-1'))], {
      ...empty,
      swaps: [fulfilled],
    })

    expect(txs).toHaveLength(1)
    expect(txs[0]).toMatchObject({
      type: 'swap',
      historyKey: 'swap:swap-1',
      redeemTxid: 'fill-txid',
      assetSwap: { toAmount: BigInt(54_321), status: 'completed', fundingTxid: 'funding-txid', fillTxid: 'fill-txid' },
    })
  })

  it('emits one row per member for a group it does not collapse, with distinct keys', () => {
    const deposit = activity('boarding:abc', [arkTx('a'), arkTx('b')], { kind: 'boarding', label: 'Deposit' })

    const txs = activitiesToTxs([deposit], empty)

    expect(txs.map((tx) => tx.historyKey)).toEqual(['boarding:abc:a', 'boarding:abc:b'])
  })

  it('falls back to plain member rows when the swap record is not there yet', () => {
    const txs = activitiesToTxs([activity('swap:swap-1', [arkTx('funding-txid')], swapIntent('swap-1'))], empty)

    expect(txs).toHaveLength(1)
    expect(txs[0]).toMatchObject({ type: 'received', historyKey: 'swap:swap-1:funding-txid' })
    expect(txs[0].assetSwap).toBeUndefined()
  })

  it('still builds the swap row while the fill tx is missing from history', () => {
    // the window between applySwaps writing spentTxid and the reload that
    // refetches history: the stored toAmount is the only received amount there is
    const cancelling = swap({ status: 'fulfilled', spentTxid: 'fill-txid' })

    const [tx] = activitiesToTxs([activity('swap:swap-1', [arkTx('funding-txid')], swapIntent('swap-1'))], {
      ...empty,
      swaps: [cancelling],
    })

    expect(tx.assetSwap).toMatchObject({ toAmount: BigInt(992), status: 'completed' })
  })

  it('grafts local metadata onto member rows by their txid', () => {
    const txs = activitiesToTxs([activity('a', [arkTx('a', { type: 'SENT' as ArkTransaction['type'] })])], {
      ...empty,
      metadata: { a: { destination: 'tark1dest', networkFee: 12, savedAt: 0 } },
    })

    expect(txs[0]).toMatchObject({ destination: 'tark1dest', networkFee: 12 })
  })

  it('takes a grouped row metadata from the funding member, not the first match', () => {
    const fulfilled = swap({ status: 'fulfilled', spentTxid: 'fill-txid' })
    const group = activity('swap:swap-1', [arkTx('fill-txid'), arkTx('funding-txid')], swapIntent('swap-1'))

    const [tx] = activitiesToTxs([group], {
      swaps: [fulfilled],
      metadata: {
        'fill-txid': { networkFee: 99, savedAt: 0 },
        'funding-txid': { networkFee: 12, destination: 'tark1dest', savedAt: 0 },
      },
    })

    expect(tx).toMatchObject({ networkFee: 12, destination: 'tark1dest' })
  })

  it('re-sorts the produced rows rather than trusting the builder order', () => {
    const older = activity('old', [arkTx('old', { createdAt: 1_000 })])
    const newer = activity('new', [arkTx('new', { createdAt: 9_000 })])

    expect(activitiesToTxs([older, newer], empty).map((tx) => tx.redeemTxid)).toEqual(['new', 'old'])
  })
})

describe('getActivityTxHistory', () => {
  it('returns an empty list when the wallet call fails', async () => {
    const wallet = {
      getActivityHistory: async () => {
        throw new Error('offline')
      },
    }

    expect(await getActivityTxHistory(wallet, empty)).toEqual([])
  })
})

describe('assetSwapResolver', () => {
  it('groups the funding and spending txs of one swap and leaves the rest plain', async () => {
    const resolver = assetSwapResolver(async () => [swap({ spentTxid: 'fill-txid' })])
    await resolver.prepare?.()

    expect(resolver.resolve(arkTx('funding-txid'))).toEqual([
      { groupId: 'swap:swap-1', kind: 'swap', label: 'Swap', metadata: { swapId: 'swap-1' } },
    ])
    expect(resolver.resolve(arkTx('fill-txid'))?.[0].groupId).toBe('swap:swap-1')
    expect(resolver.resolve(arkTx('unrelated'))).toBeUndefined()
  })

  it('re-reads the store on every prepare, so records written after the first load still group', async () => {
    let records: WalletAssetSwap[] = []
    const resolver = assetSwapResolver(async () => records)

    await resolver.prepare?.()
    expect(resolver.resolve(arkTx('funding-txid'))).toBeUndefined()

    records = [swap()]
    await resolver.prepare?.()
    expect(resolver.resolve(arkTx('funding-txid'))?.[0].groupId).toBe('swap:swap-1')
  })
})

describe('end to end through the SDK grouping', () => {
  // buildActivities is not exported, but the wallet method that calls it with
  // the registered resolvers is
  const activityHistoryOf = async (txs: ArkTransaction[], swaps: WalletAssetSwap[]) => {
    const registry = createDefaultActivityRegistry()
    registry.use(assetSwapResolver(async () => swaps))
    const wallet = {
      activity: registry,
      getTransactionHistory: async () => txs,
      getActivityHistory: ServiceWorkerWallet.prototype.getActivityHistory,
    }
    return await wallet.getActivityHistory()
  }

  const MINT_TXID = 'ab'.repeat(32)

  it('collapses only the swap couple, and grafts metadata onto the rows it kept', async () => {
    const fulfilled = swap({ status: 'fulfilled', spentTxid: 'fill-txid', createdAt: 4_000 })
    const sent = (arkTxid: string, createdAt: number, over: Partial<ArkTransaction> = {}) =>
      arkTx(arkTxid, { type: 'SENT' as ArkTransaction['type'], settled: false, createdAt, ...over })
    const history: ArkTransaction[] = [
      sent('funding-txid', 4_000),
      arkTx('fill-txid', { createdAt: 5_000, assets: [{ assetId: fulfilled.toAsset, amount: BigInt(54_321) }] }),
      // an asset id encodes its genesis txid, which is what arms assetMintResolver
      sent(MINT_TXID, 6_000, { assets: [{ assetId: `${MINT_TXID}0000`, amount: BigInt(10) }] }),
      arkTx('plain-received', { createdAt: 7_000 }),
      {
        ...arkTx('', { createdAt: 8_000 }),
        key: { arkTxid: '', boardingTxid: 'boarding-txid', commitmentTxid: '' },
      } as ArkTransaction,
    ]
    saveTransactionActivityMetadata(MINT_TXID, { assetAction: 'issued', destination: 'tark1dest', networkFee: 42 })

    const txs = activitiesToTxs(await activityHistoryOf(history, [fulfilled]), {
      swaps: [fulfilled],
      metadata: readAllTransactionActivityMetadata(),
    })

    // boarding and mint are grouped by the SDK built-ins but must stay one row
    // each; only the swap's two members collapse
    expect(txs.map((tx) => [tx.type, tx.historyKey])).toEqual([
      ['received', 'boarding:boarding-txid:boarding-txid'],
      ['received', 'plain-received:plain-received'],
      ['sent', `mint:${MINT_TXID}0000:${MINT_TXID}`],
      ['swap', 'swap:swap-1'],
    ])
    expect(txs[2]).toMatchObject({ assetAction: 'issued', destination: 'tark1dest', networkFee: 42 })
    expect(txs[3]).toMatchObject({ assetSwap: { toAmount: BigInt(54_321), status: 'completed' } })
  })
})
