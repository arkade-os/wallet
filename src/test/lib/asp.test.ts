import { beforeEach, describe, it, expect, vi } from 'vitest'

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }))
vi.mock('@sentry/react', () => ({ captureException }))

// Keep the real SDK (so ArkError stays a real class for the instanceof check in
// getAspInfo) and only override RestArkProvider to control what getInfo throws.
vi.mock('@arkade-os/sdk', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    RestArkProvider: class {
      constructor(public url: string) {}
      async getInfo() {
        // arkd's real guard error reaches us WITHOUT metadata (empty details[]),
        // with the min only in the message — exercise that path explicitly.
        if (this.url.includes('nometa')) {
          throw new actual.ArkError(48, 'server requires build version header >= 0.9.10', 'BUILD_VERSION_TOO_OLD')
        }
        if (this.url.includes('too-old')) {
          throw new actual.ArkError(3, 'server requires build version header >= 0.9.10', 'BUILD_VERSION_TOO_OLD', {
            min_version: '0.9.10',
          })
        }
        throw new Error('network down')
      }
    },
  }
})

import { ArkNote } from '@arkade-os/sdk'
import {
  getAspInfo,
  aspErrorText,
  emptyAspInfo,
  byExpiryAsc,
  collaborativeExitWithFees,
  delegateVtxos,
  getTxHistory,
  getUnrolledVtxos,
  planCollaborativeExit,
  redeemNotes,
  settleVtxos,
} from '../../lib/asp'
import { saveTransactionActivityMetadata } from '../../lib/storage'
import { walletFingerprint } from '../../lib/sentry'
import fixtures from '../fixtures.json'

beforeEach(() => {
  localStorage.clear()
  captureException.mockClear()
})

const HOUR = 3_600_000
const DAY = 24 * HOUR
// mutinynet's offchain input program as of 2026-10-24.
const youngCoinFee = { offchainInput: "inputType == 'vtxo' && now() - birth < 86400.0 ? amount * 0.002 : 0.0" }

const aged = (txid: string, value: number, ageMs: number) => ({
  txid,
  vout: 0,
  value,
  isSwept: false,
  createdAt: new Date(Date.now() - ageMs),
  expiresAt: new Date(Date.now() + 29 * DAY),
})

const feeWallet = (settle: ReturnType<typeof vi.fn>) => ({
  settle,
  getAddress: async () => fixtures.lib.address.ark[0].address,
  getBoardingAddress: async () => fixtures.lib.address.btc[0],
})

const declaredFee = ({ inputs, outputs }: { inputs: { value: number }[]; outputs: { amount: bigint }[] }) =>
  inputs.reduce((sum, input) => sum + input.value, 0) - outputs.reduce((sum, output) => sum + Number(output.amount), 0)

describe('byExpiryAsc', () => {
  it('sorts known expiries ascending and places missing expiry last', () => {
    const items = [
      { id: 'no-expiry', expiresAt: undefined },
      { id: 'later', expiresAt: new Date(2000) },
      { id: 'null-expiry', expiresAt: null },
      { id: 'earlier', expiresAt: new Date(1000) },
    ]

    const sorted = [...items].sort(byExpiryAsc).map((i) => i.id)

    expect(sorted).toEqual(['earlier', 'later', 'no-expiry', 'null-expiry'])
  })
})

describe('aspErrorText', () => {
  it('returns the update-required message when outdated', () => {
    expect(aspErrorText({ ...emptyAspInfo, outdated: true, minBuildVersion: '0.9.10' }, 'x')).toBe(
      'Your wallet is outdated and needs to be updated to be compatible with the latest Arkade version.',
    )
  })
})

describe('getAspInfo', () => {
  it('flags outdated (not just unreachable) on BUILD_VERSION_TOO_OLD', async () => {
    const info = await getAspInfo('too-old.example.com')
    expect(info.unreachable).toBe(true)
    expect(info.outdated).toBe(true)
    expect(info.minBuildVersion).toBe('0.9.10')
  })

  it('extracts the min version from the message when metadata is absent', async () => {
    const info = await getAspInfo('nometa.example.com')
    expect(info.outdated).toBe(true)
    expect(info.minBuildVersion).toBe('0.9.10')
  })

  it('flags unreachable but not outdated on a generic failure', async () => {
    const info = await getAspInfo('down.example.com')
    expect(info.unreachable).toBe(true)
    expect(info.outdated).toBeFalsy()
  })
})

describe('settle failure reporting', () => {
  const failingWallet = {
    getAddress: async () => fixtures.lib.address.ark[0].address,
    getBoardingAddress: async () => fixtures.lib.address.btc[0],
    settle: async () => {
      throw new Error('settle failed')
    },
  }

  it('reports input count, total and a wallet fingerprint only', async () => {
    const note = new ArkNote(new Uint8Array(32).fill(7), 1000).toString()

    await expect(redeemNotes(failingWallet as any, [note])).rejects.toThrow('settle failed')

    const [, options] = captureException.mock.calls[0]
    const { settle } = options.contexts

    expect(settle).toEqual({
      count: 1,
      totalValue: 1000,
      wallet: walletFingerprint(fixtures.lib.address.ark[0].address),
    })
    expect(JSON.stringify(settle)).not.toMatch(/[0-9a-f]{20,}/i)
  })
})

describe('collaborativeExitWithFees', () => {
  const exit = async (
    wallet: unknown,
    inputAmount: number,
    outputAmount: number,
    intentFee: Record<string, string>,
    destination = fixtures.lib.address.btc[0],
  ) =>
    collaborativeExitWithFees(
      wallet as any,
      await planCollaborativeExit(wallet as any, inputAmount, intentFee),
      outputAmount,
      destination,
    )

  it('selects only coins generic spending may use, as the SDK settle path does', async () => {
    const escrowed = { txid: 'escrowed', vout: 0, value: 5_000, expiresAt: new Date(1_000) }
    const plain = { txid: 'plain', vout: 0, value: 5_000, expiresAt: new Date(2_000) }
    const getSpendableVtxos = vi.fn().mockResolvedValue([plain])
    const settle = vi.fn().mockResolvedValue('commitment-txid')
    const wallet = {
      getVtxos: async () => [escrowed, plain],
      getSpendableVtxos,
      settle,
      getAddress: async () => fixtures.lib.address.ark[0].address,
      getBoardingAddress: async () => fixtures.lib.address.btc[0],
    }

    await exit(wallet, 3_000, 2_900, {})

    expect(getSpendableVtxos).toHaveBeenCalledWith({ withRecoverable: true, genericallySpendableOnly: true })
    expect(settle.mock.calls[0][0].inputs.map((vtxo: { txid: string }) => vtxo.txid)).toEqual(['plain'])
  })

  it('fails closed when an older worker refuses the scope, without falling back to the raw read', async () => {
    const getVtxos = vi.fn().mockResolvedValue([{ txid: 'escrowed', vout: 0, value: 5_000 }])
    const settle = vi.fn()
    const refused = new Error('Service worker does not support the requested contract scope or freshness check')
    const wallet = { getVtxos, getSpendableVtxos: vi.fn().mockRejectedValue(refused), settle }

    await expect(exit(wallet, 3_000, 2_900, {})).rejects.toBe(refused)
    expect(getVtxos).not.toHaveBeenCalled()
    expect(settle).not.toHaveBeenCalled()
  })

  it('pays the intent fee arkd charges a young coin', async () => {
    const settle = vi.fn().mockResolvedValue('commitment-txid')
    const wallet = { ...feeWallet(settle), getSpendableVtxos: async () => [aged('young', 63_000, HOUR)] }
    const destination = fixtures.lib.address.btc[0]

    await exit(wallet, 61_765, 61_765, youngCoinFee, destination)

    const params = settle.mock.calls[0][0]
    expect(declaredFee(params)).toBe(126)
    expect(params.outputs.find((o: { address: string }) => o.address === destination).amount).toBe(BigInt(61_765))
  })

  it('charges a coin past the young window nothing', async () => {
    const settle = vi.fn().mockResolvedValue('commitment-txid')
    const wallet = { ...feeWallet(settle), getSpendableVtxos: async () => [aged('old', 63_000, 2 * DAY)] }

    await exit(wallet, 61_765, 61_765, youngCoinFee)

    expect(declaredFee(settle.mock.calls[0][0])).toBe(0)
  })

  it('makes the change pay its own output fee on top of the inputs', async () => {
    const wallet = { ...feeWallet(vi.fn()), getSpendableVtxos: async () => [aged('young', 63_000, HOUR)] }

    const plan = await planCollaborativeExit(wallet as any, 50_000, { ...youngCoinFee, offchainOutput: '200.0' })

    expect(plan.fee).toBe(126 + 200)
    expect(plan.change?.amount).toBe(BigInt(63_000 - 126 - 50_000 - 200))
  })

  it('prices the change at the amount it is emitted with, not before its fee', async () => {
    const wallet = { ...feeWallet(vi.fn()), getSpendableVtxos: async () => [aged('old', 60_050, 2 * DAY)] }

    // 10_050 left pays 100, but the 9_950 that would remain costs 200.
    const plan = await planCollaborativeExit(wallet as any, 50_000, {
      offchainOutput: 'amount < 10000.0 ? 200.0 : 100.0',
    })

    expect(plan.change?.amount).toBe(BigInt(9_850))
    expect(plan.fee).toBe(200)
  })

  it('spends a coin that owes no intent fee before one that expires sooner', async () => {
    const settle = vi.fn().mockResolvedValue('commitment-txid')
    const young = { ...aged('young', 63_000, HOUR), expiresAt: new Date(Date.now() + 5 * DAY) }
    const wallet = { ...feeWallet(settle), getSpendableVtxos: async () => [aged('old', 63_000, 2 * DAY), young] }

    await exit(wallet, 61_765, 61_765, youngCoinFee)

    expect(settle.mock.calls[0][0].inputs.map((vtxo: { txid: string }) => vtxo.txid)).toEqual(['old'])
  })
})

describe('settleVtxos', () => {
  it('renews net of the intent fee each input owes', async () => {
    const settle = vi.fn().mockResolvedValue(undefined)
    const wallet = { ...feeWallet(settle), getBoardingUtxos: async () => [] }
    const vtxoManager = { getExpiringVtxos: async () => [aged('young', 10_000, HOUR), aged('old', 5_000, 2 * DAY)] }

    await settleVtxos(wallet as any, vtxoManager as any, BigInt(330), DAY, youngCoinFee)

    expect(declaredFee(settle.mock.calls[0][0])).toBe(20)
  })
})

describe('delegateVtxos', () => {
  it('delegates only unspent coins, even from a worker that ignores unspentOnly', async () => {
    const delegatePubKey = 'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9'
    const params = {
      pubKey: '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      serverPubKey: 'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
      delegatePubKey,
      csvTimelock: '144',
    }
    const live = { txid: 'live', vout: 0, value: 1_000 }
    const spent = { txid: 'spent', vout: 0, value: 1_000, isSpent: true, spentBy: 'next' }
    const getContractsWithVtxos = vi.fn().mockResolvedValue([{ contract: { params }, vtxos: [live, spent] }])
    const delegate = vi.fn().mockResolvedValue({ delegated: [], failed: [] })
    const wallet = {
      getContractManager: async () => ({ getContractsWithVtxos }),
      getDelegateManager: async () => ({ getDelegateInfo: async () => ({ pubkey: delegatePubKey }), delegate }),
      getAddress: async () => fixtures.lib.address.ark[0].address,
    }

    await delegateVtxos(wallet as any)

    expect(getContractsWithVtxos).toHaveBeenCalledWith({ type: 'delegate' }, undefined, { unspentOnly: true })
    expect(delegate.mock.calls[0][0].map((vtxo: { txid: string }) => vtxo.txid)).toEqual(['live'])
  })
})

describe('getTxHistory', () => {
  it('reads the flat history without local metadata — the activity list grafts that', async () => {
    saveTransactionActivityMetadata('ark-txid', { destination: 'tark1destination', networkFee: 0 })
    const wallet = {
      getTransactionHistory: async () => [
        {
          amount: 0,
          assets: [{ assetId: 'asset-id', amount: BigInt(100) }],
          createdAt: Date.now(),
          key: { arkTxid: 'ark-txid', boardingTxid: '', commitmentTxid: '' },
          settled: true,
          type: 'SENT',
        },
      ],
    }

    const [tx] = await getTxHistory(wallet as any)

    expect(tx).toMatchObject({ redeemTxid: 'ark-txid', type: 'sent' })
    expect(tx.destination).toBeUndefined()
    expect(tx.networkFee).toBeUndefined()
  })
})

describe('getUnrolledVtxos', () => {
  const coin = (over: Record<string, unknown> = {}) => ({ txid: 'a', vout: 0, value: 1_000, isUnrolled: true, ...over })

  it('asks for the exited set and keeps only what came back exited', async () => {
    const getVtxos = vi.fn().mockResolvedValue([coin({ txid: 'exited' }), coin({ txid: 'live', isUnrolled: false })])

    const result = await getUnrolledVtxos({ getVtxos } as any)

    expect(getVtxos).toHaveBeenCalledWith({ withUnrolled: true })
    expect(result.map((vtxo) => vtxo.txid)).toEqual(['exited'])
  })

  it('drops the ancestors the unroll dragged onchain with the exited coin', async () => {
    // One exit, not three: unrolling broadcasts the whole chain, so every
    // earlier coin of ours in it comes back `isUnrolled` too, carrying the same
    // value. Their offchain spend is what says they are not the money leaving.
    const getVtxos = vi
      .fn()
      .mockResolvedValue([
        coin({ txid: 'ancestor', spentBy: 'middle' }),
        coin({ txid: 'middle', isSpent: true }),
        coin({ txid: 'renewed', settledBy: 'commitment' }),
        coin({ txid: 'exited' }),
      ])

    const result = await getUnrolledVtxos({ getVtxos } as any)

    expect(result.map((vtxo) => vtxo.txid)).toEqual(['exited'])
  })

  it('still returns an exit the user has already swept', async () => {
    // The sweep is onchain, and none of the three terminal-spend facts report
    // an onchain spend — so the row is permanent rather than one that vanishes
    // when the money is finally collected.
    const getVtxos = vi.fn().mockResolvedValue([coin({ txid: 'swept', isSwept: true })])

    expect(await getUnrolledVtxos({ getVtxos } as any)).toHaveLength(1)
  })

  it('fails the reload rather than passing off "we could not ask" as "nothing exited"', async () => {
    // An empty set is spent as fact downstream — no exit rows, no asset
    // subtraction — while the sats headline still nets out a bucket that came
    // from a call that did not fail. Throwing keeps the last good snapshot.
    const getVtxos = vi.fn().mockRejectedValue(new Error('worker unreachable'))

    await expect(getUnrolledVtxos({ getVtxos } as any)).rejects.toThrow('worker unreachable')
  })
})
