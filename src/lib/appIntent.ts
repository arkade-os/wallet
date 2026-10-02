// App links. An external site opens the wallet with a query string; the wallet
// never spends or shares anything until the user agrees, then it navigates to
// the caller's callback URL.
//
//   ?action=connect&callback=<https url>
//     Consent screen. On approval the callback receives
//     address=<current Arkade receive address>&pubkey=<x-only hex>.
//     Decline sends error=denied.
//
//   ?action=send&request=<percent-encoded BIP21>&callback=<optional https url>
//     Opens the normal send screen prefilled with that payment request.
//     Success sends status=sent and txid when there is one.
//     Leaving the send screen sends error=denied.
//
// Installed Chromium PWAs also register the web+arkade protocol (see
// public/manifest.json). The browser opens those in the hash (`/#%s`):
//
//   web+arkade://connect?callback=<https url>
//   web+arkade://send?request=<percent-encoded BIP21>&callback=<optional>
//
// Same params, same confirmation. Ark notes stay on that hash and are ignored
// here. Safari has no manifest protocol handler, so those apps use the https
// link and it opens in the browser.
//
// Build the link with URLSearchParams. A BIP21 contains `?` and `&`, and a
// callback is itself a URL — concatenating those raw breaks the query string.
// The callback is not a template: the wallet appends its own params and will
// not leave a pre-filled address or status in place.
//
// Limits, on purpose: https callbacks only (http solely for localhost,
// 127.0.0.1, and [::1]), no username/password in the callback, and a short search string
// so a bolt11 BIP21 fits and an unbounded URL does not. One action per link.

import { decodeBip21, isBip21 } from './bip21'

export const APP_INTENT_MAX_SEARCH_LENGTH = 6_000
const MAX_CALLBACK_LENGTH = 2_000
const MAX_REQUEST_LENGTH = 4_500

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export type AppIntentErrorCode =
  | 'too-long'
  | 'unknown-action'
  | 'missing-callback'
  | 'bad-callback'
  | 'missing-request'
  | 'bad-request'

export type AppIntent = { action: 'connect'; callback: string } | { action: 'send'; request: string; callback?: string }

export type AppIntentParse =
  | { ok: true; intent: AppIntent }
  | { ok: false; error: AppIntentErrorCode; callback?: string }

/** In-memory flow value. `started` / `prefilled` are not part of the URL. */
export type AppIntentState =
  | { status: 'connect'; callback: string }
  | { status: 'send'; request: string; callback?: string; started?: boolean; prefilled?: boolean }
  | { status: 'invalid'; error: AppIntentErrorCode; callback?: string }

export type AppIntentStep = 'none' | 'connect' | 'send' | 'invalid'

const callbackOf = (params: URLSearchParams): { callback?: string; error?: 'missing-callback' | 'bad-callback' } => {
  const raw = params.get('callback')
  if (raw == null || raw.trim() === '') return { error: 'missing-callback' }
  const callback = validCallback(raw.trim())
  if (!callback) return { error: 'bad-callback' }
  return { callback }
}

/** Parse `window.location.search`. No `action` param means this is not an app link. */
export const parseAppIntent = (search: string): AppIntentParse | undefined => {
  if (!search || search === '?') return undefined

  if (search.length > APP_INTENT_MAX_SEARCH_LENGTH) {
    return /(?:^|[?&])action=/.test(search) ? { ok: false, error: 'too-long' } : undefined
  }

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const action = params.get('action')?.trim().toLowerCase()
  if (!action) return undefined

  if (action === 'connect') {
    const { callback, error } = callbackOf(params)
    if (!callback || error) return { ok: false, error: error ?? 'missing-callback' }
    return { ok: true, intent: { action: 'connect', callback } }
  }

  if (action === 'send') {
    const requestRaw = params.get('request')
    if (requestRaw == null || requestRaw.trim() === '') return { ok: false, error: 'missing-request' }
    const request = validPaymentRequest(requestRaw)
    if (!request) return { ok: false, error: 'bad-request', ...optionalCallback(params) }

    const rawCallback = params.get('callback')
    if (rawCallback == null || rawCallback.trim() === '') return { ok: true, intent: { action: 'send', request } }
    const callback = validCallback(rawCallback.trim())
    if (!callback) return { ok: false, error: 'bad-callback' }
    return { ok: true, intent: { action: 'send', request, callback } }
  }

  return { ok: false, error: 'unknown-action', ...optionalCallback(params) }
}

export const toAppIntentState = (parsed: AppIntentParse): AppIntentState => {
  if (!parsed.ok) return { status: 'invalid', error: parsed.error, callback: parsed.callback }
  if (parsed.intent.action === 'connect') return { status: 'connect', callback: parsed.intent.callback }
  return { status: 'send', request: parsed.intent.request, callback: parsed.intent.callback }
}

/** Where a ready wallet should go. A send is handed off once (`started`). */
export const nextAppIntentNavigation = (intent: AppIntentState | undefined, ready: boolean): AppIntentStep => {
  if (!intent || !ready) return 'none'
  if (intent.status === 'send') return intent.started ? 'none' : 'send'
  if (intent.status === 'connect') return 'connect'
  return 'invalid'
}

export const callbackHost = (callback: string): string => {
  try {
    return new URL(callback).host
  } catch {
    return ''
  }
}

/** Append the wallet's outcome. A denial drops any address the caller pre-filled. */
export const callbackUrl = (callback: string, params: Record<string, string | undefined>): string => {
  const url = new URL(callback)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) url.searchParams.delete(key)
    else url.searchParams.set(key, value)
  }
  if (params.error) {
    url.searchParams.delete('address')
    url.searchParams.delete('pubkey')
    url.searchParams.delete('status')
    url.searchParams.delete('txid')
  }
  if (params.address || params.status) url.searchParams.delete('error')
  return url.toString()
}

export const redirectToCallback = (callback: string, params: Record<string, string | undefined>): void => {
  window.location.assign(callbackUrl(callback, params))
}

/** Drop the app-link params and leave the rest of the URL (hash, `dev`) alone. */
export const stripAppIntentParams = (): void => {
  const url = new URL(window.location.href)
  let changed = false
  for (const key of ['action', 'callback', 'request']) {
    if (!url.searchParams.has(key)) continue
    url.searchParams.delete(key)
    changed = true
  }
  if (!changed) return
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

/**
 * The manifest protocol handler stores `web+arkade://...` in the hash.
 * Returns the equivalent `?action=` search string, or nothing for ark notes
 * and any other hash.
 */
export const protocolIntentSearch = (hash: string): string | undefined => {
  const fragment = protocolFragment(hash)
  if (!fragment) return undefined
  let url: URL
  try {
    url = new URL(fragment)
  } catch {
    return undefined
  }
  if (url.protocol !== 'web+arkade:') return undefined
  const action = protocolAction(url)
  if (action !== 'connect' && action !== 'send') return undefined
  const params = new URLSearchParams(url.search)
  params.set('action', action)
  return `?${params.toString()}`
}

/** Read the launch URL once. Later reads see the stripped query and return nothing. */
export const readInitialAppIntent = (): AppIntentState | undefined => {
  if (typeof window === 'undefined') return undefined
  const fromSearch = parseAppIntent(window.location.search)
  if (fromSearch) {
    stripAppIntentParams()
    return toAppIntentState(fromSearch)
  }
  const fromProtocol = protocolIntentSearch(window.location.hash)
  if (!fromProtocol) return undefined
  const parsed = parseAppIntent(fromProtocol)
  if (!parsed) return undefined
  stripProtocolIntentHash()
  return toAppIntentState(parsed)
}

const protocolFragment = (hash: string): string | undefined => {
  let fragment = hash.startsWith('#') ? hash.slice(1) : hash
  if (!fragment) return undefined
  if (fragment.toLowerCase().startsWith('web+arkade:')) return fragment
  // The handler substitutes %s percent-encoded. location.hash usually decodes
  // that once; accept the still-encoded form too.
  try {
    const decoded = decodeURIComponent(fragment)
    if (decoded.toLowerCase().startsWith('web+arkade:')) return decoded
  } catch {
    return undefined
  }
  return undefined
}

const protocolAction = (url: URL): string => {
  if (url.hostname) {
    if (url.pathname && url.pathname !== '/') return ''
    return url.hostname.toLowerCase()
  }
  return url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase()
}

/** Chromium manifest protocol handlers. Safari, Firefox, and every iOS browser cannot. */
export const browserHandlesAppProtocol = (ua: string = navigator.userAgent): boolean => {
  if (/iPhone|iPad|iPod|CriOS|EdgiOS|FxiOS|OPiOS/.test(ua)) return false
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return false
  return /Chrome|Chromium|Edg\//.test(ua)
}

/** Same connect/send link, as the installed app's protocol. */
export const toAppProtocolUrl = (intent: AppIntentState): string | undefined => {
  if (intent.status === 'invalid') return undefined
  const url = new URL(`web+arkade://${intent.status}`)
  if (intent.status === 'connect') url.searchParams.set('callback', intent.callback)
  else {
    url.searchParams.set('request', intent.request)
    if (intent.callback) url.searchParams.set('callback', intent.callback)
  }
  return url.toString()
}

/**
 * Open the installed app with this request. Safari cannot, so the caller
 * keeps the user on this page instead of navigating to a dead scheme.
 */
export const openInstalledApp = (
  intent: AppIntentState,
  options?: { ua?: string; assign?: (url: string) => void },
): 'opened' | 'unavailable' => {
  const ua = options?.ua ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent)
  if (!browserHandlesAppProtocol(ua)) return 'unavailable'
  const url = toAppProtocolUrl(intent)
  if (!url) return 'unavailable'
  ;(options?.assign ?? ((href: string) => window.location.assign(href)))(url)
  return 'opened'
}

const stripProtocolIntentHash = (): void => {
  const url = new URL(window.location.href)
  if (!url.hash) return
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)
}

const optionalCallback = (params: URLSearchParams): { callback?: string } => {
  const raw = params.get('callback')
  if (raw == null || raw.trim() === '') return {}
  const callback = validCallback(raw.trim())
  return callback ? { callback } : {}
}

const validCallback = (value: string): string | undefined => {
  if (value.length > MAX_CALLBACK_LENGTH) return undefined
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.username || url.password) return undefined
  if (url.protocol === 'https:') return url.toString()
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) return url.toString()
  return undefined
}

const validPaymentRequest = (value: string): string | undefined => {
  const request = value.trim()
  if (!request || request.length > MAX_REQUEST_LENGTH) return undefined
  if (!isBip21(request)) return undefined
  try {
    const decoded = decodeBip21(request)
    if (!decoded.address && !decoded.arkAddress && !decoded.invoice && !decoded.lnUrl) return undefined
    return request
  } catch {
    return undefined
  }
}
