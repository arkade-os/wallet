import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getTxStatus } = vi.hoisted(() => ({ getTxStatus: vi.fn() }))

// Keep the real SDK — `ESPLORA_URL` is read for the network fallback — and only
// stand in for the provider, so the test controls what the chain says.
vi.mock('@arkade-os/sdk', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    EsploraProvider: class {
      constructor(public baseUrl: string) {}
      getTxStatus = getTxStatus
    },
  }
})

import { resolveExits, subtractExitedAssets } from '../../lib/exitHistory'
import { readAllTransactionActivityMetadata, saveTransactionActivityMetadata } from '../../lib/storage'
import type { Vtxo } from '../../lib/types'

beforeEach(() => {
  localStorage.clear()
  getTxStatus.mockReset()
})

const RECEIVED_MS = 1_700_000_000_000
const RECEIVED_SECONDS = 1_700_000_000
const EXITED_SECONDS = 1_700_090_000

const vtxo = (over: Partial<Vtxo> = {}): Vtxo =>
  ({
    txid: 'exit-txid',
    vout: 0,
    value: 5_000,
    isUnrolled: true,
    createdAt: new Date(RECEIVED_MS),
    ...over,
  }) as unknown as Vtxo

const confirmed = (blockTime: number) => ({ confirmed: true, blockTime, blockHeight: 100 })

describe('resolveExits', () => {
  it('dates the exit by its onchain confirmation and persists it', async () => {
    getTxStatus.mockResolvedValue(confirmed(EXITED_SECONDS))

    const [record] = await resolveExits([vtxo()], 'mutinynet')

    expect(record).toEqual({ txid: 'exit-txid', vout: 0, value: 5_000, exitedAt: EXITED_SECONDS })
    expect(readAllTransactionActivityMetadata()['exit-txid'].exitedAt).toBe(EXITED_SECONDS)
  })

  it('reuses a persisted time without asking the chain again', async () => {
    saveTransactionActivityMetadata('exit-txid', { exitedAt: EXITED_SECONDS })

    const [record] = await resolveExits([vtxo()], 'mutinynet')

    expect(record.exitedAt).toBe(EXITED_SECONDS)
    expect(getTxStatus).not.toHaveBeenCalled()
  })

  it('looks up once per exit transaction, not once per coin', async () => {
    getTxStatus.mockResolvedValue(confirmed(EXITED_SECONDS))

    const records = await resolveExits([vtxo({ vout: 0 }), vtxo({ vout: 1 })], 'mutinynet')

    expect(records.map((r) => r.exitedAt)).toEqual([EXITED_SECONDS, EXITED_SECONDS])
    expect(getTxStatus).toHaveBeenCalledTimes(1)
  })

  it('retries an unconfirmed exit rather than persisting a wrong answer', async () => {
    getTxStatus.mockResolvedValue({ confirmed: false })

    const [record] = await resolveExits([vtxo()], 'mutinynet')

    expect(record.exitedAt).toBe(RECEIVED_SECONDS)
    expect(readAllTransactionActivityMetadata()['exit-txid']).toBeUndefined()
  })

  it('falls back without persisting when the lookup throws, and does not reject', async () => {
    getTxStatus.mockRejectedValue(new Error('esplora down'))

    const [record] = await resolveExits([vtxo()], 'mutinynet')

    expect(record.exitedAt).toBe(RECEIVED_SECONDS)
    expect(readAllTransactionActivityMetadata()['exit-txid']).toBeUndefined()
  })

  it('asks nobody when no explorer can be named for the network', async () => {
    const [record] = await resolveExits([vtxo()], 'not-a-network')

    expect(record.exitedAt).toBe(RECEIVED_SECONDS)
    expect(getTxStatus).not.toHaveBeenCalled()
  })

  it('names an explorer on mainnet, where the app table has no api entry', async () => {
    getTxStatus.mockResolvedValue(confirmed(EXITED_SECONDS))

    const [record] = await resolveExits([vtxo()], 'bitcoin')

    expect(record.exitedAt).toBe(EXITED_SECONDS)
  })

  it('reads a createdAt that came back from storage as an ISO string', async () => {
    getTxStatus.mockResolvedValue({ confirmed: false })

    const [record] = await resolveExits([vtxo({ createdAt: new Date(RECEIVED_MS).toISOString() as any })], 'mutinynet')

    expect(record.exitedAt).toBe(RECEIVED_SECONDS)
  })

  it('does nothing at all when nothing has been exited', async () => {
    expect(await resolveExits([], 'mutinynet')).toEqual([])
    expect(getTxStatus).not.toHaveBeenCalled()
  })
})

describe('subtractExitedAssets', () => {
  const asset = (assetId: string, amount: bigint) => ({ assetId, amount })

  it('takes the exited amount off the owned figure', () => {
    const exited = vtxo({ assets: [asset('usdt', BigInt(400))] } as Partial<Vtxo>)

    expect(subtractExitedAssets([asset('usdt', BigInt(1_000))], [exited])).toEqual([asset('usdt', BigInt(600))])
  })

  it('drops an asset the wallet only held on an exited coin', () => {
    const exited = vtxo({ assets: [asset('usdt', BigInt(1_000))] } as Partial<Vtxo>)

    expect(subtractExitedAssets([asset('usdt', BigInt(1_000))], [exited])).toEqual([])
  })

  it('sums several exited coins carrying the same asset', () => {
    const exits = [
      vtxo({ vout: 0, assets: [asset('usdt', BigInt(300))] } as Partial<Vtxo>),
      vtxo({ vout: 1, assets: [asset('usdt', BigInt(200))] } as Partial<Vtxo>),
    ]

    expect(subtractExitedAssets([asset('usdt', BigInt(1_000))], exits)).toEqual([asset('usdt', BigInt(500))])
  })

  it('clamps rather than reporting a negative balance', () => {
    const exited = vtxo({ assets: [asset('usdt', BigInt(9_000))] } as Partial<Vtxo>)

    expect(subtractExitedAssets([asset('usdt', BigInt(1_000))], [exited])).toEqual([])
  })

  it('leaves assets alone when nothing has been exited, and when exits carry none', () => {
    const assets = [asset('usdt', BigInt(1_000))]

    expect(subtractExitedAssets(assets, [])).toBe(assets)
    expect(subtractExitedAssets(assets, [vtxo()])).toBe(assets)
  })
})
