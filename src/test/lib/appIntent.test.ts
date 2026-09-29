import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  APP_INTENT_MAX_SEARCH_LENGTH,
  callbackUrl,
  nextAppIntentNavigation,
  parseAppIntent,
  browserHandlesAppProtocol,
  openInstalledApp,
  protocolIntentSearch,
  readInitialAppIntent,
  toAppProtocolUrl,
  stripAppIntentParams,
  toAppIntentState,
} from '../../lib/appIntent'

const ARK =
  'tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl'
const CALLBACK = 'https://arkade.trade/connect?from=wallet'
const REQUEST = `bitcoin:?ark=${ARK}&amount=0.001`

const link = (params: Record<string, string>): string => {
  const url = new URL('https://arkade.money/')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.search
}

describe('parseAppIntent', () => {
  it('ignores a normal wallet open', () => {
    expect(parseAppIntent('')).toBeUndefined()
    expect(parseAppIntent('?dev=true')).toBeUndefined()
  })

  it('round-trips a connect link built with URLSearchParams', () => {
    expect(parseAppIntent(link({ action: 'connect', callback: CALLBACK }))).toEqual({
      ok: true,
      intent: { action: 'connect', callback: CALLBACK },
    })
  })

  it('accepts http only for a local callback', () => {
    expect(parseAppIntent(link({ action: 'connect', callback: 'http://localhost:3002/back' }))?.ok).toBe(true)
    expect(parseAppIntent(link({ action: 'connect', callback: 'http://127.0.0.1/back' }))?.ok).toBe(true)
    expect(parseAppIntent(link({ action: 'connect', callback: 'http://arkade.trade/back' }))).toEqual({
      ok: false,
      error: 'bad-callback',
    })
  })

  it('rejects callbacks that are not a plain https url', () => {
    for (const callback of [
      'javascript:alert(1)',
      'https://user:pass@arkade.trade/connect',
      '/connect',
      'arkade.trade/connect',
    ]) {
      expect(parseAppIntent(link({ action: 'connect', callback }))?.ok).toBe(false)
    }
    expect(parseAppIntent('?action=connect')).toEqual({ ok: false, error: 'missing-callback' })
  })

  it('round-trips a send link and keeps the BIP21 intact', () => {
    const parsed = parseAppIntent(link({ action: 'send', request: REQUEST, callback: CALLBACK }))
    expect(parsed).toEqual({
      ok: true,
      intent: { action: 'send', request: REQUEST, callback: CALLBACK },
    })
  })

  it('allows a send with no callback', () => {
    expect(parseAppIntent(link({ action: 'send', request: REQUEST }))).toEqual({
      ok: true,
      intent: { action: 'send', request: REQUEST },
    })
  })

  it('rejects a send that is not a payment request', () => {
    expect(parseAppIntent(link({ action: 'send', request: 'not-a-bitcoin-uri', callback: CALLBACK }))).toEqual({
      ok: false,
      error: 'bad-request',
      callback: CALLBACK,
    })
    expect(parseAppIntent('?action=send')).toEqual({ ok: false, error: 'missing-request' })
    expect(parseAppIntent(link({ action: 'send', request: 'bitcoin:' }))).toEqual({
      ok: false,
      error: 'bad-request',
    })
  })

  it('keeps a valid callback on an unknown action', () => {
    expect(parseAppIntent(link({ action: 'getPubkey', callback: CALLBACK }))).toEqual({
      ok: false,
      error: 'unknown-action',
      callback: CALLBACK,
    })
  })

  it('rejects an over-long search that is an app link, and ignores one that is not', () => {
    const huge = `?action=connect&callback=${'a'.repeat(APP_INTENT_MAX_SEARCH_LENGTH)}`
    expect(parseAppIntent(huge)).toEqual({ ok: false, error: 'too-long' })
    expect(parseAppIntent(`?dev=${'a'.repeat(APP_INTENT_MAX_SEARCH_LENGTH)}`)).toBeUndefined()
  })
})

describe('callbackUrl', () => {
  it('appends the address and drops a pre-seeded error', () => {
    const url = callbackUrl(`${CALLBACK}&error=denied&address=not-from-the-wallet`, {
      address: 'tark1abc',
      pubkey: 'aa',
    })
    const params = new URL(url).searchParams
    expect(params.get('from')).toBe('wallet')
    expect(params.get('address')).toBe('tark1abc')
    expect(params.get('pubkey')).toBe('aa')
    expect(params.get('error')).toBeNull()
  })

  it('a denial does not echo a pre-filled address', () => {
    const params = new URL(callbackUrl(`${CALLBACK}&address=not-from-the-wallet`, { error: 'denied' })).searchParams
    expect(params.get('error')).toBe('denied')
    expect(params.get('address')).toBeNull()
    expect(params.get('pubkey')).toBeNull()
  })

  it('preserves the callback hash', () => {
    expect(callbackUrl('https://arkade.trade/vault#paid', { status: 'sent', txid: 'abc' })).toBe(
      'https://arkade.trade/vault?status=sent&txid=abc#paid',
    )
  })
})

describe('nextAppIntentNavigation', () => {
  const send = toAppIntentState({ ok: true, intent: { action: 'send', request: REQUEST, callback: CALLBACK } })

  it('waits until the wallet is ready, then hands a send off once', () => {
    expect(nextAppIntentNavigation(send, false)).toBe('none')
    expect(nextAppIntentNavigation(send, true)).toBe('send')
    expect(send?.status === 'send' && nextAppIntentNavigation({ ...send, started: true }, true)).toBe('none')
  })

  it('routes connect and invalid links to the consent screen', () => {
    expect(nextAppIntentNavigation({ status: 'connect', callback: CALLBACK }, true)).toBe('connect')
    expect(nextAppIntentNavigation({ status: 'invalid', error: 'bad-request' }, true)).toBe('invalid')
  })
})

describe('protocolIntentSearch', () => {
  it('accepts web+arkade connect and send, with or without slashes', () => {
    const connect = protocolIntentSearch(`web+arkade:connect?callback=${encodeURIComponent(CALLBACK)}`)
    expect(parseAppIntent(connect ?? '')).toEqual({
      ok: true,
      intent: { action: 'connect', callback: CALLBACK },
    })

    const sendUrl = new URL('web+arkade://send')
    sendUrl.searchParams.set('request', REQUEST)
    expect(parseAppIntent(protocolIntentSearch(sendUrl.href) ?? '')).toEqual({
      ok: true,
      intent: { action: 'send', request: REQUEST },
    })
  })
})

describe('openInstalledApp', () => {
  const connect = { status: 'connect' as const, callback: CALLBACK }
  const safari =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  const chrome =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  it('recognizes Safari and iOS as unable to open the installed app', () => {
    expect(browserHandlesAppProtocol(safari)).toBe(false)
    expect(browserHandlesAppProtocol(iphone)).toBe(false)
    expect(browserHandlesAppProtocol(chrome)).toBe(true)
    expect(openInstalledApp(connect, { ua: safari, assign: () => {} })).toBe('unavailable')
  })

  it('on Chrome, Open in App navigates to the web+arkade link', () => {
    const assign = vi.fn()
    expect(openInstalledApp(connect, { ua: chrome, assign })).toBe('opened')
    expect(assign).toHaveBeenCalledWith(toAppProtocolUrl(connect))
    expect(toAppProtocolUrl(connect)).toContain('web+arkade://connect')
    expect(toAppProtocolUrl(connect)).toContain(encodeURIComponent(CALLBACK))
  })
})

describe('readInitialAppIntent', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('reads the launch query and strips only the app-link params', () => {
    window.history.replaceState(null, '', `/${link({ action: 'connect', callback: CALLBACK })}&dev=true#kept`)
    expect(readInitialAppIntent()).toEqual({ status: 'connect', callback: CALLBACK })
    expect(window.location.search).toBe('?dev=true')
    expect(window.location.hash).toBe('#kept')
    expect(readInitialAppIntent()).toBeUndefined()
  })

  it('stripAppIntentParams leaves an unrelated query alone', () => {
    window.history.replaceState(null, '', '/?dev=true')
    stripAppIntentParams()
    expect(window.location.search).toBe('?dev=true')
  })

  it('reads a web+arkade connect link from the hash and strips it', () => {
    const custom = new URL('web+arkade://connect')
    custom.searchParams.set('callback', CALLBACK)
    // Chromium percent-encodes the protocol URL into the manifest's #%s.
    window.history.replaceState(null, '', `/#${encodeURIComponent(custom.href)}`)
    expect(readInitialAppIntent()).toEqual({ status: 'connect', callback: CALLBACK })
    expect(window.location.hash).toBe('')
    expect(readInitialAppIntent()).toBeUndefined()
  })

  it('reads a decoded web+arkade send link', () => {
    const custom = new URL('web+arkade://send')
    custom.searchParams.set('request', REQUEST)
    custom.searchParams.set('callback', CALLBACK)
    window.history.replaceState(null, '', `/?dev=true#${custom.href}`)
    expect(readInitialAppIntent()).toEqual({
      status: 'send',
      request: REQUEST,
      callback: CALLBACK,
    })
    expect(window.location.search).toBe('?dev=true')
    expect(window.location.hash).toBe('')
  })

  it('leaves an ark note hash alone', () => {
    const note = 'web+arkade://arknoted5e23929b122982678e8bd8ded4338a4d611a2b7cb7d0f5e0c67c3139d87dec885'
    window.history.replaceState(null, '', `/#${note}`)
    expect(protocolIntentSearch(window.location.hash)).toBeUndefined()
    expect(readInitialAppIntent()).toBeUndefined()
    expect(window.location.hash).toBe(`#${note}`)
  })
})
