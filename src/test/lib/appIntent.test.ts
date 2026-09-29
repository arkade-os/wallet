import { afterEach, describe, expect, it } from 'vitest'
import {
  APP_INTENT_MAX_SEARCH_LENGTH,
  callbackUrl,
  nextAppIntentNavigation,
  parseAppIntent,
  readInitialAppIntent,
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
})
