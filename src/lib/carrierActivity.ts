/**
 * The wallet's reader for the optional `carrier` descriptor: a *member* of an
 * existing operation, never one of its own. This is the trusted-boundary parse,
 * so a malformed or unknown-version descriptor is dropped rather than repaired.
 */

const MAX_SATS = 2_100_000_000_000_000n

const CANONICAL_DECIMAL = /^(0|[1-9][0-9]*)$/
const TRANSFER_ID = /^[A-Za-z0-9._:-]+$/

export type CarrierMode = 'recycle' | 'purchase'

export type CarrierState = 'pending' | 'claimable' | 'claimed' | 'receipt' | 'cancelled' | 'failed'

const CARRIER_MODES: readonly string[] = ['recycle', 'purchase']
const CARRIER_STATES: readonly string[] = ['pending', 'claimable', 'claimed', 'receipt', 'cancelled', 'failed']

/** The agreed descriptor, `activity-contract.md`'s `CarrierActivity`. Every
 *  amount is a canonical nonnegative decimal string read with `BigInt`, never
 *  through `Number`. */
export interface CarrierActivity {
  version: 1
  mode: CarrierMode
  physicalSats: string
  loanSats: string
  purchasedSats: string
  receiptSats: string
  serviceFareSats: string
  /** Absent for a direct solver carrier purchase; present only for real Taxi. */
  taxi?: { transferId: string }
  state: CarrierState
  txids: string[]
}

/** A field that is present but is not what the contract requires. */
export class CarrierMetadataError extends Error {
  readonly field: string
  constructor(field: string) {
    super(`invalid carrier metadata: ${field}`)
    this.name = 'CarrierMetadataError'
    this.field = field
  }
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined

/** The descriptor's own keys. A field this reader does not know is a refusal. */
const CARRIER_FIELDS = new Set([
  'version',
  'mode',
  'physicalSats',
  'loanSats',
  'purchasedSats',
  'receiptSats',
  'serviceFareSats',
  'taxi',
  'state',
  'txids',
])

const exactFields = (raw: Record<string, unknown>, allowed: Set<string>, path: string): void => {
  for (const key of Object.keys(raw)) if (!allowed.has(key)) throw new CarrierMetadataError(`${path}.${key}`)
}

const decimalSats = (value: unknown, field: string): bigint => {
  if (typeof value !== 'string' || !CANONICAL_DECIMAL.test(value)) {
    throw new CarrierMetadataError(field)
  }
  const sats = BigInt(value)
  if (sats > MAX_SATS) throw new CarrierMetadataError(field)
  return sats
}

const enumField = <T extends string>(value: unknown, allowed: readonly string[], field: string): T => {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new CarrierMetadataError(field)
  return value as T
}

const TXID = /^[0-9a-f]{64}$/

const txidList = (value: unknown): string[] => {
  if (!Array.isArray(value)) throw new CarrierMetadataError('txids')
  return value.map((txid, index) => {
    if (typeof txid !== 'string' || !TXID.test(txid)) throw new CarrierMetadataError(`txids[${index}]`)
    return txid
  })
}

const taxiField = (value: unknown): { transferId: string } | undefined => {
  if (value === undefined) return undefined
  const taxi = asRecord(value)
  if (!taxi) throw new CarrierMetadataError('taxi')
  exactFields(taxi, new Set(['transferId']), 'taxi')
  const transferId = taxi?.transferId
  // Canonical and non-blank: this id names a durable Taxi operation, so
  // whitespace or an unbounded string is not an identifier we can read back.
  if (typeof transferId !== 'string' || !TRANSFER_ID.test(transferId) || transferId.length > 128) {
    throw new CarrierMetadataError('taxi.transferId')
  }
  return { transferId }
}

const sameSats = (a: bigint, b: bigint, field: string): void => {
  if (a !== b) throw new CarrierMetadataError(field)
}

/** `readCarrierActivity`'s strict half: throws on the first field that does not
 *  meet the contract, naming which one. */
export const parseCarrierActivity = (value: unknown): CarrierActivity => {
  const raw = asRecord(value)
  if (!raw) throw new CarrierMetadataError('carrier')
  exactFields(raw, CARRIER_FIELDS, 'carrier')
  // The version gate comes first: a later producer's descriptor is not this
  // one, and reading its fields by our shape would be guessing.
  if (raw.version !== 1) throw new CarrierMetadataError('version')

  const mode = enumField<CarrierMode>(raw.mode, CARRIER_MODES, 'mode')
  const state = enumField<CarrierState>(raw.state, CARRIER_STATES, 'state')
  const physicalSats = decimalSats(raw.physicalSats, 'physicalSats')
  const loanSats = decimalSats(raw.loanSats, 'loanSats')
  const purchasedSats = decimalSats(raw.purchasedSats, 'purchasedSats')
  const receiptSats = decimalSats(raw.receiptSats, 'receiptSats')
  const serviceFareSats = decimalSats(raw.serviceFareSats, 'serviceFareSats')
  const taxi = taxiField(raw.taxi)
  const txids = txidList(raw.txids)

  if (mode === 'purchase') {
    // A purchase owes nothing back: the loan and the receipt are both zero and
    // the buyer bought exactly the physical carrier.
    sameSats(loanSats, 0n, 'loanSats')
    sameSats(receiptSats, 0n, 'receiptSats')
    sameSats(purchasedSats, physicalSats, 'purchasedSats')
  } else {
    // Recycle: Taxi advances the loan and hosts a receipt reserve, which
    // together are the whole carrier. The BOUGHT part is exactly that reserve,
    // so recycle329/receipt1 is one sat bought, not none.
    if (loanSats <= 0n) throw new CarrierMetadataError('loanSats')
    if (receiptSats <= 0n) throw new CarrierMetadataError('receiptSats')
    sameSats(loanSats + receiptSats, physicalSats, 'loanSats+receiptSats')
    sameSats(purchasedSats, receiptSats, 'purchasedSats')
  }

  return {
    version: 1,
    mode,
    physicalSats: physicalSats.toString(),
    loanSats: loanSats.toString(),
    purchasedSats: purchasedSats.toString(),
    receiptSats: receiptSats.toString(),
    serviceFareSats: serviceFareSats.toString(),
    ...(taxi ? { taxi } : {}),
    state,
    txids,
  }
}

/** A descriptor read from a locally persisted operation record. `undefined`
 *  for anything the contract does not describe: the
 *  surrounding activity is the user's history either way, and outlives a
 *  descriptor this wallet cannot read. */
export const readCarrierActivity = (value: unknown): CarrierActivity | undefined => {
  try {
    return parseCarrierActivity(value)
  } catch {
    return undefined
  }
}

/** Whether Taxi actually supplied this carrier: a direct solver purchase has
 *  no `taxi` and must never earn the annotation. */
export const hasTaxiCarrier = (carrier: CarrierActivity | undefined): boolean => Boolean(carrier?.taxi?.transferId)

const asBoundedSats = (value: string): bigint => {
  const sats = BigInt(value)
  if (sats > MAX_SATS) throw new CarrierMetadataError('sats')
  return sats
}

/** `1234` -> `1,234`. A sats figure has no decimals, so grouping is the only
 *  formatting it gets. */
export const formatCarrierSats = (value: string): string => asBoundedSats(value).toLocaleString('en-US')

const pluralSats = (value: string): string =>
  `${formatCarrierSats(value)} ${asBoundedSats(value) === 1n ? 'sat' : 'sats'}`

/** `Borrowed 329 sats` — the repayable half, which the user does not own. */
export const carrierBorrowedLabel = (carrier: CarrierActivity): string => `Borrowed ${pluralSats(carrier.loanSats)}`

/** The receipt-hosting reserve, named as the reserve it is. */
export const carrierPurchasedReceiptLabel = (carrier: CarrierActivity): string =>
  `${pluralSats(carrier.purchasedSats)} (receipt reserve)`

/** The whole physical carrier, for the mode where the user bought all of it. */
export const carrierPurchasedLiteralLabel = (carrier: CarrierActivity): string => pluralSats(carrier.purchasedSats)

export const carrierServiceFareLabel = (carrier: CarrierActivity): string =>
  `${formatCarrierSats(carrier.serviceFareSats)} ${asBoundedSats(carrier.serviceFareSats) === 1n ? 'sat' : 'sats'}`

/** The delivery state as the receipt names it. `receipt` is a merge-only
 *  asset receipt: the reserve was hosted for the user, not paid out. */
export const CARRIER_STATE_LABEL: Record<CarrierState, string> = {
  pending: 'Pending',
  claimable: 'Claimable',
  claimed: 'Claimed',
  receipt: 'Merge-only receipt',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

export const carrierDeliveryLabel = (carrier: CarrierActivity): string => CARRIER_STATE_LABEL[carrier.state]
