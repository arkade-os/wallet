import {
  IWallet,
  ArkNote,
  RestArkProvider,
  ExtendedCoin,
  ServiceWorkerWallet,
  ExtendedVirtualCoin,
  FeeInfo,
  WalletBalance,
  DelegateContractHandler,
  IVtxoManager,
  Asset,
  ArkError,
  DelegateInfo,
  toXOnlySignerHex,
} from '@arkade-os/sdk'
import { Addresses, Tx, Vtxo } from './types'
import { AspInfo } from '../providers/asp'
import { consoleError } from './logs'
import { getConfirmedAndNotExpiredUtxos } from './utxo'
import * as Sentry from '@sentry/react'
import { hex } from '@scure/base'
import { arkTransactionToTx, sortLocalTxs } from './transactionHistory'
import { walletFingerprint } from './sentry'

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
  outdated: false,
  url: '',
}

// arkd's structured error name when the client's X-Build-Version is below the
// server's configured minimum (the version guard rejects even getInfo, so the
// wallet would otherwise just see the server as unreachable).
const BUILD_VERSION_TOO_OLD = 'BUILD_VERSION_TOO_OLD'

// User-facing message for an unavailable server. Distinguishes "your client is
// too old" (actionable: update) from a generic unreachable server, falling back
// to each caller's existing wording for the non-outdated case.
export const aspErrorText = (info: AspInfo, fallback: string): string =>
  info.outdated
    ? 'Your wallet is outdated and needs to be updated to be compatible with the latest Arkade version.'
    : fallback

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

  outputs.reverse() // fix for exit with assets

  try {
    return await wallet.settle({ inputs: selectedVtxos, outputs })
  } catch (error) {
    await captureSettleError(error, wallet, 'collaborativeExit', {
      amount,
      changeAmount,
      ...summarizeInputs(selectedVtxos),
    })
    throw error
  }
}

// Compare by batch expiry ascending; VTXOs without an expiry sort last.
export const byExpiryAsc = (a: { expiresAt?: Date | null }, b: { expiresAt?: Date | null }): number =>
  (a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY) - (b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY)

export const collaborativeExitWithFees = async (
  wallet: IWallet,
  inputAmount: number,
  outputAmount: number,
  address: string,
): Promise<string> => {
  const vtxos = await wallet.getVtxos()
  const selectedVtxos = []
  let selectedAmount = 0

  // sort vtxos by batch expiry ascending; missing expiry sorts last
  const vtxosSorted = vtxos.sort(byExpiryAsc)

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

  outputs.reverse() // fix for exit with assets

  try {
    return await wallet.settle({ inputs: selectedVtxos, outputs })
  } catch (error) {
    await captureSettleError(error, wallet, 'collaborativeExitWithFees', {
      inputAmount,
      outputAmount,
      changeAmount,
      ...summarizeInputs(selectedVtxos),
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
    // A too-old client is rejected with a structured BUILD_VERSION_TOO_OLD error
    // (handleError in the SDK surfaces it as a typed ArkError). Surface it as an
    // actionable "update your wallet" state instead of a generic unreachable.
    if (err instanceof ArkError && err.name === BUILD_VERSION_TOO_OLD) {
      // Prefer structured metadata; fall back to the ">= X" in the message,
      // since arkd's guard error reaches us without populated metadata.
      const minBuildVersion =
        err.metadata?.min_version ?? err.metadata?.minVersion ?? err.message.match(/>=\s*v?([\d.]+)/)?.[1]
      return { ...emptyAspInfo, unreachable: true, outdated: true, minBuildVersion, url }
    }
    return { ...emptyAspInfo, unreachable: true, url }
  }
}

export const getBalance = async (wallet: IWallet): Promise<WalletBalance> => {
  return await wallet.getBalance()
}

/** The raw, ungrouped history. The activity list is built by
 * `activitiesToTxs` instead; this is for callers that need to find one tx by
 * txid, and it carries no local metadata. */
export const getTxHistory = async (wallet: IWallet): Promise<Tx[]> => {
  try {
    const res = await wallet.getTransactionHistory()
    if (!res) return []
    return sortLocalTxs(res.map((tx) => arkTransactionToTx(tx)))
  } catch (err) {
    consoleError(err, 'error getting tx history')
    return []
  }
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
    await captureSettleError(error, wallet, 'redeemNotes', summarizeInputs(inputs))
    throw error
  }
}

export const sendAssets = async (wallet: IWallet, address: string, assets: Asset[]): Promise<string> => {
  const recipients = [{ address, amount: 0, assets }]
  return wallet.send(recipients[0])
}

export const sendOffChain = async (wallet: IWallet, amount: number, address: string): Promise<string> => {
  return wallet.send({ address, amount })
}

export const getInputsToSettle = async (
  wallet: IWallet,
  vtxoManager: IVtxoManager,
  thresholdMs?: number,
): Promise<{ inputs: ExtendedCoin[]; vtxos: ExtendedVirtualCoin[]; boardingUtxos: ExtendedCoin[] }> => {
  const vtxos = thresholdMs ? await vtxoManager.getExpiringVtxos(thresholdMs) : []
  const boardingUtxos = await getConfirmedAndNotExpiredUtxos(wallet)
  return { inputs: [...boardingUtxos, ...vtxos], vtxos, boardingUtxos }
}

export const settleVtxos = async (
  wallet: IWallet,
  vtxoManager: IVtxoManager,
  dustAmount: bigint,
  thresholdMs?: number,
): Promise<void> => {
  const { inputs } = await getInputsToSettle(wallet, vtxoManager, thresholdMs)

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
      dustAmount: Number(dustAmount),
      thresholdMs,
      ...summarizeInputs(inputs),
    })
    throw error
  }
}

export const delegateVtxos = async (wallet: ServiceWorkerWallet): Promise<void> => {
  const cm = await wallet.getContractManager()
  const contractWithVtxos = await cm.getContractsWithVtxos({ type: 'delegate' })
  const dm = await wallet.getDelegatorManager()

  if (!dm) {
    throw new Error('Delegator manager not found')
  }

  let delegateInfo: DelegateInfo
  try {
    delegateInfo = await dm.getDelegateInfo()
  } catch (error) {
    consoleError(error, 'Error fetching delegate info')
    return
  }

  let delegateInfoPubKey: string
  try {
    delegateInfoPubKey = toXOnlySignerHex(delegateInfo.pubkey)
  } catch (error) {
    consoleError(error, 'Invalid delegate pubkey')
    return
  }

  const vtxosToDelegate = contractWithVtxos
    .filter(({ contract, vtxos }) => {
      if (vtxos.length === 0) return false
      const contractParams = DelegateContractHandler.deserializeParams(contract.params)
      const contractDelegatePubKey = hex.encode(contractParams.delegatePubKey) // x-only (32 bytes)
      return contractDelegatePubKey === delegateInfoPubKey
    })
    .flatMap((_) => _.vtxos)

  if (vtxosToDelegate.length === 0) return
  const destination = await wallet.getAddress()
  const result = await dm.delegate(vtxosToDelegate, destination)
  if (result.failed.length > 0) {
    consoleError(result.failed, 'Delegation partial failure:')
  }
}

// Settle diagnostics are limited to shape and size; inputs are never serialized.
const summarizeInputs = (inputs: { value: number }[]): { count: number; totalValue: number } => ({
  count: inputs.length,
  totalValue: inputs.reduce((sum, input) => sum + input.value, 0),
})

const captureSettleError = async (
  error: unknown,
  wallet: IWallet,
  functionName: string,
  context: Record<string, number | undefined>,
): Promise<void> => {
  const settle: Record<string, number | string | undefined> = { ...context }
  try {
    settle.wallet = walletFingerprint(await wallet.getAddress())
  } catch {
    // report without it if the address is unavailable
  }
  Sentry.captureException(error, {
    tags: { function: functionName },
    contexts: { settle },
  })
}
