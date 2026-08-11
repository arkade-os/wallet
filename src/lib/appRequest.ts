import { Transaction, getNetwork, type NetworkName } from '@arkade-os/sdk'
import { hexToBytes } from '@noble/hashes/utils.js'
import { prettyNumber } from './format'

export interface ConfirmationRow {
  label: string
  value: string
}

export interface ConfirmationRequest {
  app: string
  action: string
  confirmLabel: string
  note?: string
  rows: ConfirmationRow[]
}

export const isValidSendAmount = (amount: number): boolean =>
  Number.isFinite(amount) && Number.isInteger(amount) && amount > 0

const satsLabel = (amount: number): string => `${prettyNumber(amount, 0)} ${amount === 1 ? 'sat' : 'sats'}`

export const sendConfirmation = (
  app: string,
  address: string,
  amount: number,
  offchain: boolean,
): ConfirmationRequest => ({
  app,
  action: 'Confirm payment',
  confirmLabel: 'Send',
  note: offchain ? undefined : 'This payment leaves Arkade and settles on-chain, with on-chain fees.',
  rows: [
    { label: 'Amount', value: satsLabel(amount) },
    { label: 'To', value: address },
    { label: 'Network', value: offchain ? 'Arkade' : 'Bitcoin' },
  ],
})

export interface PsbtOutput {
  address: string
  amount: number
}

export interface PsbtSummary {
  inputCount: number
  inputTotal: number
  outputs: PsbtOutput[]
  outputTotal: number
  fee: number
}

type PsbtInput = ReturnType<Transaction['getInput']>

/** Witness inputs carry the prevout directly; legacy ones reference it by index in the funding tx. */
const inputAmount = (input: PsbtInput): number | undefined => {
  const witnessAmount = input.witnessUtxo?.amount
  if (witnessAmount !== undefined) return Number(witnessAmount)

  const prevouts = input.nonWitnessUtxo?.outputs
  const index = input.index
  if (!prevouts || index === undefined || index < 0 || index >= prevouts.length) return undefined

  const amount = prevouts[index]?.amount
  return amount === undefined ? undefined : Number(amount)
}

/** Returns null when the transaction cannot be described in terms the user can act on. */
export const summarizePsbt = (psbt: string, network: NetworkName): PsbtSummary | null => {
  try {
    const tx = Transaction.fromPSBT(hexToBytes(psbt))
    if (tx.inputsLength === 0 || tx.outputsLength === 0) return null

    let inputTotal = 0
    for (let i = 0; i < tx.inputsLength; i++) {
      const amount = inputAmount(tx.getInput(i))
      if (amount === undefined) return null
      inputTotal += amount
    }

    const btcNetwork = getNetwork(network)
    const outputs: PsbtOutput[] = []
    for (let i = 0; i < tx.outputsLength; i++) {
      const address = tx.getOutputAddress(i, btcNetwork)
      const amount = tx.getOutput(i).amount
      if (!address || amount === undefined) return null
      outputs.push({ address, amount: Number(amount) })
    }

    const outputTotal = outputs.reduce((total, output) => total + output.amount, 0)
    if (outputTotal > inputTotal) return null

    return { inputCount: tx.inputsLength, inputTotal, outputs, outputTotal, fee: inputTotal - outputTotal }
  } catch {
    return null
  }
}

export const signConfirmation = (app: string, summary: PsbtSummary): ConfirmationRequest => {
  const many = summary.outputs.length > 1
  return {
    app,
    action: 'Confirm signature',
    confirmLabel: 'Sign',
    rows: [
      ...summary.outputs.map((output, index) => ({
        label: `${many ? `${index + 1}. ` : ''}Sends ${satsLabel(output.amount)} to`,
        value: output.address,
      })),
      { label: 'Network fee', value: satsLabel(summary.fee) },
      // transaction-level totals: the signer covers only the inputs it holds keys for, which is not known here
      { label: 'Input total', value: satsLabel(summary.inputTotal) },
      { label: 'Inputs in transaction', value: String(summary.inputCount) },
    ],
  }
}
