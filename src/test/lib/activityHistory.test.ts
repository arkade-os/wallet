import { beforeEach, describe, it, expect } from 'vitest'
import { lnSwapLabel } from '../../lib/swapDisplay'
import { createDefaultActivityRegistry, ServiceWorkerWallet, type Activity, type ArkTransaction } from '@arkade-os/sdk'
import { activitiesToTxs, getActivities } from '../../lib/activityHistory'
import { swapActivityResolver } from '@arkade-os/swap'
import { ASSET_SWAP_ACTIVITY_KIND, assetSwapResolver } from '../../lib/activity/assetSwapResolver'
import { readAllTransactionActivityMetadata, saveTransactionActivityMetadata } from '../../lib/storage'
import type { LnSendView } from '../../lib/lnSendRecords'
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

describe('getActivities', () => {
  it('returns an empty list when the wallet call fails', async () => {
    const wallet = {
      getActivityHistory: async () => {
        throw new Error('offline')
      },
    }

    expect(await getActivities(wallet)).toEqual([])
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

describe('lightning send activities', () => {
  const RFQ_ID = 'a'.repeat(64)

  const lnIntent = (outcome: string): Activity['intent'] => ({
    kind: 'swap',
    label: 'Lightning send',
    outcome,
    metadata: { rfqId: RFQ_ID, swapKind: 'lightning_send' },
  })

  const funding = arkTx('funding-txid', {
    type: 'SENT' as ArkTransaction['type'],
    amount: 1_030,
    settled: false,
    createdAt: 4_000,
  })
  const refund = arkTx('refund-txid', { amount: 1_000, createdAt: 5_000 })

  it('shows a refunded send as one row costing only its fees', () => {
    const [row, ...rest] = activitiesToTxs(
      // -1030 out, +1000 back: what the swap actually cost
      [{ ...activity(`swap:${RFQ_ID}`, [funding, refund], lnIntent('refunded')), amount: -30 }],
      empty,
    )

    expect(rest).toEqual([])
    expect(row).toMatchObject({
      amount: 30,
      type: 'sent',
      historyKey: `swap:${RFQ_ID}`,
      lnSwap: { label: 'Lightning send', outcome: 'refunded' },
    })
    // the receipt screen resolves the covenant's spender off this txid, so the
    // grouped row has to keep the funding leg's identity
    expect(row.redeemTxid).toBe('funding-txid')
  })

  it('shows a send still in flight at its full amount', () => {
    const [row] = activitiesToTxs(
      [{ ...activity(`swap:${RFQ_ID}`, [funding], lnIntent('pending')), amount: -1_030 }],
      empty,
    )

    expect(row).toMatchObject({ amount: 1_030, type: 'sent', lnSwap: { outcome: 'pending' } })
  })

  it('grafts the local metadata the funding leg carries', () => {
    saveTransactionActivityMetadata('funding-txid', { destination: 'lnbc10u1p...', networkFee: 30 })

    const [row] = activitiesToTxs([{ ...activity(`swap:${RFQ_ID}`, [funding], lnIntent('pending')), amount: -1_030 }], {
      ...empty,
      metadata: readAllTransactionActivityMetadata(),
    })

    expect(row).toMatchObject({ destination: 'lnbc10u1p...', networkFee: 30 })
  })

  const view = (over: Partial<LnSendView> = {}): LnSendView => ({
    rfqId: RFQ_ID,
    fundingTxid: 'funding-txid',
    state: 'pending',
    amount: 1_030,
    createdAt: 4_000,
    ...over,
  })

  it('shows a send in flight from its record, before any tx of it reaches history', () => {
    // The funding tx pays a covenant this wallet registered, so Arkade counts
    // the lockup as change and reports no movement at all. Nothing appears
    // until the solver spends the lockup — which is the wait the payer cannot
    // see and cannot control.
    const [row, ...rest] = activitiesToTxs([], { ...empty, lnSends: [view()] })

    expect(rest).toEqual([])
    expect(row).toMatchObject({
      amount: 1_030,
      type: 'sent',
      createdAt: 4_000,
      redeemTxid: 'funding-txid',
      settled: true,
      historyKey: `swap:${RFQ_ID}`,
      lnSwap: { label: 'Lightning send', outcome: 'pending', fundingTxid: 'funding-txid' },
    })
    expect(lnSwapLabel(row)).toBe('Lightning send pending')
  })

  it('gives that row the invoice and fee saved against the funding tx', () => {
    saveTransactionActivityMetadata('funding-txid', { destination: 'lnbc10u1p...', networkFee: 30 })

    const [row] = activitiesToTxs([], {
      ...empty,
      lnSends: [view()],
      metadata: readAllTransactionActivityMetadata(),
    })

    expect(row).toMatchObject({ destination: 'lnbc10u1p...', networkFee: 30 })
  })

  it('keeps naming a refunded send, whose refund tx history reports no better', () => {
    // A refund returns the money through a tx that nets to zero the same way
    // the funding did. Dropping the record's row on a terminal state would make
    // the payment vanish from the list at the moment it came back.
    const [row] = activitiesToTxs([], {
      ...empty,
      lnSends: [view({ state: 'refunded', spendTxid: 'refund-txid' })],
    })

    expect(row.lnSwap).toMatchObject({ outcome: 'refunded', spendTxid: 'refund-txid' })
    expect(lnSwapLabel(row)).toBe('Lightning send refunded')
  })

  it('yields to the group once one exists, under the same key', () => {
    // The lockup spend is a tx of ours, so the group finally forms — and the
    // real row replaces the record's rather than doubling it.
    const rows = activitiesToTxs([{ ...activity(`swap:${RFQ_ID}`, [funding], lnIntent('pending')), amount: -1_030 }], {
      ...empty,
      lnSends: [view()],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].historyKey).toBe(`swap:${RFQ_ID}`)
  })

  it('groups the refund with its funding tx end to end, through the package resolver', async () => {
    const registry = createDefaultActivityRegistry()
    registry.use(
      swapActivityResolver({
        listSwaps: async () => [
          { rfqId: RFQ_ID, kind: 'lightning_send', state: 'refunded', txids: ['funding-txid', 'refund-txid'] },
        ],
      }),
    )
    const wallet = {
      activity: registry,
      getTransactionHistory: async () => [funding, refund, arkTx('unrelated', { createdAt: 6_000 })],
      getActivityHistory: ServiceWorkerWallet.prototype.getActivityHistory,
    }

    const txs = activitiesToTxs(await wallet.getActivityHistory(), empty)

    // without the resolver these are two rows, and the refund reads as money
    // arriving from nowhere
    expect(txs.map((tx) => [tx.type, tx.historyKey])).toEqual([
      ['received', 'unrelated:unrelated'],
      ['sent', `swap:${RFQ_ID}`],
    ])
    expect(txs[1]).toMatchObject({ amount: 30, lnSwap: { label: 'Lightning send', outcome: 'refunded' } })
  })
})

describe('lightning receive activities', () => {
  const RFQ_ID = 'c'.repeat(64)

  const recvIntent = (outcome: string): Activity['intent'] => ({
    kind: 'swap',
    label: 'Lightning receive',
    outcome,
    metadata: { rfqId: RFQ_ID, swapKind: 'lightning_receive' },
  })

  // The only transaction of ours on this leg: the SOLVER funds the lockup, we
  // claim it. There is no funding member to anchor on.
  const claim = arkTx('claim-txid', { amount: 10_000, createdAt: 7_000 })

  it('shows a settled receive as one labelled row, not a bare incoming tx', () => {
    const [row, ...rest] = activitiesToTxs(
      [{ ...activity(`swap:${RFQ_ID}`, [claim], recvIntent('settled')), amount: 10_000 }],
      empty,
    )

    expect(rest).toEqual([])
    expect(row).toMatchObject({
      amount: 10_000,
      type: 'received',
      historyKey: `swap:${RFQ_ID}`,
      lnSwap: { label: 'Lightning receive', outcome: 'settled' },
    })
  })

  it('carries no fundingTxid, so it cannot open the send leg’s receipt', () => {
    const [row] = activitiesToTxs(
      [{ ...activity(`swap:${RFQ_ID}`, [claim], recvIntent('settled')), amount: 10_000 }],
      empty,
    )

    // `useLnSendReceipt` keys off exactly this field and returns undefined
    // without it — which is what keeps a receive out of a receipt built for a
    // send.
    expect(row.lnSwap?.fundingTxid).toBeUndefined()
  })

  it('renders a lost receive as lost, never as refunded', () => {
    // The resolver emits `lost` for a `lightning_receive` that ended
    // `refunded`, because on this leg the lockup going back means the payment
    // never arrived. Reachable in history only for a receive that got SOME of
    // its money — one that got none contributes no tx of ours, so it forms no
    // group at all.
    const [row] = activitiesToTxs(
      [{ ...activity(`swap:${RFQ_ID}`, [claim], recvIntent('lost')), amount: 4_000 }],
      empty,
    )

    expect(row.lnSwap?.outcome).toBe('lost')
    expect(lnSwapLabel(row)).toBe('Lightning receive lost')
  })

  it('falls back to plain member rows rather than dropping a group it cannot anchor', () => {
    // No RECEIVED member means the record named a txid this history does not
    // have. Whatever IS here is still the user's money moving, so it is emitted
    // rather than swallowed — the same rule the send builder follows.
    const stray = arkTx('stray-txid', { type: 'SENT' as ArkTransaction['type'], amount: 500, createdAt: 8_000 })

    const rows = activitiesToTxs([{ ...activity(`swap:${RFQ_ID}`, [stray], recvIntent('lost')), amount: -500 }], empty)

    expect(rows.map((tx) => tx.historyKey)).toEqual([`swap:${RFQ_ID}:stray-txid`])
    expect(rows[0].lnSwap).toBeUndefined()
  })

  // A receive that never arrived at all contributes no transaction of ours, so
  // it forms no activity and reaches this function not at all. That absence is
  // upstream of the row builder and cannot be asserted here.
})
