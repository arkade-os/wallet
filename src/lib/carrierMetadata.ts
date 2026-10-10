const DECIMAL = /^(0|[1-9][0-9]*)$/
const MAX_SATS = 2_100_000_000_000_000n
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
export const isCanonicalTxid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
const isTransferId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9._:-]+$/.test(value) && value.length <= 128

export type CarrierMode = 'recycle' | 'purchase'

export type CarrierState = 'pending' | 'claimable' | 'claimed' | 'receipt' | 'cancelled' | 'failed'

const CARRIER_MODES: readonly string[] = ['recycle', 'purchase']
const CARRIER_STATES: readonly string[] = ['pending', 'claimable', 'claimed', 'receipt', 'cancelled', 'failed']

export interface CarrierActivity {
  version: 1
  mode: CarrierMode
  physicalSats: string
  loanSats: string
  purchasedSats: string
  receiptSats: string
  serviceFareSats: string

  taxi?: { transferId: string }
  state: CarrierState
  txids: string[]
}

export class CarrierMetadataError extends Error {
  readonly field: string
  constructor(field: string) {
    super(`invalid carrier metadata: ${field}`)
    this.name = 'CarrierMetadataError'
    this.field = field
  }
}

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
  if (typeof value !== 'string' || !DECIMAL.test(value)) {
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

const txidList = (value: unknown): string[] => {
  if (!Array.isArray(value)) throw new CarrierMetadataError('txids')
  return value.map((txid, index) => {
    if (!isCanonicalTxid(txid)) throw new CarrierMetadataError(`txids[${index}]`)
    return txid
  })
}

const taxiField = (value: unknown): { transferId: string } | undefined => {
  if (value === undefined) return undefined
  const taxi = asRecord(value)
  if (!taxi) throw new CarrierMetadataError('taxi')
  exactFields(taxi, new Set(['transferId']), 'taxi')
  const transferId = taxi?.transferId

  if (!isTransferId(transferId)) throw new CarrierMetadataError('taxi.transferId')
  return { transferId }
}

const sameSats = (a: bigint, b: bigint, field: string): void => {
  if (a !== b) throw new CarrierMetadataError(field)
}

export const parseCarrierActivity = (value: unknown): CarrierActivity => {
  const raw = asRecord(value)
  if (!raw) throw new CarrierMetadataError('carrier')
  exactFields(raw, CARRIER_FIELDS, 'carrier')

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
    sameSats(loanSats, 0n, 'loanSats')
    sameSats(receiptSats, 0n, 'receiptSats')
    sameSats(purchasedSats, physicalSats, 'purchasedSats')
  } else {
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

export const readCarrierActivity = (value: unknown): CarrierActivity | undefined => {
  try {
    return parseCarrierActivity(value)
  } catch {
    return undefined
  }
}

export const hasTaxiCarrier = (carrier: CarrierActivity | undefined): boolean => Boolean(carrier?.taxi?.transferId)
