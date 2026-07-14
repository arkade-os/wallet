import { describe, expect, it, vi, beforeEach } from 'vitest'

// Keep the real SDK (real DefaultVtxo scripts exercise the signer extraction)
// and only neutralize the boarding-expiry check, which needs a chain tip.
vi.mock('@arkade-os/sdk', async (importOriginal) => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    hasBoardingTxExpired: vi.fn(() => false),
  }
})

import { DefaultVtxo } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { collaborativeExit, emptyAspInfo, getInputsToSettle, settleVtxos } from '../../lib/asp'

const xOnlyKey = (fill: number) => secp256k1.getPublicKey(new Uint8Array(32).fill(fill), true).slice(1)
const userKey = xOnlyKey(1)
const activeServerKey = xOnlyKey(2)
const deprecatedServerKey = xOnlyKey(3)

const pastCutoff = BigInt(Math.floor(Date.now() / 1000) - 3600)

const aspInfo = {
  ...emptyAspInfo,
  signerPubkey: '02' + hex.encode(activeServerKey),
  deprecatedSigners: [{ pubkey: '02' + hex.encode(deprecatedServerKey), cutoffDate: pastCutoff }],
}

const makeScriptFields = (serverPubKey: Uint8Array) => {
  const script = new DefaultVtxo.Script({
    pubKey: userKey,
    serverPubKey,
    csvTimelock: { value: BigInt(144), type: 'blocks' },
  })
  return { tapTree: script.encode(), forfeitTapLeafScript: script.forfeit() }
}

const makeVtxo = (txid: string, value: number, serverPubKey: Uint8Array) =>
  ({ txid, vout: 0, value, virtualStatus: { state: 'settled' }, ...makeScriptFields(serverPubKey) }) as any

const makeBoardingUtxo = (txid: string, value: number, serverPubKey: Uint8Array) =>
  ({ txid, vout: 0, value, status: { confirmed: true }, ...makeScriptFields(serverPubKey) }) as any

const currentVtxo = makeVtxo('current-vtxo', 5000, activeServerKey)
const expiredVtxo = makeVtxo('expired-vtxo', 7000, deprecatedServerKey)
const expiredUtxo = makeBoardingUtxo('expired-utxo', 9000, deprecatedServerKey)
// swept but unspent: recoverable, so settleable even under an expired signer
const recoverableVtxo = {
  ...makeVtxo('recoverable-vtxo', 3000, deprecatedServerKey),
  virtualStatus: { state: 'swept' },
  isSpent: false,
}

const makeWallet = () =>
  ({
    getBoardingUtxos: vi.fn().mockResolvedValue([expiredUtxo]),
    getVtxos: vi.fn().mockResolvedValue([expiredVtxo, currentVtxo]),
    getAddress: vi.fn().mockResolvedValue('ark1qtest'),
    getBoardingAddress: vi.fn().mockResolvedValue('bc1ptest'),
    settle: vi.fn().mockResolvedValue('txid'),
  }) as any

const makeVtxoManager = (vtxos: any[]) => ({ getExpiringVtxos: vi.fn().mockResolvedValue(vtxos) }) as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getInputsToSettle', () => {
  it('excludes coins locked to an expired deprecated signer when aspInfo is given', async () => {
    const wallet = makeWallet()
    const vtxoManager = makeVtxoManager([currentVtxo, expiredVtxo])
    const { inputs, vtxos, boardingUtxos, excluded } = await getInputsToSettle(wallet, vtxoManager, 1000, aspInfo)
    expect(inputs).toEqual([currentVtxo])
    expect(vtxos).toEqual([currentVtxo])
    expect(boardingUtxos).toEqual([])
    expect(excluded).toEqual([expiredUtxo, expiredVtxo])
  })

  it('keeps recoverable (swept) coins under an expired signer in the batch', async () => {
    const wallet = makeWallet()
    const vtxoManager = makeVtxoManager([currentVtxo, expiredVtxo, recoverableVtxo])
    const { inputs, excluded } = await getInputsToSettle(wallet, vtxoManager, 1000, aspInfo)
    expect(inputs).toEqual([currentVtxo, recoverableVtxo])
    expect(excluded).toEqual([expiredUtxo, expiredVtxo])
  })

  it('does not filter without aspInfo (backward compatible)', async () => {
    const wallet = makeWallet()
    const vtxoManager = makeVtxoManager([currentVtxo, expiredVtxo])
    const { inputs, excluded } = await getInputsToSettle(wallet, vtxoManager, 1000)
    expect(inputs).toEqual([expiredUtxo, currentVtxo, expiredVtxo])
    expect(excluded).toEqual([])
  })

  it('does not filter deprecated signers before their cutoff', async () => {
    const wallet = makeWallet()
    const vtxoManager = makeVtxoManager([currentVtxo, expiredVtxo])
    const migratableAspInfo = {
      ...aspInfo,
      deprecatedSigners: [{ pubkey: '02' + hex.encode(deprecatedServerKey), cutoffDate: pastCutoff + BigInt(7200) }],
    }
    const { inputs, excluded } = await getInputsToSettle(wallet, vtxoManager, 1000, migratableAspInfo)
    expect(inputs).toEqual([expiredUtxo, currentVtxo, expiredVtxo])
    expect(excluded).toEqual([])
  })
})

describe('settleVtxos', () => {
  it('settles only the cosignable inputs', async () => {
    const wallet = makeWallet()
    const vtxoManager = makeVtxoManager([currentVtxo, expiredVtxo])
    await settleVtxos(wallet, vtxoManager, BigInt(1000), 1000, aspInfo)
    expect(wallet.settle).toHaveBeenCalledTimes(1)
    expect(wallet.settle).toHaveBeenCalledWith(
      { inputs: [currentVtxo], outputs: [{ address: 'ark1qtest', amount: BigInt(5000) }] },
      expect.any(Function),
    )
  })

  it('includes recoverable expired-signer coins in the settled amount', async () => {
    const wallet = makeWallet()
    const vtxoManager = makeVtxoManager([currentVtxo, expiredVtxo, recoverableVtxo])
    await settleVtxos(wallet, vtxoManager, BigInt(1000), 1000, aspInfo)
    expect(wallet.settle).toHaveBeenCalledWith(
      { inputs: [currentVtxo, recoverableVtxo], outputs: [{ address: 'ark1qtest', amount: BigInt(8000) }] },
      expect.any(Function),
    )
  })

  it('throws a descriptive error when every coin is excluded', async () => {
    const wallet = makeWallet()
    const vtxoManager = makeVtxoManager([expiredVtxo])
    await expect(settleVtxos(wallet, vtxoManager, BigInt(1000), 1000, aspInfo)).rejects.toThrow(
      /2 eligible coin\(s\) are locked to an expired server signer/,
    )
    expect(wallet.settle).not.toHaveBeenCalled()
  })

  it('applies the dust check to the filtered amount', async () => {
    const wallet = makeWallet()
    const vtxoManager = makeVtxoManager([currentVtxo, expiredVtxo])
    await expect(settleVtxos(wallet, vtxoManager, BigInt(6000), 1000, aspInfo)).rejects.toThrow(
      'Total amount is below dust threshold',
    )
    expect(wallet.settle).not.toHaveBeenCalled()
  })
})

describe('collaborativeExit', () => {
  it('never selects coins locked to an expired deprecated signer', async () => {
    const wallet = makeWallet()
    await collaborativeExit(wallet, 5000, 'bc1pdest', aspInfo)
    expect(wallet.settle).toHaveBeenCalledWith({
      inputs: [currentVtxo],
      outputs: [{ address: 'bc1pdest', amount: BigInt(5000) }],
    })
  })

  it('explains insufficient funds caused by excluded coins', async () => {
    const wallet = makeWallet()
    await expect(collaborativeExit(wallet, 6000, 'bc1pdest', aspInfo)).rejects.toThrow(
      /1 coin\(s\) are locked to an expired server signer/,
    )
  })

  it('keeps the plain insufficient funds error without exclusions', async () => {
    const wallet = makeWallet()
    await expect(collaborativeExit(wallet, 20000, 'bc1pdest')).rejects.toThrow('Insufficient funds')
  })
})
