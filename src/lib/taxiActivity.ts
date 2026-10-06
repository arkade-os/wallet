import { useMemo, useSyncExternalStore } from 'react'
import { TaxiActivityStore, type TaxiActivity } from '@arkade-taxi/client/wallet'
import { centsToUnits } from './assets'
import { pluralSats } from './carrierActivity'
import { prettyHide } from './format'
import { translate } from './i18n'
import { consoleError } from './logs'
import { boundedFetch, taxiClient } from './receiverTaxi'
import type { CarrierReceiptRows } from './swapDisplay'
import { Language, type Tx } from './types'

export { isTaxiActivityOpen, taxiActivityKey, taxiActivityTxids, type TaxiActivity } from '@arkade-taxi/client/wallet'

export type TaxiTone = 'pending' | 'failed' | 'done' | 'void'

export interface TaxiActivityView {
  label: string
  tone: TaxiTone
  explanation: string
  action: 'claim' | 'check' | 'none'
}

const activityStore = new TaxiActivityStore({
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  },
  client: (url) => taxiClient(url, boundedFetch),
  onError: (error, message) => consoleError(error, message),
})

export const readTaxiActivity = activityStore.read
export const recordTaxiActivity = activityStore.record
export const recordTaxiStatus = activityStore.recordStatus
export const forgetTaxiActivity = activityStore.forget
export const getTaxiActivityVersion = activityStore.getVersion
export const subscribeTaxiActivity = activityStore.subscribe
export const refreshTaxiActivity = activityStore.refresh
export const pollTaxiActivity = (network: string, pageProtocol = window.location.protocol): Promise<void> =>
  activityStore.poll(network, pageProtocol)

export const useTaxiActivity = (network: string): TaxiActivity[] => {
  const version = useSyncExternalStore(subscribeTaxiActivity, getTaxiActivityVersion, getTaxiActivityVersion)
  return useMemo(() => readTaxiActivity(network), [version, network])
}

const view = (
  label: string,
  tone: TaxiTone,
  explanation: string,
  action: TaxiActivityView['action'] = 'none',
): TaxiActivityView => ({ label, tone, explanation: `transaction.taxiExplain${explanation}`, action })

const stateView = (r: TaxiActivity, { claimable = false, pending = false } = {}): TaxiActivityView => {
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

/** What a record means to its owner, as i18n keys, and what they can do about it. */
export const taxiActivityView = (
  r: TaxiActivity,
  options: { claimable?: boolean; pending?: boolean } = {},
): TaxiActivityView => {
  const v = stateView(r, options)
  // The poller records an outcome without touching the journal, which blocks every new send until a check clears it.
  return options.pending && v.action === 'none' && r.state !== 'gone' ? { ...v, action: 'check' } : v
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
