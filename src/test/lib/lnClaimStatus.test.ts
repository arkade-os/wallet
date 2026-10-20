// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { base64, hex } from '@scure/base'
import { sha256 } from '@noble/hashes/sha2.js'
import { Script } from '@scure/btc-signer'
import {
  CLTVMultisigTapscript,
  CSVMultisigTapscript,
  ConditionMultisigTapscript,
  ConditionWitness,
  MultisigTapscript,
  Transaction,
  setArkPsbtField,
} from '@arkade-os/sdk'
import { readLockupFate } from '@arkade-os/swap/protocol'

const pubkeys = [hex.decode('22'.repeat(32))]
const claimLeaf = (paymentHash: string) =>
  ConditionMultisigTapscript.encode({
    conditionScript: Script.encode(['SHA256', hex.decode(paymentHash), 'EQUAL']),
    pubkeys,
  }).script
const checkpoint = (paymentHash: string, ...leaves: Uint8Array[]) => {
  const fundingTxid = '11'.repeat(32)
  const txs = leaves.map((leaf, index) => {
    const tx = new Transaction({ allowUnknownInputs: true, allowUnknownOutputs: true })
    tx.addInput({
      txid: fundingTxid,
      index,
      tapLeafScript: [
        [{ version: 0xc0, internalKey: hex.decode('33'.repeat(32)), merklePath: [] }, Uint8Array.from([...leaf, 0xc0])],
      ],
    })
    tx.addOutput({ script: Uint8Array.from([0x51, 0x20, ...new Uint8Array(32)]), amount: 1237n })
    return tx
  })
  const indexer: Parameters<typeof readLockupFate>[0] = {
    getVtxos: async () => ({
      vtxos: txs.map((tx, vout) => ({
        txid: fundingTxid,
        vout,
        value: 1237,
        createdAt: new Date(0),
        script: '00'.repeat(34),
        status: { confirmed: false },
        isUnrolled: false,
        isSpent: true,
        spentBy: tx.id,
        arkTxId: '44'.repeat(32),
      })),
    }),
    getVirtualTxs: async () => ({ txs: txs.map((tx) => base64.encode(tx.toPSBT())) }),
  }
  return { txs, indexer, lockup: { swapPkScript: new Uint8Array(34), paymentHash } }
}

describe('Lightning claim classification in the installed swap client', () => {
  it('waits for the condition witness before classifying the same checkpoint', async () => {
    const preimage = crypto.getRandomValues(new Uint8Array(32))
    const paymentHash = hex.encode(sha256(preimage))
    const {
      txs: [tx],
      indexer,
      lockup,
    } = checkpoint(paymentHash, claimLeaf(paymentHash))
    const checkpointTxid = tx.id

    expect(await readLockupFate(indexer, lockup)).toEqual({ fate: 'unknown' })

    setArkPsbtField(tx, 0, ConditionWitness, [preimage])
    expect(tx.id).toBe(checkpointTxid)
    expect(await readLockupFate(indexer, lockup)).toMatchObject({ fate: 'claimed', preimage })
  })

  it.each([
    { name: 'cooperative', leaf: MultisigTapscript.encode({ pubkeys }).script },
    {
      name: 'relative timelock',
      leaf: CSVMultisigTapscript.encode({ pubkeys, timelock: { type: 'blocks', value: 144n } }).script,
    },
    {
      name: 'absolute timelock',
      leaf: CLTVMultisigTapscript.encode({ pubkeys, absoluteTimelock: 1_800_000_000n }).script,
    },
  ])('recognizes a genuine $name refund', async ({ leaf }) => {
    const { indexer, lockup } = checkpoint('55'.repeat(32), leaf)
    expect(await readLockupFate(indexer, lockup)).toMatchObject({ fate: 'returned' })
  })

  it('needs refund evidence on every lockup outpoint', async () => {
    const paymentHash = '55'.repeat(32)
    const refund = MultisigTapscript.encode({ pubkeys }).script
    const { indexer, lockup } = checkpoint(paymentHash, refund, claimLeaf(paymentHash))
    expect(await readLockupFate(indexer, lockup)).toEqual({ fate: 'unknown' })
  })
})
