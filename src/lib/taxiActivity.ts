// The wallet's own record of every Taxi-carried payment, on either side of it.
// Nothing else outlives the operation: the pending journal is cleared at
// settlement, offers are dropped on claim, and the claim feed lists only active
// claims. Same store shape as `solverCards`.

import { TaxiError, type TaxiClient } from '@arkade-taxi/client'
import type { TransferStatusResponse } from '@arkade-taxi/protocol'
import { centsToUnits, isValidAssetId } from './assets'
import { isCanonicalTxid, isTransferId, pluralSats } from './carrierActivity'
import { prettyHide } from './format'
import { translate } from './i18n'
import { consoleError } from './logs'
import { boundedFetch, isMixedContent, taxiClient } from './receiverTaxi'
import { getStorageItem } from './storage'
import type { CarrierReceiptRows } from './swapDisplay'
import { Language, type Tx } from './types'

export interface TaxiActivity {
  role: 'sender' | 'receiver'
  network: string
  taxiUrl: string
  transferId: string
  mode?: 'recycle' | 'purchase' | 'sponsored'
  /** Absent for bitcoin, whose `units` are sats. */
  assetId?: string
  units: string
  carrierSats?: string
  /** What this wallet pays the Taxi. */
  fare?: { currency: 'sats' | 'asset'; units: string }
  destination?: string
  returnsTo?: 'sender' | 'receiver'
  lockupTxid?: string
  claimTxid?: string
  spentTxid?: string
  /** The Taxi's wire state, or `gone` once it answers that it no longer knows the transfer. */
  state: string
  submissionPhase?: string
  failureCode?: string
  failureDetail?: string
  /** Unix seconds. */
  updatedAt: number
  createdAt: number
}

export type TaxiTone = 'pending' | 'failed' | 'done' | 'void'

export interface TaxiActivityView {
  label: string
  tone: TaxiTone
  explanation: string
  action: 'claim' | 'check' | 'none'
}

const STORAGE_KEY = 'taxiActivity'
const MAX_CLOSED = 200
const MAX_TEXT = 512
const MAX_UNITS = 2n ** 64n - 1n
// The last second a Date can hold: a later Taxi timestamp would crash every render of history.
const MAX_TIME = 8_640_000_000_000
const DECIMAL = /^(0|[1-9][0-9]*)$/
// Wire states only move forward, so a lower rank is a stale read.
const RANK = new Map([
  ['quoted', 0],
  ['locking', 1],
  ['locked', 2],
  ['recovering', 3],
  ['recycled', 4],
  ['purchased', 4],
  ['refunded', 4],
  ['recovered', 4],
  ['expired', 4],
])

let version = 0
const listeners = new Set<() => void>()
const inFlight = new Map<string, Promise<void>>()
const failing = new Set<string>()
const unknownStates = new Set<string>()

const isUnits = (value: unknown): value is string =>
  typeof value === 'string' && DECIMAL.test(value) && BigInt(value) <= MAX_UNITS
const isText = (value: unknown): value is string => typeof value === 'string' && value.length <= MAX_TEXT
const isTime = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= MAX_TIME
const optional = (value: unknown, check: (value: unknown) => boolean): boolean => value === undefined || check(value)
const isHttpUrl = (value: unknown): boolean => {
  try {
    return typeof value === 'string' && ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const isTaxiActivity = (value: unknown): value is TaxiActivity => {
  const r = value as Partial<TaxiActivity> | null
  return (
    typeof r === 'object' &&
    r !== null &&
    (r.role === 'sender' || r.role === 'receiver') &&
    typeof r.network === 'string' &&
    isHttpUrl(r.taxiUrl) &&
    isTransferId(r.transferId) &&
    optional(r.mode, (mode) => mode === 'recycle' || mode === 'purchase' || mode === 'sponsored') &&
    optional(r.assetId, (id) => typeof id === 'string' && isValidAssetId(id)) &&
    isUnits(r.units) &&
    optional(r.carrierSats, isUnits) &&
    optional(r.fare, (fare) => {
      const { currency, units } = (fare ?? {}) as Partial<NonNullable<TaxiActivity['fare']>>
      return (currency === 'sats' || currency === 'asset') && isUnits(units)
    }) &&
    optional(r.destination, isText) &&
    optional(r.returnsTo, (to) => to === 'sender' || to === 'receiver') &&
    [r.lockupTxid, r.claimTxid, r.spentTxid].every((txid) => optional(txid, isCanonicalTxid)) &&
    (r.state === 'gone' || RANK.has(r.state as string)) &&
    [r.submissionPhase, r.failureCode, r.failureDetail].every((text) => optional(text, isText)) &&
    isTime(r.updatedAt) &&
    isTime(r.createdAt)
  )
}

const readAll = (): TaxiActivity[] => {
  const stored = getStorageItem<unknown>(STORAGE_KEY, [], (value) => JSON.parse(value))
  return Array.isArray(stored) ? stored.filter(isTaxiActivity) : []
}

const notify = () => {
  version += 1
  listeners.forEach((fn) => fn())
}

export const taxiActivityKey = ({ role, taxiUrl, transferId }: Pick<TaxiActivity, 'role' | 'taxiUrl' | 'transferId'>) =>
  `${role} ${taxiUrl} ${transferId}`

export const readTaxiActivity = (network: string): TaxiActivity[] => readAll().filter((r) => r.network === network)

export const isTaxiActivityOpen = ({ mode, state }: Pick<TaxiActivity, 'mode' | 'state'>): boolean =>
  ['quoted', 'locking', ...(mode === 'sponsored' ? [] : ['locked', 'recovering'])].includes(state)

const advances = (current: TaxiActivity, next: TaxiActivity): boolean => {
  if (next.state === 'gone') return isTaxiActivityOpen(current)
  if (current.state === 'gone') return true
  const [from, to] = [RANK.get(current.state)!, RANK.get(next.state)!]
  return to > from || (to === from && next.updatedAt >= current.updatedAt)
}

const statusOf = ({ state, submissionPhase, failureCode, failureDetail, updatedAt }: TaxiActivity) => ({
  state,
  submissionPhase,
  failureCode,
  failureDetail,
  updatedAt,
})

const merge = (current: TaxiActivity, next: TaxiActivity): TaxiActivity => ({
  ...current,
  ...Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined)),
  ...statusOf(advances(current, next) ? next : current),
  createdAt: current.createdAt,
})

const withinCap = (records: TaxiActivity[]): TaxiActivity[] => {
  const evicted = new Set(
    records
      .filter((r) => !isTaxiActivityOpen(r))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(MAX_CLOSED),
  )
  return records.filter((r) => !evicted.has(r))
}

/** Upserts under the rank rule, writing (and so re-rendering history) only on a real change. Never throws. */
export const recordTaxiActivity = (next: TaxiActivity): void => {
  try {
    const records = readAll()
    const current = records.find((r) => taxiActivityKey(r) === taxiActivityKey(next))
    const merged = current ? merge(current, next) : next
    if (!isTaxiActivity(merged)) return consoleError(merged, `not recording Taxi transfer ${next.transferId}`)
    if (current && JSON.stringify(current) === JSON.stringify(merged)) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withinCap([merged, ...records.filter((r) => r !== current)])))
    notify()
  } catch (error) {
    consoleError(error, `could not record Taxi transfer ${next.transferId}`)
  }
}

const clip = (text?: string) => text?.slice(0, MAX_TEXT)

export const recordTaxiStatus = (r: TaxiActivity, status: TransferStatusResponse): void => {
  if (status.transferId !== r.transferId) return
  if (r.role === 'sender' && status.outpoint && status.outpoint.txid !== r.lockupTxid) return
  if (!RANK.has(status.state)) {
    if (!unknownStates.has(status.state)) consoleError(status.state, 'unknown Taxi transfer state')
    unknownStates.add(status.state)
    return
  }
  recordTaxiActivity({
    ...r,
    state: status.state,
    submissionPhase: clip(status.submissionPhase),
    failureCode: clip(status.failureCode),
    failureDetail: clip(status.failureDetail),
    ...(status.spentTxid ? { spentTxid: status.spentTxid } : {}),
    updatedAt: status.updatedAt,
  })
}

export const forgetTaxiActivity = (): void => {
  localStorage.removeItem(STORAGE_KEY)
  notify()
}

export const getTaxiActivityVersion = (): number => version

export const subscribeTaxiActivity = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** One status read. Rejects, leaving the record as it was, when the Taxi cannot be reached. */
export const refreshTaxiActivity = (
  r: TaxiActivity,
  client: Pick<TaxiClient, 'status' | 'sponsoredStatus'> = taxiClient(r.taxiUrl, boundedFetch),
): Promise<void> => {
  const key = taxiActivityKey(r)
  const running = inFlight.get(key)
  if (running) return running
  const read = r.mode === 'sponsored' ? client.sponsoredStatus(r.transferId) : client.status(r.transferId)
  const run = read
    .then(
      (status) => recordTaxiStatus(r, status),
      (error) => {
        if (!(error instanceof TaxiError && error.code === 'not_found')) throw error
        recordTaxiActivity({
          ...r,
          state: 'gone',
          submissionPhase: undefined,
          failureCode: undefined,
          failureDetail: undefined,
          updatedAt: Math.floor(Date.now() / 1000),
        })
      },
    )
    .finally(() => inFlight.delete(key))
  inFlight.set(key, run)
  return run
}

/** Re-reads every open record; a Taxi that keeps failing is logged once, not on every poll. */
export const pollTaxiActivity = async (network: string, pageProtocol = window.location.protocol): Promise<void> => {
  await Promise.all(
    readTaxiActivity(network)
      .filter((r) => isTaxiActivityOpen(r) && !isMixedContent(r.taxiUrl, pageProtocol))
      .map((r) => {
        const key = taxiActivityKey(r)
        return refreshTaxiActivity(r).then(
          () => void failing.delete(key),
          (error) => {
            if (!failing.has(key)) consoleError(error, `could not read Taxi transfer ${r.transferId}`)
            failing.add(key)
          },
        )
      }),
  )
}

const view = (
  label: string,
  tone: TaxiTone,
  explanation: string,
  action: TaxiActivityView['action'] = 'none',
): TaxiActivityView => ({ label, tone, explanation: `transaction.taxiExplain${explanation}`, action })

/** What a record means to its owner, as i18n keys, and what they can do about it. */
export const taxiActivityView = (r: TaxiActivity, { claimable = false, pending = false } = {}): TaxiActivityView => {
  const sender = r.role === 'sender'
  switch (r.state) {
    case 'gone':
      return view('common.unknown', 'void', 'Gone')
    case 'quoted':
    case 'locking':
      if (r.submissionPhase === 'failed') return view('transaction.carrierFailed', 'failed', 'Failed', 'check')
      return view('swap.pending', 'pending', !sender ? 'Verifying' : pending ? 'Unconfirmed' : 'Sending', 'check')
    case 'locked':
      if (!sender)
        return claimable
          ? view('transaction.carrierClaimable', 'pending', 'ReadyToClaim', 'claim')
          : view('transaction.carrierClaimable', 'pending', 'Verifying', 'check')
      return r.mode === 'sponsored'
        ? view('transaction.completed', 'done', 'Delivered')
        : view('transaction.taxiAwaitingClaim', 'pending', 'AwaitingClaim', 'check')
    case 'recovering':
      return view(
        'transaction.taxiReturning',
        'pending',
        sender || r.returnsTo === 'receiver' ? 'ReturningToYou' : 'ReturningToSender',
        'check',
      )
    case 'recycled':
    case 'purchased':
      return view('transaction.carrierClaimed', 'done', sender ? 'ClaimedByReceiver' : 'Claimed')
    case 'expired':
      return view('transaction.taxiNotSent', 'void', 'NotSent')
    default:
      if (sender) return view('transaction.taxiReturned', 'void', 'ReturnedToYou')
      return r.returnsTo === 'receiver'
        ? view('transaction.completed', 'done', 'ReturnedToYou')
        : view('transaction.taxiReturned', 'void', 'ReturnedToSender')
  }
}

/** The record's own transactions; its lockup only once the Taxi says the lockup exists. */
export const taxiActivityTxids = (r: TaxiActivity): string[] => {
  const locked = (RANK.get(r.state) ?? 0) >= 2 && r.state !== 'expired'
  return [locked ? r.lockupTxid : undefined, r.claimTxid, r.spentTxid].filter(isCanonicalTxid)
}

/** The receipt's carrier rows, in the shape `carrierDetails` gives a descriptor. */
export const taxiCarrierRows = (
  r: TaxiActivity,
  language = Language.English,
  asset?: { ticker?: string; decimals?: number },
): CarrierReceiptRows => {
  const satsLabel = translate(language, 'common.sats')
  const sats = (value: string) => ({ value: pluralSats(value, language), masked: prettyHide(value, satsLabel) })
  const borrowed = (amount: string) => translate(language, 'transaction.carrierBorrowed', { amount })
  const fare =
    r.fare?.currency === 'sats'
      ? sats(r.fare.units)
      : r.fare && {
          value: `${centsToUnits(BigInt(r.fare.units), asset?.decimals ?? 0)} ${asset?.ticker ?? ''}`.trim(),
          masked: prettyHide(r.fare.units, asset?.ticker ?? ''),
        }
  return {
    ...(r.carrierSats && r.mode === 'recycle'
      ? {
          carrierLoan: {
            value: borrowed(pluralSats(r.carrierSats, language)),
            masked: borrowed(prettyHide(r.carrierSats, satsLabel)),
          },
        }
      : {}),
    ...(r.carrierSats && r.mode && r.mode !== 'recycle' ? { carrierPurchase: sats(r.carrierSats) } : {}),
    ...(fare ? { carrierFare: fare } : {}),
    carrierDelivery: translate(language, taxiActivityView(r).label),
  }
}

/** A row only the record answers for: none of its transactions has reached this wallet's history. */
export const isTaxiOnlyTx = (tx: Pick<Tx, 'taxi' | 'redeemTxid' | 'roundTxid' | 'boardingTxid'>): boolean =>
  Boolean(tx.taxi) && !tx.redeemTxid && !tx.roundTxid && !tx.boardingTxid
