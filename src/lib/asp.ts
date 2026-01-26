import {
  IWallet,
  ArkNote,
  RestArkProvider,
  ExtendedCoin,
  ServiceWorkerWallet,
  ExtendedVirtualCoin,
  FeeInfo,
} from '@arkade-os/sdk'
import { Addresses, Satoshis, Tx, Vtxo } from './types'
import { AspInfo } from '../providers/asp'
import { consoleError } from './logs'
import { getConfirmedAndNotExpiredUtxos } from './utxo'
import { getExpiringAndRecoverableVtxos } from './vtxo'
import * as Sentry from '@sentry/react'

const emptyFees: FeeInfo = {
  intentFee: { offchainInput: '', offchainOutput: '', onchainInput: '', onchainOutput: '' },
  txFeeRate: '',
}

export const emptyAspInfo: AspInfo = {
  boardingExitDelay: BigInt(0),
  checkpointTapscript: '',
  deprecatedSigners: [],
  digest: '',
  dust: BigInt(0),
  forfeitAddress: '',
  forfeitPubkey: '',
  fees: emptyFees,
  network: '',
  scheduledSession: {
    nextStartTime: BigInt(0),
    nextEndTime: BigInt(0),
    duration: BigInt(0),
    period: BigInt(0),
    fees: emptyFees,
  },
  serviceStatus: {},
  sessionDuration: BigInt(0),
  signerPubkey: '',
  unilateralExitDelay: BigInt(0),
  utxoMaxAmount: BigInt(-1), // -1 means no limit (default), 0 means boarding not allowed
  utxoMinAmount: BigInt(333),
  version: '',
  vtxoMaxAmount: BigInt(-1), // -1 means no limit (default)
  vtxoMinAmount: BigInt(1),
  unreachable: false,
  url: '',
}

export const collaborativeExit = async (wallet: IWallet, amount: number, address: string): Promise<string> => {
  const vtxos = await wallet.getVtxos()
  const selectedVtxos = []
  let selectedAmount = 0

  for (const vtxo of vtxos) {
    if (selectedAmount >= amount) break
    selectedVtxos.push(vtxo)
    selectedAmount += vtxo.value
  }

  if (selectedAmount < amount) throw new Error('Insufficient funds')

  const outputs = [{ address, amount: BigInt(amount) }]

  const changeAmount = selectedAmount - amount

  if (changeAmount > 0) {
    const { offchainAddr } = await getReceivingAddresses(wallet)
    outputs.push({ address: offchainAddr, amount: BigInt(changeAmount) })
  }

  try {
    return await wallet.settle({ inputs: selectedVtxos, outputs })
  } catch (error) {
    await captureSettleError(error, wallet, 'collaborativeExit', {
      amount,
      address,
      selectedAmount,
      changeAmount,
      selectedVtxos: serializeForSentry(selectedVtxos),
    })
    throw error
  }
}

export const collaborativeExitWithFees = async (
  wallet: IWallet,
  inputAmount: number,
  outputAmount: number,
  address: string,
): Promise<string> => {
  const vtxos = await wallet.getVtxos()
  const selectedVtxos = []
  let selectedAmount = 0

  // sort vtxos by batch expiry ascending
  const vtxosSorted = vtxos.sort((a, b) => (a.virtualStatus.batchExpiry ?? 0) - (b.virtualStatus.batchExpiry ?? 0))

  for (const vtxo of vtxosSorted) {
    if (selectedAmount >= inputAmount) break
    selectedVtxos.push(vtxo)
    selectedAmount += vtxo.value
  }

  if (selectedAmount < inputAmount) throw new Error('Insufficient funds')

  const outputs = [{ address, amount: BigInt(outputAmount) }]

  const changeAmount = selectedAmount - inputAmount

  if (changeAmount > 0) {
    const { offchainAddr } = await getReceivingAddresses(wallet)
    outputs.push({ address: offchainAddr, amount: BigInt(changeAmount) })
  }

  try {
    return await wallet.settle({ inputs: selectedVtxos, outputs })
  } catch (error) {
    await captureSettleError(error, wallet, 'collaborativeExitWithFees', {
      inputAmount,
      outputAmount,
      address,
      selectedAmount,
      changeAmount,
      selectedVtxos: serializeForSentry(selectedVtxos),
    })
    throw error
  }
}

export const getAspInfo = async (url: string): Promise<AspInfo> => {
  let fullUrl = url
  if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) fullUrl = 'http://' + url
  else if (!url.startsWith('http')) fullUrl = 'https://' + url
  const provider = new RestArkProvider(fullUrl)
  try {
    const infos = await provider.getInfo()
    return { ...infos, unreachable: false, url }
  } catch (err) {
    consoleError(err, 'error getting asp info')
    return { ...emptyAspInfo, unreachable: true, url }
  }
}

export const getBalance = async (wallet: IWallet): Promise<Satoshis> => {
  const balance = await wallet.getBalance()
  const { total } = balance
  return total
}

export const getTxHistory = async (wallet: IWallet): Promise<Tx[]> => {
  const txs: Tx[] = []
  try {
    const res = await wallet.getTransactionHistory()
    if (!res) return []
    for (const tx of res) {
      const date = new Date(tx.createdAt)
      const unix = Math.floor(date.getTime() / 1000)
      const { key, settled, type, amount } = tx
      const explorable = key.boardingTxid ? key.boardingTxid : key.commitmentTxid ? key.commitmentTxid : undefined
      txs.push({
        amount: Math.abs(amount),
        boardingTxid: key.boardingTxid,
        redeemTxid: key.arkTxid,
        roundTxid: key.commitmentTxid,
        createdAt: unix,
        explorable,
        preconfirmed: !settled,
        settled: type === 'SENT' ? true : settled, // show all sent tx as settled
        type: type.toLowerCase(),
      })
    }
  } catch (err) {
    consoleError(err, 'error getting tx history')
    return []
  }
  // sort by date, if have same date, put 'received' txs first
  txs.sort((a, b) => {
    if (a.createdAt === b.createdAt) return a.type === 'sent' ? -1 : 1
    if (b.createdAt === 0) return 1 // tx with no date go to the top
    if (a.createdAt === 0) return -1 // tx with no date go to the top
    return a.createdAt > b.createdAt ? -1 : 1
  })
  return txs
}

export const getVtxos = async (wallet: ServiceWorkerWallet): Promise<{ spendable: Vtxo[]; spent: Vtxo[] }> => {
  const vtxos = await wallet.getVtxos()
  const spendable: Vtxo[] = []
  const spent: Vtxo[] = []
  for (const vtxo of vtxos) {
    const isSpentOffchain = vtxo.spentBy && vtxo.spentBy.length > 0
    const isSettled = vtxo.settledBy && vtxo.settledBy.length > 0
    if (isSpentOffchain || isSettled) spent.push(vtxo)
    else spendable.push(vtxo)
  }
  return { spendable, spent }
}

export const getReceivingAddresses = async (wallet: IWallet): Promise<Addresses> => {
  const [offchainAddr, boardingAddr] = await Promise.all([wallet.getAddress(), wallet.getBoardingAddress()])
  return {
    boardingAddr,
    offchainAddr,
  }
}

export const redeemNotes = async (wallet: IWallet, notes: string[]): Promise<void> => {
  const inputs = notes.map((note) => ArkNote.fromString(note))
  const amount = inputs.reduce((acc, curr) => acc + BigInt(curr.value), BigInt(0))

  const { offchainAddr } = await getReceivingAddresses(wallet)

  try {
    await wallet.settle({
      inputs,
      outputs: [{ address: offchainAddr, amount }],
    })
  } catch (error) {
    await captureSettleError(error, wallet, 'redeemNotes', {
      notesCount: notes.length,
      amount: amount.toString(),
      offchainAddr,
      inputs: serializeForSentry(inputs),
    })
    throw error
  }
}

export const sendOffChain = async (wallet: IWallet, sats: number, address: string): Promise<string> => {
  return wallet.sendBitcoin({ address, amount: sats })
}

export const sendOnChain = async (wallet: IWallet, sats: number, address: string): Promise<string> => {
  return wallet.sendBitcoin({ address, amount: sats })
}

export const getInputsToSettle = async (
  wallet: IWallet,
  thresholdMs?: number,
): Promise<{ inputs: ExtendedCoin[]; vtxos: ExtendedVirtualCoin[]; boardingUtxos: ExtendedCoin[] }> => {
  const vtxos = thresholdMs ? await getExpiringAndRecoverableVtxos(wallet, thresholdMs) : []
  const boardingUtxos = await getConfirmedAndNotExpiredUtxos(wallet)
  return { inputs: [...boardingUtxos, ...vtxos], vtxos, boardingUtxos }
}

export const settleVtxos = async (wallet: IWallet, dustAmount: bigint, thresholdMs?: number): Promise<void> => {
  return // TODO: temporary disable, settlement are done by the delegator service
  const { inputs } = await getInputsToSettle(wallet, thresholdMs)

  if (inputs.length === 0) throw new Error('No UTXOs or VTXOs eligible to settle')

  const amount = inputs.reduce((sum, input) => sum + input.value, 0)

  if (amount < Number(dustAmount)) throw new Error('Total amount is below dust threshold')

  const outputs = [
    {
      address: await wallet.getAddress(),
      amount: BigInt(amount),
    },
  ]

  try {
    await wallet.settle({ inputs, outputs }, console.log)
  } catch (error) {
    await captureSettleError(error, wallet, 'settleVtxos', {
      amount: amount.toString(),
      dustAmount: dustAmount.toString(),
      thresholdMs,
      inputs: serializeForSentry(inputs),
    })
    throw error
  }
}

export const renewCoins = async (wallet: IWallet, dustAmount: bigint, thresholdMs?: number): Promise<void> => {
  const { inputs } = await getInputsToSettle(wallet, thresholdMs)
  if (inputs.length > 0) await settleVtxos(wallet, dustAmount, thresholdMs)
}

const serializeForSentry = (value: any): string => {
  return JSON.stringify(value, (key, val) => (typeof val === 'bigint' ? val.toString() : val))
}

const captureSettleError = async (
  error: unknown,
  wallet: IWallet,
  functionName: string,
  baseContext: Record<string, any>,
): Promise<void> => {
  const settleContext: Record<string, any> = { ...baseContext }
  try {
    settleContext.walletAddress = await wallet.getAddress()
  } catch {
    // Ignore if getAddress fails
  }
  Sentry.captureException(error, {
    tags: { function: functionName },
    contexts: { settle: settleContext },
  })
  throw error
}
