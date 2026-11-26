// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { Transaction, type ArkadeReader, type Outpoint } from '@arkade-os/sdk'
import { base64, hex } from '@scure/base'
import { isFinalizedTaxiClaimConflict } from '../../lib/taxiClaimConflict'

const originalClaim = { txid: '11'.repeat(32), vout: 0 }
const held = [{ txid: '22'.repeat(32), vout: 1 }]
const foreign = { txid: '33'.repeat(32), vout: 2 }
const script = hex.decode(`5120${'44'.repeat(32)}`)
const encode = (tx: Transaction) => base64.encode(tx.toPSBT())
const key = ({ txid, vout }: Outpoint) => `${txid}:${vout}`
type Coin = Outpoint & {
  isSpent?: boolean
  spentBy?: string
  arkTxId?: string
  script?: string
  value?: number
  isPreconfirmed?: boolean
}

const setup = (funding = foreign, spentClaim = originalClaim, checkpointVout = 0) => {
  const checkpoints = [spentClaim, funding].map((input) => {
    const tx = new Transaction({ allowUnknownInputs: true, allowUnknownOutputs: true })
    tx.addInput({ txid: input.txid, index: input.vout, witnessUtxo: { script, amount: 1000n } })
    tx.addOutput({ script, amount: 1000n })
    return tx
  })
  const final = new Transaction({ allowUnknownInputs: true, allowUnknownOutputs: true })
  for (const tx of checkpoints)
    final.addInput({ txid: tx.id, index: checkpointVout, witnessUtxo: { script, amount: 1000n } })
  final.addOutput({ script, amount: 2000n })
  const transactions = new Map([final, ...checkpoints].map((tx) => [tx.id, encode(tx)]))
  const coins = new Map<string, Coin>([
    [key(originalClaim), { ...originalClaim, isSpent: true, spentBy: checkpoints[0].id, arkTxId: final.id }],
    [
      key({ txid: final.id, vout: 0 }),
      { txid: final.id, vout: 0, script: hex.encode(script), value: 2000, isPreconfirmed: true },
    ],
  ])
  const getVtxos = vi.fn(async ({ outpoints }: { outpoints: Outpoint[] }) => ({
    vtxos: outpoints.flatMap((outpoint) => (coins.has(key(outpoint)) ? [coins.get(key(outpoint))!] : [])),
  }))
  const getVirtualTxs = vi.fn(async (ids: string[]) => ({
    txs: ids.flatMap((id) => (transactions.has(id) ? [transactions.get(id)!] : [])),
  }))
  const reader = { getVtxos, getVirtualTxs } as unknown as ArkadeReader
  return { reader, coins, transactions, checkpoints, final, getVtxos, getVirtualTxs }
}

describe('finalized Taxi claim conflicts', () => {
  it('proves a different finalized spend while its indexed output is preconfirmed', async () => {
    const { reader, getVirtualTxs, checkpoints } = setup()
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(true)
    expect(getVirtualTxs).toHaveBeenLastCalledWith(checkpoints.map((tx) => tx.id))
  })

  it('keeps an accepted spend held until its final output is indexed', async () => {
    const { reader, coins, final } = setup()
    coins.delete(key({ txid: final.id, vout: 0 }))
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(false)
  })

  it('checks every checkpoint for an input held by the wallet', async () => {
    const { reader } = setup(held[0])
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(false)
  })

  it('requires the exact original claim input', async () => {
    const { reader } = setup(foreign, { ...originalClaim, vout: 1 })
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(false)
  })

  it('requires the final transaction to spend checkpoint output zero', async () => {
    const { reader } = setup(foreign, originalClaim, 1)
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(false)
  })

  it('retains the hold when one of the final transaction checkpoints is missing', async () => {
    const { reader, transactions, checkpoints } = setup()
    transactions.delete(checkpoints[1].id)
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(false)
  })

  it('requires every served transaction to hash to its requested id', async () => {
    const { reader, transactions, checkpoints, final } = setup()
    transactions.set(final.id, encode(checkpoints[0]))
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(false)
  })

  it('requires the claim to be indexed as spent', async () => {
    const { reader, coins } = setup()
    coins.delete(key(originalClaim))
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(false)
  })

  it.each(['script', 'value'] as const)('requires the exact finalized output %s', async (field) => {
    const { reader, coins, final } = setup()
    const outpoint = key({ txid: final.id, vout: 0 })
    coins.set(outpoint, { ...coins.get(outpoint)!, [field]: field === 'script' ? `5120${'55'.repeat(32)}` : 1999 })
    expect(await isFinalizedTaxiClaimConflict(reader, originalClaim, held)).toBe(false)
  })

  it('propagates a provider outage so recovery retains its hold', async () => {
    const { reader, getVtxos } = setup()
    getVtxos.mockRejectedValueOnce(new Error('indexer unavailable'))
    await expect(isFinalizedTaxiClaimConflict(reader, originalClaim, held)).rejects.toThrow('indexer unavailable')
  })
})
