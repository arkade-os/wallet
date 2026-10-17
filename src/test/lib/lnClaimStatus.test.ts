// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { base64, hex } from '@scure/base'
import { sha256 } from '@noble/hashes/sha2.js'
import { Script } from '@scure/btc-signer'
import { ConditionMultisigTapscript, ConditionWitness, Transaction, setArkPsbtField } from '@arkade-os/sdk'
import { readLockupFate } from '@arkade-os/swap/protocol'

describe('Lightning claim classification in the installed swap client', () => {
  it('waits for the condition witness before classifying the same checkpoint', async () => {
    const preimage = crypto.getRandomValues(new Uint8Array(32))
    const paymentHash = hex.encode(sha256(preimage))
    const fundingTxid = '11'.repeat(32)
    const tx = new Transaction({ allowUnknownInputs: true, allowUnknownOutputs: true })
    const leaf = ConditionMultisigTapscript.encode({
      conditionScript: Script.encode(['SHA256', hex.decode(paymentHash), 'EQUAL']),
      pubkeys: [hex.decode('22'.repeat(32))],
    }).script
    tx.addInput({
      txid: fundingTxid,
      index: 0,
      tapLeafScript: [
        [{ version: 0xc0, internalKey: hex.decode('33'.repeat(32)), merklePath: [] }, Uint8Array.from([...leaf, 0xc0])],
      ],
    })
    tx.addOutput({ script: Uint8Array.from([0x51, 0x20, ...new Uint8Array(32)]), amount: 1237n })
    let psbt = base64.encode(tx.toPSBT())
    const checkpointTxid = tx.id
    const indexer: Parameters<typeof readLockupFate>[0] = {
      getVtxos: async () => ({
        vtxos: [
          {
            txid: fundingTxid,
            vout: 0,
            value: 1237,
            createdAt: new Date(0),
            script: '00'.repeat(34),
            status: { confirmed: false },
            isUnrolled: false,
            isSpent: true,
            spentBy: checkpointTxid,
            arkTxId: '44'.repeat(32),
          },
        ],
      }),
      getVirtualTxs: async () => ({ txs: [psbt] }),
    }
    const lockup = { swapPkScript: new Uint8Array(34), paymentHash }

    expect(await readLockupFate(indexer, lockup)).toEqual({ fate: 'unknown' })

    setArkPsbtField(tx, 0, ConditionWitness, [preimage])
    psbt = base64.encode(tx.toPSBT())
    expect(tx.id).toBe(checkpointTxid)
    expect(await readLockupFate(indexer, lockup)).toMatchObject({ fate: 'claimed', preimage })
  })
})
