import {
  ArkAddress,
  EsploraProvider,
  Transaction,
  selectCoinsWithAsset,
  type ExtendedVirtualCoin,
  type IWallet,
  type NetworkName,
} from '@arkade-os/sdk'
import {
  QuoteVerificationError,
  VerificationErrorCode,
  signLockup,
  signSponsoredPayment,
  verifyQuote,
  verifySponsoredQuote,
  type TaxiClient,
  type VerifyQuoteArgs,
  type VerifySponsoredQuoteArgs,
} from '@arkade-taxi/client'
import {
  fundingInputFromWire,
  fundingInputToWire,
  type AssetIdValue,
  type FundingInputWire,
} from '@arkade-taxi/protocol'
import { base64, hex } from '@scure/base'
import type { AspInfo } from '../providers/asp'
import type { Bip21Taxi } from './bip21'
import { PaymentDeclined } from './assetRfqSend'
import { getRestApiExplorerURL } from './explorers'
import { consoleError } from './logs'
import {
  TAXI_REFUSAL_TEXT,
  arkadeContextOf,
  boundedFetch,
  callerMinimum,
  ruleFor,
  taxiAssetId,
  taxiClient,
  vetBitcoinTaxi,
  type ArkadeContext,
  type TaxiFare,
  type TaxiInfo,
} from './receiverTaxi'
import { assetSwapRepository, unreservedCoins } from './swapRepository'
import { sleep } from './sleep'
import {
  readTaxiActivity,
  recordTaxiActivity,
  recordTaxiStatus,
  refreshTaxiActivity,
  taxiActivityKey,
  type TaxiActivity,
} from './taxiActivity'

export type DirectTaxiMode = 'recycle' | 'purchase' | 'sponsored'

export interface DirectTaxiTerms {
  mode: DirectTaxiMode
  /** Absent for sub-dust bitcoin, whose `assetAmount` is then in sats. */
  assetId?: string
  assetAmount: bigint
  fareCurrency: 'sats' | 'asset'
  fareUnits: bigint
  carrierSats: bigint
}

export interface PendingTaxiRecord {
  network: string
  senderKey: string
  taxiUrl: string
  operatorKey: string
  transferId: string
  expectedTxid: string
  expectedVout: number
  mode: DirectTaxiMode
  receiverAddress: string
  /** Absent for sub-dust bitcoin, whose `assetAmount` is then in sats. */
  assetId?: string
  assetAmount: string
  attempt?: StoredTaxiAttempt
}

type StoredTaxiAttempt = {
  signed: string
  senderInputs: FundingInputWire[]
  serverKey: string
  emulatorKey: string
  serverUnrollScript: string
  hrp: string
  vtxoMinAmount: string
  carrierCeiling: string
  maxFare: { currency: 'sats' | 'asset'; units: string }
} & (
  | { kind: 'covenant'; quote: VerifyQuoteArgs['quote']; minLocktime: string }
  | { kind: 'sponsored'; quote: VerifySponsoredQuoteArgs['quote'] }
)

const pendingKey = (network: string, senderKey: string) => `directTaxiPending:${network}:${senderKey}`

const readPending = (network: string, senderKey: string): PendingTaxiRecord | undefined => {
  const raw = localStorage.getItem(pendingKey(network, senderKey))
  if (!raw) return
  const invalid = 'Stored Taxi payment is invalid; new payments are blocked'
  try {
    const record = JSON.parse(raw) as PendingTaxiRecord
    if (
      record.network !== network ||
      record.senderKey !== senderKey ||
      !['recycle', 'purchase', 'sponsored'].includes(record.mode) ||
      typeof record.taxiUrl !== 'string' ||
      !['http:', 'https:'].includes(new URL(record.taxiUrl).protocol) ||
      typeof record.operatorKey !== 'string' ||
      !/^[0-9a-f]{64}$/.test(record.operatorKey) ||
      typeof record.transferId !== 'string' ||
      !record.transferId ||
      !/^[0-9a-f]{64}$/.test(record.expectedTxid) ||
      !Number.isSafeInteger(record.expectedVout) ||
      record.expectedVout < 0 ||
      typeof record.receiverAddress !== 'string' ||
      (record.assetId !== undefined && typeof record.assetId !== 'string') ||
      typeof record.assetAmount !== 'string' ||
      !/^[1-9][0-9]*$/.test(record.assetAmount)
    )
      throw new Error(invalid)
    return record
  } catch (cause) {
    throw new Error(invalid, { cause })
  }
}

const clearPending = (record: PendingTaxiRecord) => {
  const key = pendingKey(record.network, record.senderKey)
  const current = readPending(record.network, record.senderKey)
  if (!current) return
  if (current?.transferId !== record.transferId || current.expectedTxid !== record.expectedTxid)
    throw new Error('Stored Taxi payment changed; new payments are blocked')
  localStorage.removeItem(key)
}

export class ReturnedDirectTaxi extends Error {
  constructor(
    readonly record: PendingTaxiRecord,
    message = 'Taxi returned this payment to you; no new payment was sent.',
  ) {
    super(message)
    this.name = 'ReturnedDirectTaxi'
  }
}

export class PendingDirectTaxi extends Error {
  constructor(
    readonly record: PendingTaxiRecord,
    private readonly reconcile: () => Promise<string>,
    cause: unknown,
    message = 'Payment may have been submitted; retry checks the same transfer',
  ) {
    super(message, { cause })
    this.name = 'PendingDirectTaxi'
  }

  async resume(): Promise<string> {
    try {
      return await this.reconcile()
    } catch (cause) {
      if (cause instanceof ReturnedDirectTaxi || cause instanceof FailedDirectTaxi) throw cause
      throw new PendingDirectTaxi(this.record, this.reconcile, cause)
    }
  }
}

/** The Taxi gave up submitting. Kept on record: its reconciler may yet see the lockup land,
 * and arkd may still hold the inputs. */
export class FailedDirectTaxi extends PendingDirectTaxi {
  constructor(
    record: PendingTaxiRecord,
    reconcile: () => Promise<string>,
    readonly failureCode: string,
    readonly failureDetail?: string,
  ) {
    const detail = failureDetail ? `: ${failureDetail}` : ''
    super(
      record,
      reconcile,
      undefined,
      `Taxi could not submit this payment${detail} (${failureCode}). ` +
        'It has not been delivered yet; the Taxi operator may still complete it.',
    )
    this.name = 'FailedDirectTaxi'
  }

  /** Clears the record only if the Taxi still reports the failure; any other outcome is `resume()`'s,
   * so a payment that landed meanwhile resolves its txid instead of inviting a second send. */
  async forget(): Promise<string | undefined> {
    try {
      return await this.resume()
    } catch (cause) {
      if (!(cause instanceof FailedDirectTaxi)) throw cause
    }
    if (!readPending(this.record.network, this.record.senderKey))
      throw new Error('This Taxi payment is no longer on record; check your history before sending again')
    clearPending(this.record)
  }
}

const checkOutpoint = (record: PendingTaxiRecord, outpoint: { txid: string; vout: number }) => {
  if (outpoint.txid !== record.expectedTxid || outpoint.vout !== record.expectedVout)
    throw new Error('Taxi returned a different payment transaction')
}

const waitForSettlement = async (record: PendingTaxiRecord, client: TaxiClient, submit?: () => Promise<void>) => {
  const deadline = Date.now() + 30_000
  let delay = 1_000
  let reads = 0
  while (Date.now() < deadline) {
    reads += 1
    const status =
      record.mode === 'sponsored'
        ? await client.sponsoredStatus(record.transferId)
        : await client.status(record.transferId)
    if (status.transferId !== record.transferId) throw new Error('Taxi returned a different transfer')
    if (status.outpoint) checkOutpoint(record, status.outpoint)
    recordTaxiStatus(taxiActivityFromPending(record, status.updatedAt), status)
    if (status.outpoint && ['locked', 'recycled', 'purchased', 'recovered', 'refunded'].includes(status.state)) {
      clearPending(record)
      if (status.state === 'refunded' || status.state === 'recovered') throw new ReturnedDirectTaxi(record)
      return record.expectedTxid
    }
    if (status.state === 'expired' && !status.outpoint && !status.spentTxid && !status.submissionPhase) {
      clearPending(record)
      throw new ReturnedDirectTaxi(record, 'Taxi quote expired before payment submission; no payment was sent.')
    }
    // A failure code on any other phase is a retry the Taxi has scheduled.
    if (status.state === 'locking' && status.submissionPhase === 'failed' && status.failureCode)
      throw new FailedDirectTaxi(record, () => resumeStoredPayment(record), status.failureCode, status.failureDetail)
    if (status.state === 'quoted' && submit) {
      await submit()
      submit = undefined
    } else if (!['quoted', 'locking', 'recovering'].includes(status.state)) {
      throw new Error(`Taxi transfer is ${status.state}; its outcome is not confirmed`)
    }
    await sleep(Math.min(delay, Math.max(0, deadline - Date.now())))
    if (reads > 1) delay = Math.min(delay * 2, 4_000)
  }
  throw new Error('Taxi payment outcome is not confirmed')
}

const resumeStoredPayment = async (record: PendingTaxiRecord) => {
  const client = taxiClient(record.taxiUrl, boundedFetch)
  const info = await client.info()
  if (info.operatorKey !== record.operatorKey) throw new Error('Taxi operator key changed')
  const attempt = record.attempt
  if (attempt && (info.serverKey !== attempt.serverKey || info.emulatorKey !== attempt.emulatorKey))
    throw new Error('Taxi uses a different Arkade server or co-signer')
  return waitForSettlement(record, client, async () => {
    if (!attempt) throw new Error('The original Taxi payment authorization is unavailable')
    const receiver = ArkAddress.decode(record.receiverAddress)
    if (
      receiver.encode() !== record.receiverAddress ||
      receiver.hrp !== attempt.hrp ||
      hex.encode(receiver.serverPubKey) !== attempt.serverKey
    )
      throw new Error('The original Taxi receiver does not match the trusted server')
    const assetId = record.assetId ? taxiAssetId(record.assetId) : undefined
    const units = BigInt(record.assetAmount)
    const exact = assetId ? {} : { paymentSats: units }
    const senderInputs = attempt.senderInputs.map((input) => fundingInputFromWire(input))
    const common = {
      info,
      trustedServerKey: hex.decode(attempt.serverKey),
      trustedServerUnrollScript: hex.decode(attempt.serverUnrollScript),
      vtxoMinAmount: BigInt(attempt.vtxoMinAmount),
      hrp: attempt.hrp,
      senderInputs,
      senderSats: senderInputs.reduce((sum, input) => sum + input.value, 0n),
      ...(assetId ? { assetUnits: units } : {}),
    }
    const maxFare = {
      currency: attempt.maxFare.currency,
      units: BigInt(attempt.maxFare.units),
      ...(attempt.maxFare.currency === 'asset' ? { assetId } : {}),
    }
    const validateOriginal = (verified: {
      quote: { transferId: string }
      envelope: { arkTx: string; covenantOutputIndex: number }
    }) => {
      if (verified.quote.transferId !== record.transferId) throw new Error('The stored Taxi transfer changed')
      checkOutpoint(record, {
        txid: Transaction.fromPSBT(base64.decode(verified.envelope.arkTx)).id,
        vout: verified.envelope.covenantOutputIndex,
      })
    }
    if (attempt.kind === 'sponsored' && record.mode === 'sponsored') {
      const verified = verifySponsoredQuote({
        ...common,
        quote: attempt.quote,
        expect: {
          receiverAddress: record.receiverAddress,
          senderKey: hex.decode(record.senderKey),
          assetId,
          maxFare,
          maxContributionSats: BigInt(attempt.carrierCeiling),
          ...exact,
        },
      })
      validateOriginal(verified)
      const result = await client.submitSponsoredLockup(verified, attempt.signed)
      checkOutpoint(record, result.outpoint)
      if (result.txid !== record.expectedTxid) throw new Error('Taxi returned a different payment transaction')
    } else if (attempt.kind === 'covenant' && record.mode !== 'sponsored') {
      const verified = verifyQuote({
        ...common,
        quote: attempt.quote,
        trustedEmulatorKey: hex.decode(attempt.emulatorKey),
        expect: {
          receiverKey: receiver.vtxoTaprootKey,
          senderKey: hex.decode(record.senderKey),
          assetId,
          maxFare,
          maxTopupSats: BigInt(attempt.carrierCeiling),
          minLocktime: BigInt(attempt.minLocktime),
          claimMode: record.mode,
          recoveryRecipient: 'sender',
          ...exact,
        },
      })
      validateOriginal(verified)
      const result = await client.submitLockup(verified, attempt.signed)
      checkOutpoint(record, result.outpoint)
      if (result.txid !== record.expectedTxid) throw new Error('Taxi returned a different payment transaction')
    } else throw new Error('The stored Taxi payment mode changed')
  })
}

const restorePending = (record: PendingTaxiRecord) =>
  new PendingDirectTaxi(record, () => resumeStoredPayment(record), undefined)

export const getPendingDirectTaxi = async (wallet: Pick<IWallet, 'identity'>, network: string) => {
  const record = readPending(network, hex.encode(await wallet.identity.xOnlyPublicKey()))
  return record && restorePending(record)
}

/** The journaled payment as history records it, at the moment it was signed. */
export const taxiActivityFromPending = (record: PendingTaxiRecord, createdAt: number): TaxiActivity => {
  const attempt = record.attempt
  return {
    role: 'sender',
    network: record.network,
    taxiUrl: record.taxiUrl,
    transferId: record.transferId,
    mode: record.mode,
    ...(record.assetId ? { assetId: record.assetId } : {}),
    units: record.assetAmount,
    ...(attempt
      ? {
          carrierSats: attempt.kind === 'covenant' ? attempt.quote.params.topup : attempt.quote.params.contribution,
          fare: { currency: attempt.quote.fare.currency, units: attempt.quote.fare.units },
        }
      : {}),
    destination: record.receiverAddress,
    lockupTxid: record.expectedTxid,
    state: 'quoted',
    updatedAt: createdAt,
    createdAt,
  }
}

/** Journals a signed payment and records it at once: a submit that throws never reaches waitForSettlement. */
export const journalDirectTaxi = (record: PendingTaxiRecord): void => {
  localStorage.setItem(pendingKey(record.network, record.senderKey), JSON.stringify(record))
  // History only describes the payment, so a record it cannot read must not stop it.
  try {
    recordTaxiActivity(taxiActivityFromPending(record, Math.floor(Date.now() / 1000)))
  } catch (error) {
    consoleError(error, 'cannot record the Taxi payment in history')
  }
}

/** Resumes the journaled payment only when it is this transfer, under the lock a new send takes. */
export const resumePendingDirectTaxi = async (
  wallet: Pick<IWallet, 'identity'>,
  network: string,
  transferId: string,
): Promise<string | undefined> => {
  const senderKey = hex.encode(await wallet.identity.xOnlyPublicKey())
  if (!navigator.locks) throw new Error('This browser cannot safely coordinate Taxi payments')
  return navigator.locks.request(pendingKey(network, senderKey), async () => {
    const record = readPending(network, senderKey)
    return record?.transferId === transferId ? restorePending(record).resume() : undefined
  })
}

/** One fresh read; then a resume, unless the Taxi says the submission failed: resuming that would only spin. */
export const checkTaxiPayment = async (r: TaxiActivity, wallet: Pick<IWallet, 'identity'> | undefined) => {
  await refreshTaxiActivity(r)
  const fresh = readTaxiActivity(r.network).find((other) => taxiActivityKey(other) === taxiActivityKey(r))
  if (r.role !== 'sender' || !wallet || !fresh || fresh.state === 'gone' || fresh.submissionPhase === 'failed') return
  await resumePendingDirectTaxi(wallet, r.network, r.transferId)
}

const priceFare = (fare: TaxiFare, base: bigint): bigint => {
  const pricing = fare.pricing
  if (pricing.kind === 'flat') return BigInt(pricing.units)
  if (!Number.isInteger(pricing.bps) || pricing.bps < 0 || pricing.bps > 10_000)
    throw new Error('Taxi fare has an invalid rate')
  const raw = (base * BigInt(pricing.bps)) / 10_000n
  const min = BigInt(pricing.minUnits)
  const floored = raw < min ? min : raw
  return pricing.maxUnits !== null && floored > BigInt(pricing.maxUnits) ? BigInt(pricing.maxUnits) : floored
}

interface DirectTaxiSendArgs {
  wallet: IWallet
  aspInfo: AspInfo
  taxi: { url: string; operatorKey?: string; fareId?: Bip21Taxi['fareId']; payer?: Bip21Taxi['payer'] }
  receiverAddress: string
  /** Absent for sub-dust bitcoin, whose `amount` is then in sats. */
  assetId?: string
  amount: bigint
  mode: DirectTaxiMode
  confirmPayment: (terms: DirectTaxiTerms) => Promise<boolean>
}

export const sendDirectTaxi = async (args: DirectTaxiSendArgs): Promise<string> => {
  if (args.taxi.payer === 'sender' && (!args.assetId || args.mode === 'recycle'))
    throw new Error('This request requires sender-covered delivery without receiver repayment')
  const senderKey = hex.encode(await args.wallet.identity.xOnlyPublicKey())
  if (!navigator.locks) throw new Error('This browser cannot safely coordinate Taxi payments')
  return navigator.locks.request(pendingKey(args.aspInfo.network, senderKey), async () => {
    const pending = readPending(args.aspInfo.network, senderKey)
    if (pending) throw restorePending(pending)
    return sendDirectTaxiLocked(args, senderKey)
  })
}

interface QuotePlan {
  selected: ExtendedVirtualCoin[]
  fareId: string
  maxFare: { currency: 'sats' | 'asset'; units: bigint; assetId?: AssetIdValue }
  /** The most the Taxi may advance; for sats, exactly what the amount lacks of dust. */
  carrierCeiling: bigint
  payment: { assetId: AssetIdValue; assetUnits: bigint } | { paymentSats: bigint }
}

/** Prefer plain coins; asset funding must leave all holdings in spendable sender change. */
export const selectSatsForTaxi = <C extends Pick<ExtendedVirtualCoin, 'value' | 'assets'>>(
  coins: readonly C[],
  required: bigint,
  vtxoMinAmount: bigint,
  dust: bigint,
): C[] => {
  const selected: C[] = []
  let total = 0n
  const covered = () => total === required || total - required >= vtxoMinAmount
  for (const coin of coins.filter((coin) => !coin.assets?.length).sort((a, b) => a.value - b.value)) {
    if (covered()) break
    selected.push(coin)
    total += BigInt(coin.value)
  }
  if (covered()) return selected
  const assetMinimum = dust > vtxoMinAmount ? dust : vtxoMinAmount
  const assetCoins = coins.filter((coin) => coin.assets?.length).sort((a, b) => a.value - b.value)
  const sufficient = assetCoins.find((coin) => total + BigInt(coin.value) - required >= assetMinimum)
  if (sufficient) return [...selected, sufficient]
  for (const coin of assetCoins) {
    selected.push(coin)
    total += BigInt(coin.value)
    if (total - required >= assetMinimum) return selected
  }
  if (assetCoins.length && total >= required)
    throw new Error(`This Taxi payment needs ${assetMinimum} sats left for spendable asset change`)
  throw new Error('Insufficient sats for this Taxi payment')
}

const assetPlan = async (
  info: TaxiInfo,
  ctx: ArkadeContext,
  { wallet, taxi, amount, mode }: DirectTaxiSendArgs,
  assetId: string,
): Promise<QuotePlan> => {
  const rule = ruleFor(info, assetId)
  if (!rule?.enabled) throw new Error('Taxi does not carry this asset')
  if (mode !== 'sponsored' && rule.claim !== 'either' && rule.claim !== mode)
    throw new Error(`Taxi does not support ${mode} claims`)
  const currency = mode === 'recycle' ? 'sats' : 'sameAsset'
  const offered = rule.fares.filter((fare) => fare.currency === currency)
  const fare = taxi.fareId ? offered.find((candidate) => candidate.id === taxi.fareId) : offered[0]
  if (!fare) throw new Error(`Taxi offers no ${mode === 'recycle' ? 'sats' : 'asset'} fare`)
  const fareUnits = priceFare(fare, currency === 'sats' ? ctx.dust : amount)
  if (fareUnits < 0n) throw new Error('Taxi fare cannot be negative')
  const available = await unreservedCoins(wallet, assetSwapRepository)
  const requiredUnits = amount + (currency === 'sameAsset' ? fareUnits : 0n)
  const { selected, totalAssetAmount } = selectCoinsWithAsset(available, assetId, requiredUnits)
  const hasAssetChange =
    totalAssetAmount > requiredUnits ||
    selected.some((coin) => coin.assets?.some((held) => held.assetId !== assetId && held.amount > 0n))
  const requiredSats = (currency === 'sats' ? fareUnits : 0n) + (hasAssetChange ? ctx.vtxoMinAmount : 0n)
  let selectedSats = selected.reduce((sum, coin) => sum + BigInt(coin.value), 0n)
  for (const coin of available.filter((coin) => !coin.assets?.length).sort((a, b) => a.value - b.value)) {
    if (selectedSats >= requiredSats) break
    selected.push(coin)
    selectedSats += BigInt(coin.value)
  }
  if (selectedSats < requiredSats) throw new Error('Insufficient sats for the Taxi fare and asset change')
  const id = taxiAssetId(assetId)
  return {
    selected,
    fareId: fare.id,
    maxFare: {
      currency: currency === 'sats' ? 'sats' : 'asset',
      units: fareUnits,
      ...(currency === 'sameAsset' ? { assetId: id } : {}),
    },
    carrierCeiling: ctx.dust,
    payment: { assetId: id, assetUnits: amount },
  }
}

const bitcoinPlan = async (
  info: TaxiInfo,
  ctx: ArkadeContext,
  { wallet, taxi, receiverAddress, amount, mode }: DirectTaxiSendArgs,
): Promise<QuotePlan> => {
  if (mode !== 'recycle') throw new Error('Only recycle preserves an exact sub-dust amount')
  const offer = vetBitcoinTaxi(info, ctx, {
    receiverAddress,
    amount,
    operatorKey: taxi.operatorKey,
    fareId: taxi.fareId,
  })
  if (!offer.ok) throw new Error(`Taxi unavailable: ${TAXI_REFUSAL_TEXT[offer.reason]}`)
  if (!offer.modes.includes(mode)) throw new Error(`Taxi does not support ${mode} claims`)
  const available = await unreservedCoins(wallet, assetSwapRepository)
  return {
    selected: selectSatsForTaxi(available, amount + offer.fareUnits, ctx.vtxoMinAmount, ctx.dust),
    fareId: offer.fare.id,
    maxFare: { currency: 'sats', units: offer.fareUnits },
    carrierCeiling: offer.topup,
    payment: { paymentSats: amount },
  }
}

/** A Taxi predating paymentSats quotes its own advance; no response field says so, only the client's binding. */
const exactly = <T>(quote: Promise<T>): Promise<T> =>
  quote.catch((cause: unknown) => {
    if (cause instanceof QuoteVerificationError && cause.code === VerificationErrorCode.PaymentSats)
      throw new Error("This Taxi can't carry an exact sub-dust amount", { cause })
    throw cause
  })

const sendDirectTaxiLocked = async (args: DirectTaxiSendArgs, senderKey: string): Promise<string> => {
  const { wallet, aspInfo, taxi, receiverAddress, assetId, amount, mode } = args
  if (amount <= 0n) throw new Error('Asset amount must be positive')
  if (window.location.protocol === 'https:' && new URL(taxi.url).protocol !== 'https:')
    throw new Error('Taxi must use HTTPS')
  const explorer = getRestApiExplorerURL(aspInfo.network as NetworkName)
  const ctx = arkadeContextOf(aspInfo, async () => {
    if (!explorer) throw new Error('No chain explorer configured')
    return (await new EsploraProvider(explorer).getChainTip()).height
  })
  const client = taxiClient(taxi.url, boundedFetch)
  const info = await client.info()
  if (info.serverKey !== hex.encode(ctx.serverKey) || info.emulatorKey !== hex.encode(ctx.emulatorKey))
    throw new Error('Taxi uses a different Arkade server or co-signer')
  if (taxi.operatorKey && info.operatorKey !== taxi.operatorKey) throw new Error('Taxi operator key changed')
  if (BigInt(info.dust) !== ctx.dust || BigInt(info.vtxoMinAmount) !== ctx.vtxoMinAmount)
    throw new Error('Taxi uses different carrier limits')
  if (info.paused) throw new Error('Taxi is paused')
  const plan = assetId === undefined ? await bitcoinPlan(info, ctx, args) : await assetPlan(info, ctx, args, assetId)
  const { selected, maxFare } = plan
  const request = {
    receiverAddress,
    senderKey: await wallet.identity.xOnlyPublicKey(),
    selectedVtxos: selected,
    ...plan.payment,
    fareId: plan.fareId,
    trustedServerKey: ctx.serverKey,
    trustedServerUnrollScript: hex.decode(aspInfo.checkpointTapscript),
    vtxoMinAmount: ctx.vtxoMinAmount,
    hrp: ctx.hrp,
  }
  const minLocktime = mode === 'sponsored' ? 0n : await callerMinimum(ctx)
  const quoted =
    mode === 'sponsored'
      ? {
          kind: 'sponsored' as const,
          ...(await exactly(
            client.requestVerifiedSponsoredQuote({
              ...request,
              expect: { maxContributionSats: plan.carrierCeiling, maxFare },
            }),
          )),
        }
      : {
          kind: 'covenant' as const,
          ...(await exactly(
            client.requestVerifiedQuote({
              ...request,
              claimMode: mode,
              trustedEmulatorKey: ctx.emulatorKey,
              expect: {
                maxTopupSats: plan.carrierCeiling,
                maxFare,
                minLocktime,
                claimMode: mode,
                recoveryRecipient: 'sender',
              },
            }),
          )),
        }
  const { verified } = quoted
  if (hex.encode(verified.params.operatorKey) !== info.operatorKey) throw new Error('Taxi operator key changed')
  const terms: DirectTaxiTerms = {
    mode,
    assetId,
    assetAmount: amount,
    fareCurrency: verified.quote.fare.currency,
    fareUnits: BigInt(verified.quote.fare.units),
    carrierSats: 'topup' in verified.params ? verified.params.topup : verified.params.contribution,
  }
  if (!(await args.confirmPayment(terms))) throw new PaymentDeclined()
  if (Date.now() / 1000 >= verified.quote.expiresAt) throw new Error('Taxi quote expired; request a new quote')
  const fresh = await unreservedCoins(wallet, assetSwapRepository)
  if (selected.some((coin) => !fresh.some((other) => other.txid === coin.txid && other.vout === coin.vout)))
    throw new Error('Selected coins are no longer available')
  const signed =
    quoted.kind === 'sponsored'
      ? await signSponsoredPayment({
          verified: quoted.verified,
          identity: wallet.identity,
        })
      : await signLockup({
          verified: quoted.verified,
          identity: wallet.identity,
        })
  const expectedTxid = Transaction.fromPSBT(base64.decode(verified.envelope.arkTx)).id
  const expectedVout = verified.envelope.covenantOutputIndex
  const transferId = verified.quote.transferId
  const record: PendingTaxiRecord = {
    network: aspInfo.network,
    senderKey,
    taxiUrl: taxi.url,
    operatorKey: info.operatorKey,
    transferId,
    expectedTxid,
    expectedVout,
    mode,
    receiverAddress,
    assetId,
    assetAmount: amount.toString(),
    attempt: {
      signed,
      senderInputs: quoted.senderInputs.map(fundingInputToWire),
      serverKey: hex.encode(ctx.serverKey),
      emulatorKey: hex.encode(ctx.emulatorKey),
      serverUnrollScript: hex.encode(request.trustedServerUnrollScript),
      hrp: ctx.hrp,
      vtxoMinAmount: ctx.vtxoMinAmount.toString(),
      carrierCeiling: plan.carrierCeiling.toString(),
      maxFare: { currency: maxFare.currency, units: maxFare.units.toString() },
      ...(quoted.kind === 'sponsored'
        ? { kind: 'sponsored', quote: quoted.verified.quote }
        : { kind: 'covenant', quote: quoted.verified.quote, minLocktime: minLocktime.toString() }),
    },
  }
  journalDirectTaxi(record)
  const submit = async () => {
    const result =
      quoted.kind === 'sponsored'
        ? await client.submitSponsoredLockup(quoted.verified, signed)
        : await client.submitLockup(quoted.verified, signed)
    if (result.txid !== expectedTxid || result.outpoint.txid !== expectedTxid || result.outpoint.vout !== expectedVout)
      throw new Error('Taxi returned a different payment transaction')
  }
  try {
    await submit()
    return await waitForSettlement(record, client)
  } catch (cause) {
    if (cause instanceof ReturnedDirectTaxi || cause instanceof FailedDirectTaxi) throw cause
    throw new PendingDirectTaxi(record, () => resumeStoredPayment(record), cause)
  }
}
