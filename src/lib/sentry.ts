import type { Breadcrumb, ErrorEvent, EventHint } from '@sentry/react'
import { sha256 } from '@noble/hashes/sha2.js'
import { hex, utf8 } from '@scure/base'

/**
 * Check if the current environment is production (not localhost)
 * @returns true if the hostname is not localhost or 127.0.0.1
 */
export const isProduction = (): boolean => {
  const hostname = window.location.hostname
  return hostname !== 'localhost' && hostname !== '127.0.0.1'
}

/**
 * Check if Sentry should be initialized
 * @param dsn - The Sentry DSN from environment variables
 * @returns true if DSN is provided and environment is production
 */
export const shouldInitializeSentry = (dsn: string | undefined): boolean => {
  return Boolean(dsn) && isProduction()
}

const REDACTED = '[redacted]'

// 40 hex chars = 20 bytes (HASH160): the shortest bitcoin-sized value.
const HEX_RUN = /[0-9a-f]{40,}/gi
// 6 chars = the bech32 checksum, the minimum after the separator (BIP173).
const BECH32 = /\b(?:bc|tb|bcrt|ark|tark|nsec)1[02-9ac-hj-np-z]{6,}/gi
// BOLT11 needs its own pattern: BECH32 cannot reach the 'bc' inside 'lnbc…'
// because \b requires a boundary, and n→b is word-to-word. The amount field
// ([0-9]*[munp]?) sits between the prefix and the '1' separator.
const BOLT11 = /\b(?:lnbc|lntb|lntbs|lnbcrt|lnsb)[0-9]*[munp]?1[02-9ac-hj-np-z]{20,}/gi
const SENSITIVE_KEY =
  /preimage|secret|seckey|priv|mnemonic|seed|addr|script|pubkey|outpoint|auth|cookie|token|password|passphrase|api[-_]?key|session/i

// BOLT11 first: an invoice can contain a 40+ char [0-9a-f] run, and letting
// HEX_RUN punch a hole in it would leave the rest of the invoice in the clear.
const scrubString = (value: string): string =>
  value.replace(BOLT11, REDACTED).replace(HEX_RUN, REDACTED).replace(BECH32, REDACTED)

const scrubValue = (value: unknown, seen: WeakSet<object> = new WeakSet()): unknown => {
  if (typeof value === 'string') return scrubString(value)
  if (typeof value !== 'object' || value === null) return value
  if (seen.has(value)) return REDACTED
  seen.add(value)
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, seen))
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(val, seen)]),
  )
}

const toOrigin = (url: string): string => {
  try {
    return new URL(url, window.location.origin).origin
  } catch {
    return REDACTED
  }
}

/**
 * Keep request breadcrumbs to the origin: paths and query strings carry wallet
 * scripts and outpoints.
 */
export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb => {
  const { data, message } = breadcrumb
  const url = data?.url
  return {
    ...breadcrumb,
    ...(data
      ? { data: scrubValue(typeof url === 'string' ? { ...data, url: toOrigin(url) } : data) as Breadcrumb['data'] }
      : {}),
    ...(message ? { message: scrubString(message) } : {}),
  }
}

/**
 * Reports carry counts, amounts and error shapes only — key material, addresses
 * and scripts are removed whatever the call site attached.
 */
export const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  if (event.contexts) event.contexts = scrubValue(event.contexts) as ErrorEvent['contexts']
  if (event.extra) event.extra = scrubValue(event.extra) as ErrorEvent['extra']
  if (event.tags) event.tags = scrubValue(event.tags) as ErrorEvent['tags']
  if (event.request) event.request = scrubValue(event.request) as ErrorEvent['request']
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb)
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubString(exception.value)
  }
  return event
}

/**
 * Correlate reports coming from the same wallet without naming it. 16 hex chars
 * = 8 bytes, collision-free at wallet scale; the address hashed carries a
 * 32-byte key, so the digest has no enumerable input space.
 */
export const walletFingerprint = (address: string): string => hex.encode(sha256(utf8.decode(address))).slice(0, 16)

const isTranslateNoise = (event: ErrorEvent, hint: EventHint): boolean => {
  const error = hint.originalException
  return (
    (error instanceof Error && error.stack?.includes('translate.google.com')) ||
    event.exception?.values?.some((v) =>
      v.stacktrace?.frames?.some((f) => f.filename?.includes('translate.googleapis.com')),
    ) ||
    false
  )
}

export const beforeSend = (event: ErrorEvent, hint: EventHint): ErrorEvent | null =>
  isTranslateNoise(event, hint) ? null : scrubEvent(event)
