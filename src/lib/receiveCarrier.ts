import { hex } from '@scure/base'
import { asset } from '@arkade-os/sdk'
const DECIMAL = /^(0|[1-9][0-9]*)$/
const MAX_SATS = 2_100_000_000_000_000n
const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined

const CARRIER_QUOTE_ID_MAX = 128
const CARRIER_TAXI_URL_MAX = 512

export interface ReceiverPaidCarrierQuote {
  quoteId: string
  receiveAddress: string
  senderKey: string
  assetId: string
  physicalSats: bigint
  loanSats: bigint
  expiresAt: number
}

export type TaxiIdentity = { url: string; operatorKey: string }

export type ArkadeCarrierChoice =
  | { mode: 'purchase' }
  | { mode: 'recycleReceiver'; quote: ReceiverPaidCarrierQuote; taxi: TaxiIdentity }

export type ArkadeCarrierRequest =
  | { mode: 'purchase' }
  | { mode: 'recycle_receiver'; quoteId: string; taxiUrl: string; taxiKey: string }

export interface VerifiedCarrierTerms {
  mode: 'purchase' | 'recycle_receiver'
  physicalSats: bigint
  loanSats: bigint
  receiptSats: bigint
  serviceFareSats: bigint
  pricedSats: bigint
  expiresAt: number
  quoteId?: string
}

const XONLY_HEX = /^[0-9a-f]{64}$/
const MAX_BITCOIN_SATS_DECIMAL = MAX_SATS.toString()

const parseSatsField = (value: unknown, field: string): bigint => {
  if (typeof value !== 'string' || !DECIMAL.test(value)) {
    throw new Error('carrier echo ' + field + ' must be a canonical decimal string')
  }
  if (
    value.length > MAX_BITCOIN_SATS_DECIMAL.length ||
    (value.length === MAX_BITCOIN_SATS_DECIMAL.length && value > MAX_BITCOIN_SATS_DECIMAL)
  ) {
    throw new Error('carrier echo ' + field + ' exceeds the Bitcoin supply')
  }
  return BigInt(value)
}

export const parseTopLevelCarrierSats = (value: unknown): bigint => {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('top-level carrier_sats must be a non-negative safe integer')
    }
    if (value > Number(MAX_SATS)) {
      throw new Error('top-level carrier_sats exceeds the Bitcoin supply')
    }
    return BigInt(value)
  }
  return parseSatsField(value, 'top-level carrier_sats')
}

const parseExpiresAt = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error('carrier echo expires_at must be a safe positive unix time')
  }
  return value
}

export function validateReceiverPaidQuoteShape(q: ReceiverPaidCarrierQuote): void {
  if (!q || typeof q !== 'object') throw new Error('carrier receiver-paid quote is required')
  if (typeof q.quoteId !== 'string' || !q.quoteId.length || q.quoteId.length > CARRIER_QUOTE_ID_MAX) {
    throw new Error('carrier receiver-paid quoteId must be 1..128 chars')
  }
  if (typeof q.receiveAddress !== 'string' || !q.receiveAddress.length) {
    throw new Error('carrier receiver-paid quote needs a receiveAddress')
  }
  if (typeof q.senderKey !== 'string' || !XONLY_HEX.test(q.senderKey)) {
    throw new Error('carrier receiver-paid quote senderKey must be lowercase x-only hex')
  }
  if (typeof q.assetId !== 'string' || !q.assetId.length) {
    throw new Error('carrier receiver-paid quote needs an assetId')
  }
  try {
    asset.AssetId.fromString(q.assetId)
  } catch {
    throw new Error('carrier receiver-paid quote assetId is not a valid SDK asset id')
  }
  const amounts: [string, unknown][] = [
    ['physicalSats', q.physicalSats],
    ['loanSats', q.loanSats],
  ]
  for (const [name, v] of amounts) {
    if (typeof v !== 'bigint' || v < 0n) {
      throw new Error('carrier receiver-paid quote ' + name + ' must be a non-negative bigint')
    }
    if (v > MAX_SATS) {
      throw new Error('carrier receiver-paid quote ' + name + ' exceeds the Bitcoin supply')
    }
  }
  if (q.physicalSats <= 0n) throw new Error('carrier receiver-paid quote physicalSats must be positive')
  if (q.loanSats !== q.physicalSats) {
    throw new Error('carrier receiver-paid quote loanSats must equal physical')
  }
  if (!Number.isSafeInteger(q.expiresAt) || q.expiresAt <= 0) {
    throw new Error('carrier receiver-paid quote expiresAt must be safe positive unix time')
  }
}

export function encodeCarrierRequest(choice: ArkadeCarrierRequest): Record<string, unknown> {
  if (!asRecord(choice)) throw new Error('carrier request must be an object')
  if (choice.mode !== 'purchase' && choice.mode !== 'recycle_receiver') {
    throw new Error('carrier request mode must be purchase or recycle_receiver')
  }
  const allowed = choice.mode === 'purchase' ? new Set(['mode']) : new Set(['mode', 'quoteId', 'taxiUrl', 'taxiKey'])
  for (const key of Object.keys(choice)) {
    if (!allowed.has(key)) throw new Error('carrier request carries unknown field ' + key)
  }
  if (choice.mode === 'purchase') return { mode: 'purchase' }
  if (typeof choice.quoteId !== 'string' || !choice.quoteId.length || choice.quoteId.length > CARRIER_QUOTE_ID_MAX) {
    throw new Error(`carrier ${choice.mode} quoteId must be 1..128 chars`)
  }
  if (typeof choice.taxiUrl !== 'string' || !choice.taxiUrl.length || choice.taxiUrl.length > CARRIER_TAXI_URL_MAX) {
    throw new Error('carrier recycle_receiver taxiUrl must be 1..512 chars')
  }
  if (typeof choice.taxiKey !== 'string' || !XONLY_HEX.test(choice.taxiKey)) {
    throw new Error('carrier recycle_receiver taxiKey must be 64 lowercase hex chars')
  }
  return {
    mode: 'recycle_receiver',
    quote_id: choice.quoteId,
    taxi_url: choice.taxiUrl,
    taxi_key: choice.taxiKey,
  }
}

export function assertCarrierRequestAllowed(
  choice: ArkadeCarrierRequest | undefined,
  assets: { wantAsset?: asset.AssetId; offerAsset?: asset.AssetId },
): void {
  if (choice === undefined) return
  if (assets.wantAsset === undefined || assets.offerAsset !== undefined) {
    throw new Error('carrier negotiation is only available for BTC->asset swaps')
  }
}

export function parseCarrierEcho(
  raw: unknown,
  expected: {
    mode: 'purchase' | 'recycle_receiver'
    quoteId?: string
    taxiUrl?: string
    taxiKey?: string
  },
): VerifiedCarrierTerms {
  const r = asRecord(raw)
  if (!r) throw new Error('carrier echo must be an object')
  if (r.mode !== expected.mode) throw new Error('carrier echo mode differs from the request')
  const keys = new Set(Object.keys(r))
  const base = new Set([
    'mode',
    'physical_sats',
    'loan_sats',
    'receipt_sats',
    'service_fare_sats',
    'priced_sats',
    'expires_at',
  ])
  const allowed = expected.mode === 'recycle_receiver' ? new Set([...base, 'quote_id', 'taxi_url', 'taxi_key']) : base
  for (const k of keys) {
    if (!allowed.has(k)) throw new Error('carrier echo carries unknown field ' + k)
  }
  for (const k of allowed) {
    if (!keys.has(k)) throw new Error('carrier echo is missing ' + k)
  }
  let quoteId: string | undefined
  if (expected.mode === 'recycle_receiver') {
    const qid = r.quote_id
    if (typeof qid !== 'string' || !qid.length || qid.length > CARRIER_QUOTE_ID_MAX) {
      throw new Error('carrier echo quote_id must be 1..128 chars')
    }
    if (qid !== expected.quoteId) throw new Error('carrier echo quote_id differs from the request')
    quoteId = qid
    const taxiUrl = r.taxi_url
    if (typeof taxiUrl !== 'string' || !taxiUrl.length || taxiUrl.length > CARRIER_TAXI_URL_MAX) {
      throw new Error('carrier echo taxi_url must be 1..512 chars')
    }
    if (taxiUrl !== expected.taxiUrl) throw new Error('carrier echo taxi_url differs from the request')
    const taxiKey = r.taxi_key
    if (typeof taxiKey !== 'string' || !XONLY_HEX.test(taxiKey)) {
      throw new Error('carrier echo taxi_key must be 64 lowercase hex chars')
    }
    if (taxiKey !== expected.taxiKey) throw new Error('carrier echo taxi_key differs from the request')
  }
  const physical = parseSatsField(r.physical_sats, 'physical_sats')
  const loan = parseSatsField(r.loan_sats, 'loan_sats')
  const receipt = parseSatsField(r.receipt_sats, 'receipt_sats')
  const serviceFare = parseSatsField(r.service_fare_sats, 'service_fare_sats')
  const priced = parseSatsField(r.priced_sats, 'priced_sats')
  const expiresAt = parseExpiresAt(r.expires_at)
  if (physical <= 0n) throw new Error('carrier echo physical_sats must be positive')
  if (expected.mode === 'purchase') {
    if (loan !== 0n || receipt !== 0n || serviceFare !== 0n) {
      throw new Error('carrier purchase echo must carry zero loan/receipt/fare')
    }
    if (priced !== physical) throw new Error('carrier purchase priced must equal physical')
  } else {
    if (loan !== physical) {
      throw new Error('carrier receiver-paid echo loan must equal physical')
    }
    if (receipt !== 0n) {
      throw new Error('carrier receiver-paid echo must carry a zero receipt')
    }
    if (serviceFare !== 0n) {
      throw new Error('carrier receiver-paid echo must carry a zero service fare')
    }
    if (priced !== 0n) {
      throw new Error('carrier receiver-paid echo must carry a zero priced_sats')
    }
  }
  return {
    mode: expected.mode,
    physicalSats: physical,
    loanSats: loan,
    receiptSats: receipt,
    serviceFareSats: serviceFare,
    pricedSats: priced,
    expiresAt,
    ...(quoteId !== undefined ? { quoteId } : {}),
  }
}

export function assertReceiverPaidEchoMatchesExpected(
  echo: VerifiedCarrierTerms,
  expected: ReceiverPaidCarrierQuote,
): void {
  if (echo.mode !== 'recycle_receiver' || echo.quoteId !== expected.quoteId) {
    throw new Error('carrier echo quote differs from the expected descriptor')
  }
  if (
    echo.physicalSats !== expected.physicalSats ||
    echo.loanSats !== expected.loanSats ||
    echo.receiptSats !== 0n ||
    echo.serviceFareSats !== 0n ||
    echo.pricedSats !== 0n
  ) {
    throw new Error('carrier echo amounts differ from the expected descriptor')
  }
  if (echo.expiresAt > expected.expiresAt) {
    throw new Error('carrier echo must not extend the expected expiry')
  }
}

export const carrierNow = (now?: number): number => now ?? Math.floor(Date.now() / 1000)

export const normalizeXonlyHex = (value: Uint8Array | string): string => {
  const encoded = typeof value === 'string' ? value : hex.encode(value)
  if (!XONLY_HEX.test(encoded)) throw new Error('expected lowercase x-only hex')
  return encoded
}
