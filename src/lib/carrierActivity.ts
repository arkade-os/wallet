import { CarrierMetadataError, type CarrierActivity, type CarrierState } from '@arkade-taxi/client/wallet'
import { translate } from './i18n'
import { Language } from './types'

export { hasTaxiCarrier, isCanonicalTxid, readCarrierActivity, type CarrierActivity } from '@arkade-taxi/client/wallet'

const MAX_SATS = 2_100_000_000_000_000n

const asBoundedSats = (value: string): bigint => {
  const sats = BigInt(value)
  if (sats > MAX_SATS) throw new CarrierMetadataError('sats')
  return sats
}

export const formatCarrierSats = (value: string): string => asBoundedSats(value).toLocaleString('en-US')

export const pluralSats = (value: string, language: Language): string =>
  `${formatCarrierSats(value)} ${translate(language, asBoundedSats(value) === 1n ? 'common.sat' : 'common.sats')}`

export const carrierBorrowedLabel = (carrier: CarrierActivity, language = Language.English): string =>
  translate(language, 'transaction.carrierBorrowed', { amount: pluralSats(carrier.loanSats, language) })

export const carrierPurchasedReceiptLabel = (carrier: CarrierActivity, language = Language.English): string =>
  translate(language, 'transaction.carrierReceiptReserve', { amount: pluralSats(carrier.purchasedSats, language) })

export const carrierPurchasedLiteralLabel = (carrier: CarrierActivity, language = Language.English): string =>
  pluralSats(carrier.purchasedSats, language)

export const carrierServiceFareLabel = (carrier: CarrierActivity, language = Language.English): string =>
  pluralSats(carrier.serviceFareSats, language)

/** The delivery state as the receipt names it. `receipt` is a merge-only
 *  asset receipt: the reserve was hosted for the user, not paid out. */
const CARRIER_STATE_KEY: Record<CarrierState, string> = {
  pending: 'swap.pending',
  claimable: 'transaction.carrierClaimable',
  claimed: 'transaction.carrierClaimed',
  receipt: 'transaction.carrierReceipt',
  cancelled: 'transaction.cancelled',
  failed: 'transaction.carrierFailed',
}

export const carrierDeliveryLabel = (carrier: CarrierActivity, language = Language.English): string =>
  translate(language, CARRIER_STATE_KEY[carrier.state])
