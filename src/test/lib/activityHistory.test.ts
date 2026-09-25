import { beforeEach, describe, it, expect, expectTypeOf } from 'vitest'
import { lnSwapLabel } from '../../lib/swapDisplay'
import { createDefaultActivityRegistry, ServiceWorkerWallet, type Activity, type ArkTransaction } from '@arkade-os/sdk'
import { activitiesToTxs, getActivities } from '../../lib/activityHistory'
import { txidOfArkTransaction } from '../../lib/transactionHistory'
import { swapActivityResolver } from '@arkade-os/swap'
import { ASSET_SWAP_ACTIVITY_KIND, assetSwapResolver } from '../../lib/activity/assetSwapResolver'
import { readAllTransactionActivityMetadata, saveTransactionActivityMetadata } from '../../lib/storage'
import type { ExitRecord } from '../../lib/exitHistory'
import type { LnSendView } from '../../lib/lnSendRecords'
import type { WalletAssetSwap } from '../../lib/swapRepository'
import type { ActivityEvidence } from '../../lib/activityEvidence'

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

  it('shows an unfunded offer record as one pending zero-amount row', () => {
    const pending = swap({ id: 'intent-1', fundingTxid: '', quote: { fromTicker: 'SAT', toTicker: 'TOK' } })

    const rows = activitiesToTxs([], { ...empty, swaps: [pending] })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      amount: 0,
      historyKey: 'swap:intent-1',
      preconfirmed: true,
      redeemTxid: '',
      settled: false,
      type: 'swap',
      assetSwap: { fromTicker: 'SAT', toTicker: 'TOK', status: 'pending', fundingTxid: '' },
    })
  })

  it('replaces the unfunded offer row under the same stable identity after funding and claim', () => {
    const claimTxid = '3'.repeat(64)
    const prepared = swap({ id: 'intent-1', fundingTxid: '' })
    const funded = {
      ...swap({ id: 'intent-1', fundingTxid: 'funding-txid' }),
      carrier: {
        version: 1,
        mode: 'purchase',
        physicalSats: '330',
        loanSats: '0',
        purchasedSats: '330',
        receiptSats: '0',
        serviceFareSats: '0',
        state: 'claimed',
        txids: [claimTxid],
      },
    } as WalletAssetSwap
    const before = activitiesToTxs([], { ...empty, swaps: [prepared] })
    const after = activitiesToTxs(
      [activity('swap:intent-1', [arkTx('funding-txid'), arkTx(claimTxid)], swapIntent('intent-1'))],
      { ...empty, swaps: [funded] },
    )

    expect(before.map((row) => row.historyKey)).toEqual(['swap:intent-1'])
    expect(after.map((row) => row.historyKey)).toEqual(['swap:intent-1'])
  })

  it('keeps prepared offers with empty funding txids distinct by stable id', () => {
    const rows = activitiesToTxs([], {
      ...empty,
      swaps: [swap({ id: 'intent-1', fundingTxid: '' }), swap({ id: 'intent-2', fundingTxid: '' })],
    })

    expect(rows.map((row) => row.historyKey).sort()).toEqual(['swap:intent-1', 'swap:intent-2'])
  })

  it('coalesces uniquely correlated raw funding and carrier members before resolver grouping', () => {
    const fundingTxid = '1'.repeat(64)
    const claimTxid = '2'.repeat(64)
    const carrier: NonNullable<WalletAssetSwap['carrier']> = {
      version: 1,
      mode: 'purchase',
      physicalSats: '330',
      loanSats: '0',
      purchasedSats: '330',
      receiptSats: '0',
      serviceFareSats: '0',
      state: 'claimed',
      txids: [claimTxid],
    }
    const record = { ...swap({ id: 'intent-1', fundingTxid }), carrier }
    const funding = arkTx(fundingTxid, {
      amount: -10_000,
      createdAt: 1_700_000_000_000,
      type: 'SENT' as ArkTransaction['type'],
    })
    const claim = arkTx(claimTxid, { amount: 0, createdAt: 1_700_000_005_000 })

    const before = activitiesToTxs([activity('raw-funding', [funding]), activity('raw-claim', [claim])], {
      ...empty,
      swaps: [record],
    })
    const after = activitiesToTxs([activity('swap:intent-1', [funding, claim], swapIntent('intent-1'))], {
      ...empty,
      swaps: [record],
    })

    for (const rows of [before, after]) {
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ amount: 10_000, historyKey: 'swap:intent-1', type: 'swap' })
      expect(rows[0].carrierMembers).toEqual([
        { txid: fundingTxid, type: 'sent' },
        { txid: claimTxid, type: 'received' },
      ])
    }
  })

  it('attaches a correlated raw claim to an existing swap group regardless of snapshot order', () => {
    const fundingTxid = '3'.repeat(64)
    const claimTxid = '4'.repeat(64)
    const record = {
      ...swap({ id: 'intent-1', fundingTxid, spentTxid: claimTxid, status: 'fulfilled' }),
      carrier: {
        version: 1,
        mode: 'purchase',
        physicalSats: '330',
        loanSats: '0',
        purchasedSats: '330',
        receiptSats: '0',
        serviceFareSats: '0',
        state: 'claimed',
        txids: [claimTxid],
      },
    } as WalletAssetSwap
    const funding = arkTx(fundingTxid, {
      amount: -10_000,
      createdAt: 1_700_000_000_000,
      type: 'SENT' as ArkTransaction['type'],
    })
    const claim = arkTx(claimTxid, {
      amount: 500,
      assets: [{ assetId: record.toAsset, amount: BigInt(321) }],
      createdAt: 1_700_000_005_000,
    })
    const group = activity('swap:intent-1', [funding], swapIntent('intent-1'))
    const rawClaim = activity('raw-claim', [claim])
    const snapshots = [
      activitiesToTxs([group, rawClaim], { ...empty, swaps: [record] }),
      activitiesToTxs([rawClaim, group], { ...empty, swaps: [record] }),
      activitiesToTxs([activity('swap:intent-1', [funding, claim], swapIntent('intent-1'))], {
        ...empty,
        swaps: [record],
      }),
    ]

    for (const rows of snapshots) {
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        amount: 10_000,
        historyKey: 'swap:intent-1',
        assetSwap: { toAmount: BigInt(321) },
      })
      expect(rows[0].carrierMembers).toEqual([
        { txid: fundingTxid, type: 'sent' },
        { txid: claimTxid, type: 'received' },
      ])
    }
  })

  it('keeps same-hash sent and received evidence while deduplicating identical raw members', () => {
    const fundingTxid = '7'.repeat(64)
    const fillTxid = '8'.repeat(64)
    const record = {
      ...swap({ id: 'intent-1', fundingTxid, spentTxid: fillTxid, status: 'fulfilled' }),
      carrier: {
        version: 1,
        mode: 'purchase',
        physicalSats: '330',
        loanSats: '0',
        purchasedSats: '330',
        receiptSats: '0',
        serviceFareSats: '0',
        state: 'claimed',
        txids: [fillTxid],
      },
    } as WalletAssetSwap
    const funding = arkTx(fundingTxid, {
      amount: -10_000,
      createdAt: 1_700_000_000_000,
      type: 'SENT' as ArkTransaction['type'],
    })
    const fillReceived = arkTx(fillTxid, {
      amount: 500,
      assets: [{ assetId: record.toAsset, amount: BigInt(654) }],
      createdAt: 1_700_000_005_000,
    })
    const fillSent = arkTx(fillTxid, {
      amount: -500,
      createdAt: 1_700_000_005_000,
      type: 'SENT' as ArkTransaction['type'],
    })
    const snapshots = [
      activitiesToTxs(
        [activity('raw-funding', [funding]), activity('raw-fill', [fillSent, fillReceived, fillReceived])],
        { ...empty, swaps: [record] },
      ),
      activitiesToTxs(
        [activity('swap:intent-1', [funding, fillSent, fillReceived, fillReceived], swapIntent('intent-1'))],
        { ...empty, swaps: [record] },
      ),
    ]

    for (const rows of snapshots) {
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        amount: 10_000,
        historyKey: 'swap:intent-1',
        assetSwap: { toAmount: BigInt(654) },
      })
      const linkedTxids = rows[0].carrierMembers?.map(({ txid }) => txid)
      expect(linkedTxids).toEqual([fundingTxid, fillTxid])
      expect(new Set(linkedTxids).size).toBe(2)
    }
  })

  it('leaves a shared raw tx unattributed when several swaps persist the same txid', () => {
    const sharedTxid = '6'.repeat(64)
    const shared = arkTx(sharedTxid, {
      amount: -10_000,
      createdAt: 1_700_000_000_000,
      type: 'SENT' as ArkTransaction['type'],
    })

    const rows = activitiesToTxs([activity('raw-shared', [shared])], {
      ...empty,
      swaps: [
        swap({ id: 'intent-1', fundingTxid: sharedTxid }),
        swap({ id: 'intent-2', fundingTxid: sharedTxid }),
        swap({ id: 'intent-3', fundingTxid: sharedTxid }),
      ],
    })

    expect(rows.filter((row) => row.type === 'swap')).toHaveLength(3)
    expect(rows.filter((row) => row.type === 'swap').every((row) => row.amount === 0)).toBe(true)
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ amount: 10_000, historyKey: 'raw-shared:' + sharedTxid, type: 'sent' }),
      ]),
    )
  })

  it('ignores malformed and non-offer records without hiding valid pending offers', () => {
    const valid = swap({ id: 'intent-1', fundingTxid: '' })
    const malformed = swap({ id: 'broken', fundingTxid: '', fromAmount: 'not-an-integer' })
    const missingId = swap({ id: '', fundingTxid: '' })
    const onchain = { ...swap({ id: 'rfq-1', fundingTxid: '' }), offerHex: undefined, paymentHash: 'ab'.repeat(32) }

    const rows = activitiesToTxs([], {
      ...empty,
      swaps: [valid, malformed, missingId, onchain as unknown as WalletAssetSwap],
    })

    expect(rows.map((row) => row.historyKey)).toEqual(['swap:intent-1'])
  })

  it('keeps grouped malformed raw evidence and unrelated activity readable', () => {
    const broken = swap({ id: 'broken', fundingTxid: 'broken-funding', fromAmount: 'not-an-integer' })
    const funding = arkTx('broken-funding', {
      amount: -777,
      createdAt: 1_700_000_000_000,
      type: 'SENT' as ArkTransaction['type'],
    })
    const other = arkTx('other-receive', { amount: 42, createdAt: 1_700_000_005_000 })

    const ungrouped = activitiesToTxs(
      [activity('raw-broken', [funding]), activity('plain:other', [other], { kind: 'receive', label: 'Receive' })],
      { ...empty, swaps: [broken] },
    )
    const grouped = activitiesToTxs(
      [
        activity('swap:broken', [funding], swapIntent('broken')),
        activity('plain:other', [other], { kind: 'receive', label: 'Receive' }),
      ],
      { ...empty, swaps: [broken] },
    )

    for (const rows of [ungrouped, grouped]) {
      expect(rows).toHaveLength(2)
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ amount: 777, type: 'sent' }),
          expect.objectContaining({ amount: 42, historyKey: 'plain:other:other-receive', type: 'received' }),
        ]),
      )
    }
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

  it('gives every evidenced operation on one txid its own membership, from the prepared index', async () => {
    const txid = '5'.repeat(64)
    const evidenced = (id: string, sats: string) =>
      swap({
        id,
        fundingTxid: txid,
        activityEvidence: { version: 1, contributions: [{ txid, direction: 'sent', sats, assets: [] }] },
      })
    const resolver = assetSwapResolver(async () => [evidenced('one', '3000'), evidenced('two', '4000')])
    await resolver.prepare?.()
    const funding = arkTx(txid, { amount: -10_000, type: 'SENT' as ArkTransaction['type'] })
    const memberships = [
      { groupId: 'swap:one', kind: 'swap', label: 'Swap', metadata: { swapId: 'one' }, amount: 3000 },
      { groupId: 'swap:two', kind: 'swap', label: 'Swap', metadata: { swapId: 'two' }, amount: 4000 },
    ]

    expect(resolver.resolve(funding)).toEqual(memberships)
    expect(resolver.resolve(funding)).toEqual(memberships)
  })

  it('does not alias distinct prepared swaps through an empty funding txid', async () => {
    const resolver = assetSwapResolver(async () => [
      swap({ id: 'intent-1', fundingTxid: '' }),
      swap({ id: 'intent-2', fundingTxid: '' }),
    ])
    await resolver.prepare?.()

    expect(resolver.resolve(arkTx(''))).toBeUndefined()
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

  describe('batched asset-swap attribution', () => {
    const FUNDING = '1'.repeat(64)
    const FILL = '2'.repeat(64)
    const CLAIM = '3'.repeat(64)
    const ASSET = 'ab'.repeat(34)

    const evidence = (
      fundingSats: string,
      fillSats: string,
      fillAssets: string,
      extra: ActivityEvidence['contributions'] = [],
    ): ActivityEvidence => ({
      version: 1,
      contributions: [
        { txid: FUNDING, direction: 'sent', sats: fundingSats, assets: [] },
        {
          txid: FILL,
          direction: 'received',
          sats: fillSats,
          assets: [{ assetId: ASSET, amount: fillAssets }],
        },
        ...extra,
      ],
    })

    const batchSwap = (id: string, activityEvidence: unknown, over: Partial<WalletAssetSwap> = {}) =>
      swap({
        id,
        fromAsset: 'btc',
        toAsset: ASSET,
        fromAmount: '9999',
        toAmount: '888',
        fundingTxid: FUNDING,
        spentTxid: FILL,
        status: 'fulfilled',
        ...(activityEvidence === undefined ? {} : { activityEvidence: activityEvidence as ActivityEvidence }),
        ...over,
      })

    const funding = arkTx(FUNDING, { amount: -10_000, type: 'SENT' as ArkTransaction['type'], createdAt: 1_000 })
    const fill = arkTx(FILL, {
      amount: 500,
      assets: [{ assetId: ASSET, amount: 700n }],
      createdAt: 2_000,
    })

    it('projects two shared operations and each raw remainder exactly once through the SDK registry', async () => {
      const records = [
        batchSwap('one', evidence('3000', '100', '200')),
        batchSwap('two', evidence('4000', '200', '300')),
      ]
      const groups = await activityHistoryOf([funding, fill], records)
      const rows = activitiesToTxs(groups, { ...empty, swaps: records })
      const one = rows.find((row) => row.historyKey === 'swap:one')
      const two = rows.find((row) => row.historyKey === 'swap:two')
      const residuals = rows.filter((row) => row.historyKey?.startsWith('arkade-wallet:asset-swap-residual:'))

      expect(groups.filter((group) => group.intent?.kind === ASSET_SWAP_ACTIVITY_KIND)).toHaveLength(2)
      expect(one).toMatchObject({ amount: 3000, assetSwap: { fromAmount: 3000n, toAmount: 200n } })
      expect(two).toMatchObject({ amount: 4000, assetSwap: { fromAmount: 4000n, toAmount: 300n } })
      expect(residuals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ amount: 3000, type: 'sent' }),
          expect.objectContaining({ amount: 200, type: 'received', assets: [{ assetId: ASSET, amount: 200n }] }),
        ]),
      )
      expect(residuals).toHaveLength(2)
    })

    it('emits no raw economic row when distinct asset-only shares fully allocate a member', async () => {
      const secondAsset = 'cd'.repeat(34)
      const received = arkTx(FILL, {
        amount: 0,
        assets: [
          { assetId: ASSET, amount: 20n },
          { assetId: secondAsset, amount: 30n },
        ],
      })
      const records = [
        batchSwap('one', {
          version: 1,
          contributions: [{ txid: FILL, direction: 'received', sats: '0', assets: [{ assetId: ASSET, amount: '20' }] }],
        }),
        batchSwap(
          'two',
          {
            version: 1,
            contributions: [
              { txid: FILL, direction: 'received', sats: '0', assets: [{ assetId: secondAsset, amount: '30' }] },
            ],
          },
          { toAsset: secondAsset },
        ),
      ]
      const groups = await activityHistoryOf([received], records)
      const rows = activitiesToTxs(groups, { ...empty, swaps: records })

      expect(rows.map((row) => [row.historyKey, row.assetSwap?.toAmount]).sort()).toEqual(
        [
          ['swap:one', 20n],
          ['swap:two', 30n],
        ].sort(),
      )
    })

    it('is invariant to mixed grouped/raw order and repeated observations', async () => {
      const records = [
        batchSwap('one', evidence('3000', '100', '200')),
        batchSwap('two', evidence('4000', '200', '300')),
      ]
      const groups = await activityHistoryOf([funding, fill, { ...fill }], records)
      const raw = [activity('raw-funding', [funding, { ...funding }]), activity('raw-fill', [fill])]
      const snapshots = [
        activitiesToTxs([...groups, ...raw], { ...empty, swaps: records }),
        activitiesToTxs([...raw, ...groups], { ...empty, swaps: records }),
      ]

      expect(snapshots[0]).toEqual(snapshots[1])
      expect(snapshots[0].map((row) => row.historyKey).sort()).toEqual(
        [
          `arkade-wallet:asset-swap-residual:${FILL}:received`,
          `arkade-wallet:asset-swap-residual:${FUNDING}:sent`,
          'swap:one',
          'swap:two',
        ].sort(),
      )
    })

    it('keeps same-hash sent and received allocations distinct', async () => {
      const hash = '4'.repeat(64)
      const sent = arkTx(hash, { amount: -1000, type: 'SENT' as ArkTransaction['type'], createdAt: 1_000 })
      const received = arkTx(hash, {
        amount: 100,
        assets: [{ assetId: ASSET, amount: 50n }],
        createdAt: 2_000,
      })
      const record = batchSwap(
        'same-hash',
        {
          version: 1,
          contributions: [
            { txid: hash, direction: 'sent', sats: '600', assets: [] },
            { txid: hash, direction: 'received', sats: '40', assets: [{ assetId: ASSET, amount: '20' }] },
          ],
        },
        { fundingTxid: hash, spentTxid: hash },
      )
      const groups = await activityHistoryOf([sent, received], [record])
      const rows = activitiesToTxs(groups, { ...empty, swaps: [record] })

      expect(groups[0].amount).toBe(-600)
      expect(rows.find((row) => row.historyKey === 'swap:same-hash')).toMatchObject({
        amount: 600,
        assetSwap: { fromAmount: 600n, toAmount: 20n },
      })
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ amount: 400, type: 'sent' }),
          expect.objectContaining({ amount: 60, type: 'received', assets: [{ assetId: ASSET, amount: 30n }] }),
        ]),
      )
    })

    it('does not turn merged holdings or a later claim into the received swap amount', async () => {
      const claim = arkTx(CLAIM, {
        amount: 0,
        assets: [{ assetId: ASSET, amount: 5000n }],
        createdAt: 3_000,
      })
      const record = batchSwap(
        'one',
        evidence('3000', '0', '200', [
          { txid: CLAIM, direction: 'received', sats: '0', assets: [{ assetId: ASSET, amount: '200' }] },
        ]),
      )
      const groups = await activityHistoryOf([funding, fill, claim], [record])
      const rows = activitiesToTxs(groups, { ...empty, swaps: [record] })

      expect(rows.find((row) => row.historyKey === 'swap:one')?.assetSwap?.toAmount).toBe(200n)
      expect(rows.find((row) => row.historyKey?.endsWith(`${CLAIM}:received`))?.assets).toEqual([
        { assetId: ASSET, amount: 4800n },
      ])
    })

    it('keeps the members of a swap group with invalid evidence, and its record status, on one row each', () => {
      const record = batchSwap('one', { version: 1, contributions: 'broken' })
      const rows = activitiesToTxs([activity('swap:one', [funding, fill], swapIntent('one'))], {
        ...empty,
        swaps: [record],
      })

      expect(
        rows
          .filter((row) => row.type !== 'swap')
          .map((row) => [row.type, row.amount])
          .sort(),
      ).toEqual([
        ['received', 500],
        ['sent', 10_000],
      ])
      expect(rows.filter((row) => row.type === 'swap')).toEqual([
        expect.objectContaining({ historyKey: 'swap:one', amount: 0, settled: true, assetSwap: expect.anything() }),
      ])
      expect(rows.find((row) => row.type === 'swap')?.assetSwap?.status).toBe('completed')
    })

    it('renders a swap id once when two records for it conflict', async () => {
      const records = [
        batchSwap('one', evidence('3000', '100', '200')),
        batchSwap('one', evidence('4000', '200', '300')),
      ]
      const groups = await activityHistoryOf([funding, fill], records)
      const rows = activitiesToTxs(groups, { ...empty, swaps: records })

      expect(rows.filter((row) => row.historyKey === 'swap:one')).toHaveLength(1)
      expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ amount: 10_000, type: 'sent' })]))
    })

    it.each([
      ['grouped by the resolver', (txs: ArkTransaction[]) => [activity('swap:one', txs, swapIntent('one'))]],
      ['left as raw groups', (txs: ArkTransaction[]) => txs.map((tx) => activity(txidOfArkTransaction(tx), [tx]))],
    ])('shows a swap whose row cannot be built as its transactions, and logs why, when %s', (_case, groupsOf) => {
      const record = batchSwap('one', evidence('10000', '500', '700'), { status: 'pending', toAmount: 'not-a-number' })
      const rows = activitiesToTxs(groupsOf([funding]), { ...empty, swaps: [record] })

      expect(rows.map((row) => [row.type, row.amount])).toEqual([['sent', 10_000]])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('swap one'))
    })

    it('never lets the orphan sweep re-render a swap whose grouped row threw', () => {
      const record = swap({ id: 'one', fromAsset: ASSET, toAsset: 'btc', fundingTxid: FUNDING, spentTxid: FILL })
      // only the grouped row reads the fill's amount, so the sweep alone could still build this swap
      const malformedFill = arkTx(FILL, { amount: 0.5, createdAt: 2_000 })
      const rows = activitiesToTxs([activity('swap:one', [funding, malformedFill], swapIntent('one'))], {
        ...empty,
        swaps: [record],
      })

      expect(rows.map((row) => [row.type, row.amount]).sort()).toEqual([
        ['received', 0.5],
        ['sent', 10_000],
      ])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('swap one'))
    })

    it.each([
      ['missing', undefined],
      ['invalid', { version: 1, contributions: 'broken' }],
      ['over-cap', evidence('10001', '0', '1')],
    ])('keeps shared raw evidence and both synthetic intents when evidence is %s', async (_name, activityEvidence) => {
      const records = [batchSwap('one', activityEvidence), batchSwap('two', activityEvidence)]
      const groups = await activityHistoryOf([funding], records)
      const rows = activitiesToTxs(groups, { ...empty, swaps: records })

      expect(groups).toHaveLength(1)
      expect(groups[0].intent).toBeUndefined()
      expect(
        rows
          .filter((row) => row.type === 'swap')
          .map((row) => row.historyKey)
          .sort(),
      ).toEqual(['swap:one', 'swap:two'])
      expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ amount: 10_000, type: 'sent' })]))
    })

    it('lets valid local evidence allocate beside a malformed record without hiding the remainder', async () => {
      const records = [
        batchSwap('valid', evidence('3000', '100', '200')),
        batchSwap('broken', {
          version: 1,
          contributions: [{ txid: FUNDING, direction: 'sent', sats: '00', assets: [] }],
        }),
      ]
      const groups = await activityHistoryOf([funding, fill], records)
      const rows = activitiesToTxs(groups, { ...empty, swaps: records })

      expect(rows.find((row) => row.historyKey === 'swap:valid')).toMatchObject({ amount: 3000 })
      expect(rows.find((row) => row.historyKey === 'swap:broken')).toMatchObject({ amount: 0 })
      expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ amount: 7000, type: 'sent' })]))
    })

    it('never reads an asset leaving the wallet as the received swap amount', async () => {
      const leaving = arkTx(FILL, { amount: 500, assets: [{ assetId: ASSET, amount: -700n }], createdAt: 2_000 })
      const records = [batchSwap('one', evidence('3000', '100', '200'))]
      const groups = await activityHistoryOf([funding, leaving], records)
      const rows = activitiesToTxs(groups, { ...empty, swaps: records })

      expect(rows.find((row) => row.historyKey === 'swap:one')).toMatchObject({
        amount: 3000,
        assetSwap: { fromAmount: 3000n, toAmount: 888n },
      })
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ amount: 500, type: 'received', assets: [{ assetId: ASSET, amount: -700n }] }),
        ]),
      )
    })
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

describe('unilateral exits', () => {
  const exit = (over: Partial<ExitRecord> = {}): ExitRecord => ({
    txid: 'exit-txid',
    vout: 0,
    value: 5_000,
    exitedAt: 1_700_090_000,
    ...over,
  })

  it('synthesises one row per exited coin, keyed on the outpoint', () => {
    const rows = activitiesToTxs([], { ...empty, exits: [exit({ vout: 0 }), exit({ vout: 1 })] })

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.historyKey).sort()).toEqual(['exit:exit-txid:0', 'exit:exit-txid:1'])
    expect(rows.every((row) => row.type === 'exit' && row.settled && !row.preconfirmed)).toBe(true)
    expect(rows.map((row) => row.amount)).toEqual([5_000, 5_000])
  })

  it('dates the row by the exit, not by the receive that created the coin', () => {
    const receive = activity('a', [arkTx('receive-txid')])

    const rows = activitiesToTxs([receive], { ...empty, exits: [exit()] })
    const exitRow = rows.find((row) => row.type === 'exit')

    // the receive is at 1_700_000_000; sorted by the coin's own createdAt the
    // exit would tie with it instead of leading the list
    expect(exitRow?.createdAt).toBe(1_700_090_000)
    expect(rows[0]).toBe(exitRow)
  })

  it('leaves the original receive standing — the money arrived and then left', () => {
    const receive = activity('a', [arkTx('receive-txid')])

    const rows = activitiesToTxs([receive], { ...empty, exits: [exit({ txid: 'receive-txid' })] })

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.type).sort()).toEqual(['exit', 'received'])
  })

  it('does not wear the receive metadata it shares a txid with', () => {
    saveTransactionActivityMetadata('receive-txid', { destination: 'someone', networkFee: 42 })

    const [row] = activitiesToTxs([], {
      ...empty,
      metadata: readAllTransactionActivityMetadata(),
      exits: [exit({ txid: 'receive-txid' })],
    })

    expect(row.destination).toBeUndefined()
    expect(row.networkFee).toBe(0)
  })

  it('links to the exit transaction', () => {
    const [row] = activitiesToTxs([], { ...empty, exits: [exit()] })

    expect(row.redeemTxid).toBe('exit-txid')
    expect(row.boardingTxid).toBe('')
  })
})

describe('carrier metadata', () => {
  const TXID = (byte: string) => byte.repeat(64)
  /** The contract requires producer-verified 64-hex lineage. */
  const FUNDING_TXID = TXID('1')
  const FILL_TXID = TXID('2')
  const CLAIM_TXID = TXID('3')
  const RECOVERY_TXID = TXID('4')

  const RECYCLE = {
    version: 1,
    mode: 'recycle',
    physicalSats: '330',
    loanSats: '329',
    purchasedSats: '1',
    receiptSats: '1',
    serviceFareSats: '0',
    taxi: { transferId: 'advance-1' },
    state: 'claimable',
    txids: [CLAIM_TXID, RECOVERY_TXID],
  } as const

  const PURCHASE = {
    version: 1,
    mode: 'purchase',
    physicalSats: '330',
    loanSats: '0',
    purchasedSats: '330',
    receiptSats: '0',
    serviceFareSats: '0',
    state: 'claimed',
    txids: [FILL_TXID],
  } as const

  /** Raw JSON, as the store hands it back. */
  const withCarrier = (record: WalletAssetSwap, carrier: unknown): WalletAssetSwap =>
    ({ ...record, carrier }) as WalletAssetSwap

  const funded = () => withCarrier(swap({ fundingTxid: FUNDING_TXID }), RECYCLE)
  const filled = () => swap({ status: 'fulfilled', spentTxid: FILL_TXID, fundingTxid: FUNDING_TXID })

  /** The real path: resolver -> SDK grouping -> rows. */
  const historyOf = async (txs: ArkTransaction[], swaps: WalletAssetSwap[]) => {
    const registry = createDefaultActivityRegistry()
    registry.use(assetSwapResolver(async () => swaps))
    const wallet = {
      activity: registry,
      getTransactionHistory: async () => txs,
      getActivityHistory: ServiceWorkerWallet.prototype.getActivityHistory,
    }
    return await wallet.getActivityHistory()
  }

  const amountOf = (txs: ArkTransaction[]) => txs.reduce((sum, tx) => sum + tx.amount, 0)

  /** Four distinct moments, so the member order is determined: the fixtures
   *  otherwise share one clock and the order is the fetch's. */
  const at = (index: number) => 1_700_000_000_000 + index * 5_000

  it('collapses funding, fill, claim and recovery into the one original swap row', async () => {
    const base = { ...funded(), spentTxid: FILL_TXID }
    const history = [
      arkTx(FUNDING_TXID, { type: 'SENT' as ArkTransaction['type'], amount: -10_000, createdAt: at(0) }),
      arkTx(FILL_TXID, { amount: 10_000, assets: [{ assetId: base.toAsset, amount: BigInt(200) }], createdAt: at(1) }),
      arkTx(CLAIM_TXID, { amount: 0, createdAt: at(2) }),
      arkTx(RECOVERY_TXID, { amount: 0, createdAt: at(3) }),
    ]
    const lineage = { ...RECYCLE, txids: [FUNDING_TXID, CLAIM_TXID, RECOVERY_TXID] }
    const record = withCarrier(base, lineage)
    const group = activity('swap:swap-1', history, {
      kind: ASSET_SWAP_ACTIVITY_KIND,
      label: 'Swap',
      metadata: { swapId: 'swap-1', carrier: RECYCLE },
    })

    const groups = await historyOf(history, [record])
    const rows = activitiesToTxs([group], { ...empty, swaps: [record] })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'swap', historyKey: 'swap:swap-1' })
    // the row takes the record's descriptor, which holds the lineage
    expect(rows[0].carrier).toMatchObject({ mode: 'recycle', loanSats: '329', purchasedSats: '1', taxi: RECYCLE.taxi })
    expect(rows[0].carrier?.txids).toEqual(lineage.txids)
    expect(rows[0].carrierMembers).toEqual([
      // funding is this wallet's own outgoing leg
      { txid: FUNDING_TXID, type: 'sent' },
      { txid: FILL_TXID, type: 'received' },
      { txid: CLAIM_TXID, type: 'received' },
      { txid: RECOVERY_TXID, type: 'received' },
    ])
    // one economic activity
    expect(rows[0].assetSwap).toMatchObject({ fromAmount: BigInt(10_000), toAmount: BigInt(200) })
    expect(groups).toHaveLength(1)
    expect(groups[0].txs).toHaveLength(4)
    expect(groups[0].amount).toBe(amountOf(history))
  })

  it('keeps the original swap identity and the member raw txs when only the couple is in history', async () => {
    const record = funded()
    const group = activity('swap:swap-1', [arkTx(FUNDING_TXID), arkTx(FILL_TXID)], swapIntent('swap-1'))
    group.intent!.metadata!.carrier = RECYCLE

    const rows = activitiesToTxs([group], { ...empty, swaps: [record] })

    expect(rows).toHaveLength(1)
    expect(rows[0].historyKey).toBe('swap:swap-1')
    expect(rows[0].assetSwap?.fundingTxid).toBe(FUNDING_TXID)
    expect(rows[0].carrier).toEqual(RECYCLE)
    expect(rows[0].carrierMembers).toEqual([
      { txid: FUNDING_TXID, type: 'received' },
      { txid: FILL_TXID, type: 'received' },
      { txid: CLAIM_TXID, type: 'related' },
      { txid: RECOVERY_TXID, type: 'related' },
    ])
  })

  it('retains verified carrier txids that are absent from wallet history', () => {
    const record = withCarrier(swap({ fundingTxid: FUNDING_TXID }), {
      ...RECYCLE,
      txids: [FUNDING_TXID, CLAIM_TXID],
    })
    const group = activity('swap:swap-1', [arkTx(FUNDING_TXID)], swapIntent('swap-1'))

    const [row] = activitiesToTxs([group], { ...empty, swaps: [record] })

    expect(row.carrierMembers).toEqual([
      { txid: FUNDING_TXID, type: 'received' },
      { txid: CLAIM_TXID, type: 'related' },
    ])
  })

  it('survives a JSON round trip, the way the record store hands it back', () => {
    const record = withCarrier(funded(), JSON.parse(JSON.stringify(RECYCLE)))
    const group = activity('swap:swap-1', [arkTx(FUNDING_TXID)], swapIntent('swap-1'))
    group.intent!.metadata!.carrier = JSON.parse(JSON.stringify(RECYCLE))

    const [row] = activitiesToTxs([group], { ...empty, swaps: [record] })

    expect(row.carrier).toEqual(RECYCLE)
  })

  it('ignores malformed metadata and still renders the original swap', () => {
    // broken equations, and a state that is not a state
    const corrupt = withCarrier(funded(), { ...RECYCLE, loanSats: '328' })
    const group = activity('swap:swap-1', [arkTx(FUNDING_TXID), arkTx(FILL_TXID)], swapIntent('swap-1'))
    group.intent!.metadata!.carrier = { ...RECYCLE, state: 'nonsense' }

    const rows = activitiesToTxs([group], { ...empty, swaps: [corrupt as WalletAssetSwap] })

    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('swap')
    expect(rows[0].historyKey).toBe('swap:swap-1')
    expect(rows[0].carrier).toBeUndefined()
  })

  it('still collapses the swap when there is no carrier at all', () => {
    const record = filled()

    const rows = activitiesToTxs(
      [activity('swap:swap-1', [arkTx(FUNDING_TXID), arkTx(FILL_TXID)], swapIntent('swap-1'))],
      { ...empty, swaps: [record] },
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].carrier).toBeUndefined()
    expect(rows[0].carrierMembers).toBeUndefined()
  })

  it('ignores a forged group carrier when the matching asset-swap record has none', () => {
    const record = filled()
    const group = activity('swap:swap-1', [arkTx(FUNDING_TXID), arkTx(FILL_TXID)], swapIntent('swap-1'))
    group.intent!.metadata!.carrier = RECYCLE

    const [row] = activitiesToTxs([group], { ...empty, swaps: [record] })

    expect(row.carrier).toBeUndefined()
    expect(row.assetSwap).toMatchObject({ fromAmount: BigInt(10_000), toAmount: BigInt(992) })
  })

  it('types stored carrier and evidence JSON as unread, so only their readers can open it', () => {
    expectTypeOf<WalletAssetSwap['carrier']>().toEqualTypeOf<unknown>()
    expectTypeOf<WalletAssetSwap['activityEvidence']>().toEqualTypeOf<unknown>()
  })

  it('shows a direct solver purchase as bought, with no Taxi lineage', () => {
    const record = withCarrier(swap({ fundingTxid: FUNDING_TXID }), PURCHASE)
    const group = activity('swap:swap-1', [arkTx(FUNDING_TXID), arkTx(FILL_TXID)], swapIntent('swap-1'))
    group.intent!.metadata!.carrier = PURCHASE

    const [row] = activitiesToTxs([group], { ...empty, swaps: [record] })

    expect(row.carrier).toMatchObject({ mode: 'purchase', purchasedSats: '330' })
    expect(row.carrier?.taxi).toBeUndefined()
  })

  it('uses the matching Lightning-send record instead of forged group metadata', () => {
    const rfqId = 'a'.repeat(64)
    const intent = {
      kind: 'swap',
      label: 'Lightning send',
      outcome: 'pending',
      metadata: { rfqId, swapKind: 'lightning_send', carrier: PURCHASE },
    } as Activity['intent']
    const funding = arkTx(FUNDING_TXID, {
      type: 'SENT' as ArkTransaction['type'],
      amount: 1_030,
      createdAt: at(0),
    })
    const group = { ...activity(`swap:${rfqId}`, [funding], intent), amount: -1_030 }

    const [row] = activitiesToTxs([group], {
      ...empty,
      lnSends: [
        {
          rfqId,
          fundingTxid: FUNDING_TXID,
          state: 'pending',
          carrier: JSON.parse(JSON.stringify(RECYCLE)),
          amount: 1_030,
          createdAt: at(0),
        },
      ],
    })

    expect(row.lnSwap?.label).toBe('Lightning send')
    expect(row.carrier).toEqual(RECYCLE)
  })

  it('uses a persisted Lightning-receive carrier and ignores a mismatched group copy', () => {
    const rfqId = 'c'.repeat(64)
    const intent = {
      kind: 'swap',
      label: 'Lightning receive',
      outcome: 'settled',
      metadata: { rfqId, swapKind: 'lightning_receive', carrier: PURCHASE },
    } as Activity['intent']
    const claim = arkTx(CLAIM_TXID, { amount: 10_000, createdAt: at(0) })
    const group = { ...activity(`swap:${rfqId}`, [claim], intent), amount: 10_000 }

    const [row] = activitiesToTxs([group], {
      ...empty,
      rfqCarriers: new Map([[rfqId, JSON.parse(JSON.stringify(RECYCLE))]]),
    })

    expect(row.lnSwap?.label).toBe('Lightning receive')
    expect(row.carrier).toEqual(RECYCLE)
  })

  it('keeps Lightning-receive carrier txids that the group does not hold', () => {
    const rfqId = 'e'.repeat(64)
    const intent = {
      kind: 'swap',
      label: 'Lightning receive',
      outcome: 'settled',
      metadata: { rfqId, swapKind: 'lightning_receive' },
    } as Activity['intent']
    const claim = arkTx(CLAIM_TXID, { amount: 10_000, createdAt: at(0) })
    const group = { ...activity(`swap:${rfqId}`, [claim], intent), amount: 10_000 }

    const [row] = activitiesToTxs([group], { ...empty, rfqCarriers: new Map([[rfqId, RECYCLE]]) })

    expect(row.carrierMembers).toEqual([
      { txid: CLAIM_TXID, type: 'received' },
      { txid: RECOVERY_TXID, type: 'related' },
    ])
  })

  it('does not rescue a malformed persisted RFQ carrier from valid group metadata', () => {
    const rfqId = 'c'.repeat(64)
    const intent = {
      kind: 'swap',
      label: 'Lightning receive',
      outcome: 'settled',
      metadata: { rfqId, swapKind: 'lightning_receive', carrier: RECYCLE },
    } as Activity['intent']
    const claim = arkTx(CLAIM_TXID, { amount: 10_000, createdAt: at(0) })
    const group = { ...activity(`swap:${rfqId}`, [claim], intent), amount: 10_000 }

    const [row] = activitiesToTxs([group], {
      ...empty,
      rfqCarriers: new Map([[rfqId, { ...RECYCLE, loanSats: '0' }]]),
    })

    expect(row.lnSwap?.label).toBe('Lightning receive')
    expect(row.carrier).toBeUndefined()
  })

  it('ignores group-only carrier metadata on RFQ and plain-transfer fallbacks', () => {
    const rfqId = 'd'.repeat(64)
    const rfqIntent = {
      kind: 'swap',
      label: 'Onchain send',
      outcome: 'settled',
      metadata: { rfqId, swapKind: 'onchain_send', carrier: RECYCLE },
    } as Activity['intent']
    const plainIntent = {
      kind: 'send',
      label: 'Send',
      metadata: { carrier: RECYCLE },
    } as Activity['intent']

    const rows = activitiesToTxs(
      [activity(`swap:${rfqId}`, [arkTx(FUNDING_TXID)], rfqIntent), activity('plain', [arkTx(FILL_TXID)], plainIntent)],
      empty,
    )

    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.carrier === undefined)).toBe(true)
  })

  it('drops a persisted descriptor it cannot read rather than taking the group copy', () => {
    // the record is authoritative and is NOT rescued by the group's copy
    const corrupt = withCarrier(funded(), { ...RECYCLE, loanSats: '0' })
    const group = activity('swap:swap-1', [arkTx(FUNDING_TXID)], swapIntent('swap-1'))
    group.intent!.metadata!.carrier = RECYCLE

    const [row] = activitiesToTxs([group], { ...empty, swaps: [corrupt] })

    expect(row.type).toBe('swap')
    expect(row.carrier).toBeUndefined()
  })

  it('groups a recovery into the same swap without inventing a second row', async () => {
    const base = { ...funded(), spentTxid: FILL_TXID }
    const history = [
      arkTx(FUNDING_TXID, { type: 'SENT' as ArkTransaction['type'], amount: -10_000, createdAt: at(0) }),
      arkTx(FILL_TXID, { amount: 10_000, assets: [{ assetId: base.toAsset, amount: BigInt(200) }], createdAt: at(1) }),
      arkTx(RECOVERY_TXID, { amount: 0, createdAt: at(2) }),
    ]
    const lineage = { ...RECYCLE, txids: [RECOVERY_TXID] }
    const record = { ...base, carrier: lineage }
    const group = activity('swap:swap-1', history, {
      kind: ASSET_SWAP_ACTIVITY_KIND,
      label: 'Swap',
      metadata: { swapId: 'swap-1', carrier: lineage },
    })

    const groups = await historyOf(history, [record])
    // recovery joins the SAME activity the resolver already grouped
    const rows = activitiesToTxs([group], { ...empty, swaps: [record] })

    // every member txid is in the one group
    expect(groups.flatMap((group) => group.txs.map((tx) => txidOfArkTransaction(tx)))).toEqual([
      FUNDING_TXID,
      FILL_TXID,
      RECOVERY_TXID,
    ])
    expect(groups).toHaveLength(1)
    expect(rows.map((row) => row.historyKey)).toEqual(['swap:swap-1'])
  })
})
