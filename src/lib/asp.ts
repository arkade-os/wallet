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
  isVtxoSpent,
  ArkAddress,
  Estimator,
  IntentFeeConfig,
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
// to each caller's existing wording for the non-outdated case. `outdatedText`
// lets callers localize the update-required message; it defaults to English so
// existing callers and tests keep working unchanged.
export const aspErrorText = (info: AspInfo, fallback: string, outdatedText?: string): string =>
  info.outdated
    ? (outdatedText ??
      'Your wallet is outdated and needs to be updated to be compatible with the latest Arkade version.')
    : fallback

// Compare by batch expiry ascending; VTXOs without an expiry sort last.
export const byExpiryAsc = (a: { expiresAt?: Date | null }, b: { expiresAt?: Date | null }): number =>
  (a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY) - (b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY)

export class InsufficientFundsError extends Error {
  constructor() {
    super('Insufficient funds')
    this.name = 'InsufficientFundsError'
  }
}

/** The SDK's `toOffchainInputFeeParams`, which 0.5.0-rc.25 does not export. */
const offchainInputFee = (estimator: Estimator, vtxo: ExtendedVirtualCoin): number =>
  estimator.evalOffchainInput({
    amount: BigInt(vtxo.value),
    type: vtxo.isSwept ? 'recoverable' : 'vtxo',
    weight: 0,
    birth: vtxo.createdAt,
    expiry: vtxo.expiresAt,
  }).satoshis

const OUTPUT_FEE_ROUNDS = 8

/** The output `out` with `out + fee(out) = amount`, 0 if none is positive. arkd prices the
 *  output it receives, so a fee taken on `amount` itself can undercount (the SDK's
 *  `settleChangeAgainstFee`, which 0.5.0-rc.25 does not export). */
const outputAfterItsFee = (estimator: Estimator, address: string, amount: number): number => {
  const script = hex.encode(ArkAddress.decode(address).pkScript)
  let out = amount
  for (let round = 0; round < OUTPUT_FEE_ROUNDS; round++) {
    const next = amount - estimator.evalOffchainOutput({ amount: BigInt(Math.max(out, 0)), script }).satoshis
    if (next === out) return Math.max(out, 0)
    out = next
  }
  throw new Error(`output fee does not settle for ${amount} sats`)
}

export interface ExitPlan {
  inputs: ExtendedVirtualCoin[]
  change?: { address: string; amount: bigint }
  /** The intent fee on top of the exit output's: every input's, and the change's or a change below dust. */
  fee: number
}

/** Every coin an exit may spend that is worth more than its own intent fee. */
const exitCandidates = async (wallet: IWallet, estimator: Estimator) => {
  // The SDK's own settle selector: escrowed, gated and intent-locked coins stay out.
  const vtxos = await wallet.getSpendableVtxos({ withRecoverable: true, genericallySpendableOnly: true })
  return vtxos
    .map((vtxo) => ({ vtxo, inputFee: offchainInputFee(estimator, vtxo) }))
    .filter(({ vtxo, inputFee }) => inputFee < vtxo.value)
}

/** The most an exit can cover, which `planCollaborativeExit` then funds exactly: every
 *  coin net of its intent fee, less a change of `dust` for any assets to stay on, unless
 *  the coins without assets alone cover more. */
export const maxCollaborativeExit = async (
  wallet: IWallet,
  intentFee: IntentFeeConfig | undefined,
  dust: number,
): Promise<number> => {
  const estimator = new Estimator(intentFee ?? {})
  const candidates = await exitCandidates(wallet, estimator)
  const netOf = (coins: typeof candidates) => coins.reduce((sum, { vtxo, inputFee }) => sum + vtxo.value - inputFee, 0)
  const plain = netOf(candidates.filter(({ vtxo }) => !vtxo.assets?.length))
  const all = netOf(candidates)
  if (all === plain) return plain
  const script = hex.encode(ArkAddress.decode((await getReceivingAddresses(wallet)).offchainAddr).pkScript)
  return Math.max(plain, all - dust - estimator.evalOffchainOutput({ amount: BigInt(dust), script }).satoshis)
}

/** The coins an exit spends to cover `inputAmount` (payout plus exit fee) after
 *  each pays its own intent fee, and the change left once it pays for itself.
 *  arkd refuses a change below `dust`, so such a change joins the fee, unless
 *  assets ride along: they need a change of at least `dust` to land on. */
export const planCollaborativeExit = async (
  wallet: IWallet,
  inputAmount: number,
  intentFee: IntentFeeConfig | undefined,
  dust: number,
): Promise<ExitPlan> => {
  const estimator = new Estimator(intentFee ?? {})
  const inputs = []
  let net = 0
  let fee = 0
  let carriesAssets = false
  let changeAddress: string | undefined

  // Coins without assets first, since a coin with assets binds the change to dust. Then
  // coins that owe no intent fee, each group by batch expiry ascending (missing expiry
  // last): a young coin's inherited early expiry must not make it pay.
  const priced = (await exitCandidates(wallet, estimator)).sort(
    (a, b) =>
      Number(Boolean(a.vtxo.assets?.length)) - Number(Boolean(b.vtxo.assets?.length)) ||
      Number(a.inputFee > 0) - Number(b.inputFee > 0) ||
      byExpiryAsc(a.vtxo, b.vtxo),
  )

  for (const { vtxo, inputFee } of priced) {
    inputs.push(vtxo)
    net += vtxo.value - inputFee
    fee += inputFee
    carriesAssets ||= Boolean(vtxo.assets?.length)
    if (net < inputAmount) continue

    const left = net - inputAmount
    if (left > 0) {
      changeAddress ??= (await getReceivingAddresses(wallet)).offchainAddr
      const change = outputAfterItsFee(estimator, changeAddress, left)
      if (change > 0 && change >= dust) {
        return { inputs, fee: fee + left - change, change: { address: changeAddress, amount: BigInt(change) } }
      }
    }
    if (!carriesAssets) return { inputs, fee: fee + left }
  }

  throw new InsufficientFundsError()
}

/** Settles the plan it is given rather than planning again, so it cannot pay
 *  more than the quote that plan priced. */
export const collaborativeExitWithFees = async (
  wallet: IWallet,
  plan: ExitPlan,
  outputAmount: number,
  address: string,
): Promise<string> => {
  const { inputs: selectedVtxos, change, fee } = plan
  const changeAmount = Number(change?.amount ?? 0)

  const outputs = [{ address, amount: BigInt(outputAmount) }]
  if (change) outputs.push(change)

  outputs.reverse() // fix for exit with assets

  try {
    return await wallet.settle({ inputs: selectedVtxos, outputs })
  } catch (error) {
    await captureSettleError(error, wallet, 'collaborativeExitWithFees', {
      outputAmount,
      changeAmount,
      intentFee: fee,
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

/** The exited set: coins whose unilateral exit already happened, so they now
 * live onchain behind their CSV timelock and no batch can lift them back.
 *
 * Kept apart from `getVtxos` rather than folded into it. That split keys on
 * `spentBy`/`settledBy`, and an exited coin has neither, so it would land in
 * `spendable` and reach `calcNextRollover` — scheduling a rollover for money
 * that has already left the Ark layer.
 *
 * `withUnrolled` alone is not the exited set, because `isUnrolled` is a fact
 * about the whole ancestry, not just the coin the user exited. `Unroll.Session`
 * broadcasts the chain ancestry-first, so every earlier VTXO of ours in that
 * chain also ends up onchain and also comes back flagged — each with the same
 * value, since a chain of offchain transfers carries the amount forward. Those
 * ancestors were spent offchain when their successor was created, so
 * `isVtxoSpent` is exactly the line between them and the coin that
 * actually left: one exit, one row.
 *
 * It is also the line `computeOffchainBalance` draws — it skips terminal spends
 * before it counts the `unrolled` bucket or adds to `owned` — so filtering here
 * is what keeps the rows and the two subtractions in `reloadWallet` describing
 * the same coins.
 *
 * The set still stands after the user finishes the sweep with the exit tool:
 * the three facts behind `isVtxoSpent` all report an OFFCHAIN spend, and
 * the SDK is explicit that unrolling or sweeping sets none of them.
 *
 * Throws rather than degrading to an empty set. An empty answer is not a safe
 * approximation of "we could not ask": it is indistinguishable from "nothing
 * was exited", and `reloadWallet` spends it twice — once as the exit rows, once
 * as the asset subtraction — while the sats headline still nets out the
 * `unrolled` bucket, which comes from `getBalance` and would not have failed.
 * That commits a snapshot whose sats say an exit happened and whose assets and
 * history say it did not. Letting it throw hands the reload's catch a whole
 * failure instead, which keeps the last good snapshot and, on a first load,
 * surfaces the retry. */
export const getUnrolledVtxos = async (wallet: ServiceWorkerWallet): Promise<Vtxo[]> => {
  const vtxos = await wallet.getVtxos({ withUnrolled: true })
  return vtxos.filter((vtxo) => vtxo.isUnrolled && !isVtxoSpent(vtxo))
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
  thresholdMs: number | undefined,
  intentFee: IntentFeeConfig | undefined,
): Promise<void> => {
  const { boardingUtxos, vtxos } = await getInputsToSettle(wallet, vtxoManager, thresholdMs)
  const estimator = new Estimator(intentFee ?? {})
  const priced: { input: ExtendedCoin; fee: number }[] = [
    ...boardingUtxos.map((input) => ({
      input,
      fee: estimator.evalOnchainInput({ amount: BigInt(input.value) }).satoshis,
    })),
    ...vtxos.map((input) => ({ input, fee: offchainInputFee(estimator, input) })),
  ].filter(({ input, fee }) => fee < input.value)
  const inputs = priced.map(({ input }) => input)

  if (inputs.length === 0) throw new Error('No UTXOs or VTXOs eligible to settle')

  const address = await wallet.getAddress()
  const net = priced.reduce((sum, { input, fee }) => sum + input.value - fee, 0)
  const amount = outputAfterItsFee(estimator, address, net)

  if (amount < Number(dustAmount)) throw new Error('Total amount is below dust threshold')

  const outputs = [{ address, amount: BigInt(amount) }]

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
  const contractWithVtxos = await cm.getContractsWithVtxos({ type: 'delegate' }, undefined, { unspentOnly: true })
  const dm = await wallet.getDelegateManager()

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
    // A worker older than SDK 0.4.77 ignores `unspentOnly`.
    .flatMap((_) => _.vtxos.filter((vtxo) => !isVtxoSpent(vtxo)))

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
