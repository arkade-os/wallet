import { describe, expect, it } from 'vitest'
import { hex } from '@scure/base'
import { Address, Transaction } from '@scure/btc-signer'
import { getNetwork } from '@arkade-os/sdk'
import { isValidSendAmount, sendConfirmation, signConfirmation, summarizePsbt } from '../../lib/appRequest'

const network = 'regtest'
const btcNetwork = getNetwork(network)

const TXID = '11'.repeat(32)

const wpkhHash = (fill: number) => new Uint8Array(20).fill(fill)
const wpkhScript = (fill: number) => Uint8Array.from([0x00, 0x14, ...wpkhHash(fill)])
const wpkhAddress = (fill: number) => Address(btcNetwork).encode({ type: 'wpkh', hash: wpkhHash(fill) })

interface BuildOptions {
  inputs: (number | null)[]
  outputs: { script: Uint8Array; amount: number }[]
}

const buildPsbt = ({ inputs, outputs }: BuildOptions): string => {
  const tx = new Transaction({ allowUnknownOutputs: true, allowUnknownInputs: true })
  inputs.forEach((amount, index) => {
    tx.addInput({
      txid: TXID,
      index,
      ...(amount === null ? {} : { witnessUtxo: { script: wpkhScript(index + 1), amount: BigInt(amount) } }),
    })
  })
  outputs.forEach(({ script, amount }) => tx.addOutput({ script, amount: BigInt(amount) }))
  return hex.encode(tx.toPSBT())
}

// a funding transaction referenced in full, as legacy inputs must
const fundingTx = (amounts: number[]): Transaction => {
  const tx = new Transaction({ allowUnknownInputs: true })
  tx.addInput({ txid: '22'.repeat(32), index: 0 })
  amounts.forEach((amount, index) => tx.addOutput({ script: wpkhScript(index + 1), amount: BigInt(amount) }))
  return tx
}

const buildLegacyPsbt = (funding: Transaction, index: number, outputAmount: number): string => {
  const tx = new Transaction()
  tx.addInput({ txid: funding.id, index, nonWitnessUtxo: funding.toBytes(true, false) })
  tx.addOutput({ script: wpkhScript(9), amount: BigInt(outputAmount) })
  return hex.encode(tx.toPSBT())
}

describe('isValidSendAmount', () => {
  it('accepts whole positive amounts', () => {
    expect(isValidSendAmount(1)).toBe(true)
    expect(isValidSendAmount(21_000)).toBe(true)
  })

  it('rejects zero, negative, fractional and non-finite amounts', () => {
    expect(isValidSendAmount(0)).toBe(false)
    expect(isValidSendAmount(-1)).toBe(false)
    expect(isValidSendAmount(1.5)).toBe(false)
    expect(isValidSendAmount(NaN)).toBe(false)
    expect(isValidSendAmount(Infinity)).toBe(false)
  })
})

describe('summarizePsbt', () => {
  it('describes inputs, outputs and fee', () => {
    const psbt = buildPsbt({
      inputs: [6_000, 4_000],
      outputs: [
        { script: wpkhScript(7), amount: 7_500 },
        { script: wpkhScript(8), amount: 2_300 },
      ],
    })

    expect(summarizePsbt(psbt, network)).toEqual({
      inputCount: 2,
      inputTotal: 10_000,
      outputs: [
        { address: wpkhAddress(7), amount: 7_500 },
        { address: wpkhAddress(8), amount: 2_300 },
      ],
      outputTotal: 9_800,
      fee: 200,
    })
  })

  it('reads the amount of an input that references its funding transaction', () => {
    const psbt = buildLegacyPsbt(fundingTx([1_111, 6_000]), 1, 5_800)

    expect(summarizePsbt(psbt, network)).toEqual({
      inputCount: 1,
      inputTotal: 6_000,
      outputs: [{ address: wpkhAddress(9), amount: 5_800 }],
      outputTotal: 5_800,
      fee: 200,
    })
  })

  it('returns null when an input points past the outputs of its funding transaction', () => {
    const psbt = buildLegacyPsbt(fundingTx([1_111, 6_000]), 1, 5_800)
    const tx = Transaction.fromPSBT(hex.decode(psbt), { allowUnknownInputs: true })
    tx.updateInput(0, { index: 5 }, true)

    expect(summarizePsbt(hex.encode(tx.toPSBT()), network)).toBeNull()
  })

  it('returns null when an input amount is unknown', () => {
    const psbt = buildPsbt({ inputs: [6_000, null], outputs: [{ script: wpkhScript(7), amount: 5_000 }] })
    expect(summarizePsbt(psbt, network)).toBeNull()
  })

  it('returns null when an output has no representable destination', () => {
    const opReturn = Uint8Array.from([0x6a, 0x04, 0x01, 0x02, 0x03, 0x04])
    const psbt = buildPsbt({ inputs: [6_000], outputs: [{ script: opReturn, amount: 0 }] })
    expect(summarizePsbt(psbt, network)).toBeNull()
  })

  it('returns null when outputs exceed inputs', () => {
    const psbt = buildPsbt({ inputs: [1_000], outputs: [{ script: wpkhScript(7), amount: 2_000 }] })
    expect(summarizePsbt(psbt, network)).toBeNull()
  })

  it('returns null when there is nothing to describe', () => {
    expect(summarizePsbt('not hex at all', network)).toBeNull()
    expect(summarizePsbt('', network)).toBeNull()
    expect(summarizePsbt(hex.encode(new Transaction().toPSBT()), network)).toBeNull()
  })

  it('returns null when the network is not known yet', () => {
    const psbt = buildPsbt({ inputs: [6_000], outputs: [{ script: wpkhScript(7), amount: 5_000 }] })
    expect(summarizePsbt(psbt, '' as never)).toBeNull()
  })
})

describe('sendConfirmation', () => {
  it('names the Arkade route and adds no on-chain caveat', () => {
    const confirmation = sendConfirmation('Satora', 'tark1qexample', 1_000, true)
    expect(confirmation.note).toBeUndefined()
    expect(confirmation.rows).toEqual([
      { label: 'Amount', value: '1,000 sats' },
      { label: 'To', value: 'tark1qexample' },
      { label: 'Network', value: 'Arkade' },
    ])
  })

  it('names the Bitcoin route and its cost', () => {
    const confirmation = sendConfirmation('Satora', 'bcrt1qexample', 1, false)
    expect(confirmation.note).toContain('on-chain')
    expect(confirmation.rows).toEqual([
      { label: 'Amount', value: '1 sat' },
      { label: 'To', value: 'bcrt1qexample' },
      { label: 'Network', value: 'Bitcoin' },
    ])
  })
})

describe('signConfirmation', () => {
  const summary = (outputs: { address: string; amount: number }[]) => ({
    inputCount: 1,
    inputTotal: 10_000,
    outputs,
    outputTotal: outputs.reduce((total, output) => total + output.amount, 0),
    fee: 200,
  })

  it('leaves a single destination unnumbered', () => {
    const { rows } = signConfirmation('Lendasat', summary([{ address: 'bcrt1qone', amount: 9_800 }]))
    expect(rows[0]).toEqual({ label: 'Sends 9,800 sats to', value: 'bcrt1qone' })
  })

  it('numbers each destination when there is more than one', () => {
    const { rows } = signConfirmation(
      'Lendasat',
      summary([
        { address: 'bcrt1qone', amount: 5_000 },
        { address: 'bcrt1qtwo', amount: 4_800 },
      ]),
    )
    expect(rows).toEqual([
      { label: '1. Sends 5,000 sats to', value: 'bcrt1qone' },
      { label: '2. Sends 4,800 sats to', value: 'bcrt1qtwo' },
      { label: 'Network fee', value: '200 sats' },
      { label: 'Input total', value: '10,000 sats' },
      { label: 'Inputs in transaction', value: '1' },
    ])
  })
})
