import type { ArkTransaction } from '@arkade-os/sdk'
import { describe, expect, it } from 'vitest'
import {
  allocateActivityEvidence,
  parseActivityEvidence,
  readActivityEvidence,
  type ActivityEvidence,
} from '../../lib/activityEvidence'

const TX_A = 'a'.repeat(64)
const TX_B = '2'.repeat(64)
const ASSET_A = 'a1'.repeat(34)
const ASSET_B = 'b2'.repeat(34)
const MAX_UINT64 = '18446744073709551615'

const evidence = (over: Partial<ActivityEvidence> = {}): ActivityEvidence => ({
  version: 1,
  contributions: [{ txid: TX_A, direction: 'sent', sats: '0', assets: [{ assetId: ASSET_A, amount: MAX_UINT64 }] }],
  ...over,
})

const operation = (id: string, activityEvidence: unknown) => ({
  id,
  fundingTxid: TX_A,
  spentTxid: TX_B,
  fromAsset: 'btc',
  toAsset: ASSET_A,
  activityEvidence,
})

const tx = (
  txid: string,
  direction: 'SENT' | 'RECEIVED',
  amount: number,
  assets?: ArkTransaction['assets'],
): ArkTransaction => ({
  amount,
  assets,
  createdAt: 1,
  settled: true,
  type: direction as ArkTransaction['type'],
  key: { arkTxid: txid, boardingTxid: '', commitmentTxid: '' },
})

describe('activity evidence reader', () => {
  it('keeps canonical uint64 asset precision through reload and returns a detached result', () => {
    const raw = JSON.parse(JSON.stringify(evidence()))
    const parsed = parseActivityEvidence(raw)

    raw.contributions[0].assets[0].amount = '1'

    expect(parsed).toEqual(evidence())
    expect(parsed).not.toBe(raw)
    expect(parsed.contributions[0]).not.toBe(raw.contributions[0])
    expect(parsed.contributions[0].assets[0]).not.toBe(raw.contributions[0].assets[0])
  })

  it.each([
    ['unknown top-level field', { ...evidence(), extra: true }],
    [
      'unknown contribution field',
      evidence({ contributions: [{ ...evidence().contributions[0], extra: true } as never] }),
    ],
    [
      'unknown asset field',
      evidence({
        contributions: [
          { ...evidence().contributions[0], assets: [{ assetId: ASSET_A, amount: '1', extra: true } as never] },
        ],
      }),
    ],
    ['future version', { ...evidence(), version: 2 }],
    ['non-array contributions', { ...evidence(), contributions: {} }],
    ['uppercase txid', evidence({ contributions: [{ ...evidence().contributions[0], txid: TX_A.toUpperCase() }] })],
    [
      'uppercase asset id',
      evidence({
        contributions: [{ ...evidence().contributions[0], assets: [{ assetId: ASSET_A.toUpperCase(), amount: '1' }] }],
      }),
    ],
    ['noncanonical sats', evidence({ contributions: [{ ...evidence().contributions[0], sats: '00' }] })],
    ['sats above supply', evidence({ contributions: [{ ...evidence().contributions[0], sats: '2100000000000001' }] })],
    [
      'zero asset amount',
      evidence({ contributions: [{ ...evidence().contributions[0], assets: [{ assetId: ASSET_A, amount: '0' }] }] }),
    ],
    [
      'asset above uint64',
      evidence({
        contributions: [
          { ...evidence().contributions[0], assets: [{ assetId: ASSET_A, amount: '18446744073709551616' }] },
        ],
      }),
    ],
    ['duplicate member', evidence({ contributions: [evidence().contributions[0], evidence().contributions[0]] })],
    [
      'duplicate asset',
      evidence({
        contributions: [
          {
            ...evidence().contributions[0],
            assets: [
              { assetId: ASSET_A, amount: '1' },
              { assetId: ASSET_A, amount: '2' },
            ],
          },
        ],
      }),
    ],
  ])('rejects %s', (_name, raw) => {
    expect(readActivityEvidence(raw)).toBeUndefined()
    expect(() => parseActivityEvidence(raw)).toThrow()
  })
})

describe('activity evidence allocation', () => {
  const sharedEvidence = (fundingSats: string, fillSats: string, assetAmount: string): ActivityEvidence => ({
    version: 1,
    contributions: [
      { txid: TX_A, direction: 'sent', sats: fundingSats, assets: [] },
      { txid: TX_B, direction: 'received', sats: fillSats, assets: [{ assetId: ASSET_A, amount: assetAmount }] },
    ],
  })

  it('allocates two operations and leaves every sats and asset remainder once', () => {
    const funding = tx(TX_A, 'SENT', -10_000)
    const fill = tx(TX_B, 'RECEIVED', 500, [{ assetId: ASSET_A, amount: 700n }])
    const allocation = allocateActivityEvidence(
      [operation('one', sharedEvidence('3000', '100', '200')), operation('two', sharedEvidence('4000', '200', '300'))],
      [funding, fill],
    )

    expect(allocation.member(funding)).toMatchObject({ remainderSats: 3000n })
    expect(allocation.member(fill)).toMatchObject({
      remainderSats: 200n,
      remainderAssets: [{ assetId: ASSET_A, amount: 200n }],
    })
    expect(allocation.swap('one')?.funding?.sats).toBe(3000n)
    expect(allocation.swap('one')?.fill?.assets).toEqual([{ assetId: ASSET_A, amount: 200n }])
    expect(allocation.swap('two')?.fill?.assets).toEqual([{ assetId: ASSET_A, amount: 300n }])
  })

  it('supports distinct assets and asset-only zero-sat shares', () => {
    const received = tx(TX_B, 'RECEIVED', 0, [
      { assetId: ASSET_A, amount: 20n },
      { assetId: ASSET_B, amount: 30n },
    ])
    const first = operation('one', {
      version: 1,
      contributions: [{ txid: TX_B, direction: 'received', sats: '0', assets: [{ assetId: ASSET_A, amount: '20' }] }],
    })
    const second = {
      ...operation('two', {
        version: 1,
        contributions: [{ txid: TX_B, direction: 'received', sats: '0', assets: [{ assetId: ASSET_B, amount: '30' }] }],
      }),
      toAsset: ASSET_B,
    }
    const allocation = allocateActivityEvidence([first, second], [received])

    expect(allocation.member(received)).toMatchObject({ remainderSats: 0n, remainderAssets: [] })
    expect(allocation.swap('one')?.contributions[0].sats).toBe(0n)
    expect(allocation.swap('two')?.contributions[0].assets[0]).toEqual({ assetId: ASSET_B, amount: 30n })
  })

  it('makes exact record and raw replays idempotent but rejects conflicting duplicates', () => {
    const record = operation('one', sharedEvidence('3000', '0', '200'))
    const funding = tx(TX_A, 'SENT', -10_000)
    const replayed = allocateActivityEvidence([record, structuredClone(record)], [funding, { ...funding }])
    const conflict = allocateActivityEvidence([record, operation('one', sharedEvidence('4000', '0', '200'))], [funding])
    const rawConflict = allocateActivityEvidence([record], [funding, { ...funding, amount: -9000 }])

    expect(replayed.member(funding)?.allocations).toHaveLength(1)
    expect(replayed.member(funding)?.remainderSats).toBe(7000n)
    expect(conflict.swap('one')?.status).toBe('invalid')
    expect(conflict.member(funding)?.allocations).toEqual([])
    expect(rawConflict.member(funding)?.allocations).toEqual([])
  })

  it('refuses an outgoing raw asset as backing for a received share and keeps it whole', () => {
    const fill = tx(TX_B, 'RECEIVED', 500, [{ assetId: ASSET_A, amount: -700n }])
    const allocation = allocateActivityEvidence([operation('one', sharedEvidence('0', '100', '200'))], [fill])

    expect(allocation.member(fill)?.allocations).toEqual([])
    expect(allocation.swap('one')?.fill).toBeUndefined()
    expect(allocation.member(fill)).toMatchObject({
      remainderSats: 500n,
      remainderAssets: [{ assetId: ASSET_A, amount: -700n }],
    })
  })

  it.each([
    [
      'summed sats over capacity',
      [operation('one', sharedEvidence('6000', '0', '1')), operation('two', sharedEvidence('5000', '0', '1'))],
      tx(TX_A, 'SENT', -10_000),
    ],
    [
      'asset over capacity',
      [operation('one', sharedEvidence('0', '0', '701'))],
      tx(TX_B, 'RECEIVED', 500, [{ assetId: ASSET_A, amount: 700n }]),
    ],
    [
      'unsafe raw sats',
      [operation('one', sharedEvidence('1', '0', '1'))],
      tx(TX_A, 'SENT', Number.MAX_SAFE_INTEGER + 1),
    ],
    [
      'malformed raw asset',
      [operation('one', sharedEvidence('0', '0', '1'))],
      tx(TX_B, 'RECEIVED', 0, [{ assetId: ASSET_A, amount: 1 as never }]),
    ],
    [
      'an incoming raw asset backing a sent share',
      [
        operation('one', {
          version: 1,
          contributions: [{ txid: TX_A, direction: 'sent', sats: '0', assets: [{ assetId: ASSET_A, amount: '200' }] }],
        }),
      ],
      tx(TX_A, 'SENT', 0, [{ assetId: ASSET_A, amount: 700n }]),
    ],
  ])('fails %s closed', (_name, records, member) => {
    const allocation = allocateActivityEvidence(records, [member])

    expect(allocation.member(member)?.allocations).toEqual([])
  })
})
