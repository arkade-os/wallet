import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { SingleKey } from '@arkade-os/sdk'
import { createElement, type ReactNode } from 'react'
import { LanguageContext } from '../../../providers/language'
import { translate } from '../../../lib/i18n'
import { Language } from '../../../lib/types'
import { useLnurlRail, useLnurlRails } from '../../../lib/receive/lnurlRail'
import {
  DECODABLE_ARK,
  LNURL_BASE,
  LNURL_DESTINATIONS,
  WALLET_BOARDING_ADDRESS,
  fakeLnurlServer,
  namedAddress,
  namelessAddress,
} from './fakeLnurlServer'

const identity = SingleKey.fromHex('02'.repeat(32))

const renderRail = (enabled = true) =>
  renderHook(() => useLnurlRail({ enabled, identity, arkadeAddress: DECODABLE_ARK }))

let server: ReturnType<typeof fakeLnurlServer>
const serve = (opts: Parameters<typeof fakeLnurlServer>[0]) => {
  server = fakeLnurlServer(opts)
  vi.stubGlobal('fetch', server.fetch)
}

beforeEach(() => {
  vi.stubEnv('VITE_LNURL_SERVER', LNURL_BASE)
  vi.stubEnv('VITE_LNURL_DOMAIN', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('fake LNURL server', () => {
  it('returns 404 for a missing upgrade handle without changing owned addresses', async () => {
    const owned = namelessAddress()
    const fixture = fakeLnurlServer({ modes: ['self'], addresses: [owned] })
    const response = await fixture.fetch(`${LNURL_BASE}/lnurl/address/missing`, {
      method: 'PATCH',
      body: JSON.stringify({ username: 'alice' }),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'address not found' })
    expect(fixture.addresses).toEqual([owned])
  })
})

describe('useLnurlRail', () => {
  it('stays dark and fetches nothing when disabled', async () => {
    serve({ modes: ['self'] })
    const { result } = renderRail(false)

    await act(async () => {})
    expect(result.current.status).toBe('off')
    expect(server.fetch).not.toHaveBeenCalled()
  })

  it('uses an address the identity already owns, without asking for capabilities', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    const { result } = renderRail()

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.receiver?.lightningAddress).toBe('alice@lnurl.test')
    expect(server.calls('GET', '/lnurl/domain')).toHaveLength(0)
  })

  it('binds an address its claim registered but failed to bind', async () => {
    serve({ modes: ['self'], bindFails: 1 })
    const { result } = renderRail()
    await waitFor(() => expect(result.current.status).toBe('onboarding'))

    let claimed: unknown = 'pending'
    await act(async () => {
      claimed = await result.current.claim({ username: 'carol' })
    })

    expect(claimed).toBeUndefined()
    await waitFor(() => expect(server.calls('POST', '/lnurl/address/carol/arkade')).toHaveLength(2))
    await waitFor(() => expect(result.current.receiver?.lightningAddress).toBe('carol@lnurl.test'))
    expect(result.current.error).toBe('')
  })

  it('receives on the primary address, and switches to a new one without reloading', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice'), namedAddress('bob')] })
    const { result, rerender } = renderHook(
      ({ primary }) => useLnurlRail({ enabled: true, identity, arkadeAddress: DECODABLE_ARK, primary }),
      { initialProps: { primary: 'bob' } },
    )
    await waitFor(() => expect(result.current.receiver?.lightningAddress).toBe('bob@lnurl.test'))

    const statuses: string[] = []
    rerender({ primary: 'alice' })
    await waitFor(() => {
      statuses.push(result.current.status)
      expect(result.current.receiver?.lightningAddress).toBe('alice@lnurl.test')
    })
    expect(statuses).not.toContain('onboarding')
    expect(statuses).not.toContain('loading')
  })

  it('onboards with only the advertised choices when nothing is owned and nameless is not offered', async () => {
    serve({ modes: ['self', 'random'] })
    const { result } = renderRail()

    await waitFor(() => expect(result.current.status).toBe('onboarding'))
    expect(result.current.choices).toEqual(['self', 'random'])
  })

  it('registers the wallet LNURL on its own when nothing is owned and the server allows it', async () => {
    serve({ modes: ['random', 'session'] })
    const { result } = renderRail()

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.receiver?.handle).toBe('sess1')
    expect(result.current.choices).toEqual(['random', 'session'])
    expect(server.calls('POST', '/lnurl/address')).toHaveLength(1)
  })

  it('hands out the wallet LNURL before registration lands, and the same one after', async () => {
    serve({ modes: ['session'] })
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const inner = server.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (new URL(String(input)).pathname === '/lnurl/address') await gate
        return inner(input, init)
      }),
    )
    const { result } = renderRail()

    await waitFor(() => expect(result.current.lnurl).toMatch(/^lnurl1/i))
    expect(result.current.status).toBe('loading')
    const early = result.current.lnurl
    await act(async () => release())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.lnurl).toBe(early)
  })

  it('fails soft, so the swap rail takes over, when registering the wallet LNURL is refused', async () => {
    serve({ modes: ['session'], reject: { code: 'limit_reached', error: 'slow down' } })
    const { result } = renderRail()

    await waitFor(() => expect(result.current.status).toBe('failed'))
    expect(result.current.error).toBe('Too many attempts — try again shortly.')
  })

  it('lists every address the identity owns on this domain', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice'), namelessAddress()] })
    const { result } = renderRail()
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const all = await result.current.addresses()

    expect(all.map((a) => a.handle)).toEqual(['alice', 'sess1'])
  })

  it('loads the choices for a nameless receiver so it can be named later', async () => {
    serve({ modes: ['self', 'session'], addresses: [namelessAddress()] })
    const { result } = renderRail()

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.receiver?.lightningAddress).toBeUndefined()
    expect(result.current.choices).toEqual(['self', 'session'])
  })

  it('claims, then holds the receiver', async () => {
    serve({ modes: ['self'] })
    const { result } = renderRail()
    await waitFor(() => expect(result.current.status).toBe('onboarding'))

    await act(() => result.current.claim({ username: 'carol' }))

    expect(result.current.status).toBe('ready')
    expect(result.current.receiver?.lightningAddress).toBe('carol@lnurl.test')
  })

  it('upgrades a nameless receiver without changing its LNURL', async () => {
    serve({ modes: ['self', 'session'], addresses: [namelessAddress()] })
    const { result } = renderRail()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const before = result.current.receiver!.lnurl

    await act(() => result.current.upgrade({ username: 'dave' }))

    expect(result.current.receiver?.lightningAddress).toBe('dave@lnurl.test')
    expect(result.current.receiver?.lnurl).toBe(before)
  })

  it('reports a failed claim in the user-facing wording and stays onboarding', async () => {
    serve({ modes: ['self'], reject: { code: 'taken', error: 'username already taken' } })
    const { result } = renderRail()
    await waitFor(() => expect(result.current.status).toBe('onboarding'))

    await act(() => result.current.claim({ username: 'alice' }))

    expect(result.current.error).toBe('That name is already taken.')
    expect(result.current.status).toBe('onboarding')
  })

  it('keeps an owned nameless receiver when its capabilities fail', async () => {
    serve({ modes: ['self'], addresses: [namelessAddress()], capabilitiesFail: true })
    const { result } = renderRail()

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.receiver?.handle).toBe('sess1')
    expect(result.current.choices).toEqual([])
    expect(result.current.error).toBe('domain lookup failed')
  })

  it('exposes an owned nameless receiver while capabilities are still loading', async () => {
    serve({ modes: ['session'], addresses: [namelessAddress()] })
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const inner = server.fetch
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (new URL(String(input)).pathname === '/lnurl/domain') await gate
      return inner(input, init)
    })
    vi.stubGlobal('fetch', fetch)
    const { result } = renderRail()

    await waitFor(() => expect(fetch.mock.calls.some(([input]) => String(input).includes('/lnurl/domain'))).toBe(true))
    expect(result.current.status).toBe('loading')
    expect(result.current.receiver?.handle).toBe('sess1')
    expect(result.current.lnurl).toBe(result.current.receiver?.lnurl)
    await act(async () => release())
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('does not automatically claim after pending capabilities become stale', async () => {
    serve({ modes: ['session'] })
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const inner = server.fetch
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (new URL(String(input)).pathname === '/lnurl/domain') await gate
      return inner(input, init)
    })
    vi.stubGlobal('fetch', fetch)
    const { result, rerender } = renderHook(
      ({ enabled }) => useLnurlRail({ enabled, identity, arkadeAddress: DECODABLE_ARK }),
      { initialProps: { enabled: true } },
    )
    await waitFor(() => expect(fetch.mock.calls.some(([input]) => String(input).includes('/lnurl/domain'))).toBe(true))

    rerender({ enabled: false })
    await act(async () => release())

    expect(result.current.status).toBe('off')
    expect(result.current.receiver).toBeUndefined()
    expect(server.calls('POST', '/lnurl/address')).toHaveLength(0)
  })

  it('translates a pending discovery failure using the current language without restarting discovery', async () => {
    serve({ modes: ['session'] })
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const inner = server.fetch
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (new URL(String(input)).pathname === '/lnurl/domain') {
        await gate
        return new Response(JSON.stringify({ code: 'taken', error: 'username already taken' }), { status: 409 })
      }
      return inner(input, init)
    })
    vi.stubGlobal('fetch', fetch)
    let language = Language.English
    const wrapper = ({ children }: { children: ReactNode }) => {
      const activeLanguage = language
      return createElement(
        LanguageContext.Provider,
        { value: { language: activeLanguage, t: (key) => translate(activeLanguage, key) } },
        children,
      )
    }
    const { result, rerender } = renderHook(
      () => useLnurlRail({ enabled: true, identity, arkadeAddress: DECODABLE_ARK }),
      { wrapper },
    )
    await waitFor(() => expect(fetch.mock.calls.some(([input]) => String(input).includes('/lnurl/domain'))).toBe(true))

    language = Language.Spanish
    rerender()
    await act(async () => release())

    await waitFor(() => expect(result.current.status).toBe('failed'))
    expect(result.current.error).toBe('Ese nombre ya está en uso.')
    expect(fetch.mock.calls.filter(([input]) => String(input).includes('/lnurl/domain'))).toHaveLength(1)
    expect(server.calls('GET', '/lnurl/address')).toHaveLength(1)
  })

  it('holds a claim that lands after the facade changed, since discovery waits for it', async () => {
    serve({ modes: ['self'] })
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const inner = server.fetch
    let held = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST' && new URL(String(input)).pathname === '/lnurl/address') {
          held = true
          await gate
        }
        return inner(input, init)
      }),
    )
    const { result, rerender } = renderHook(
      ({ boardingAddress }) => useLnurlRail({ enabled: true, identity, arkadeAddress: DECODABLE_ARK, boardingAddress }),
      { initialProps: { boardingAddress: 'bc1first' } },
    )
    await waitFor(() => expect(result.current.status).toBe('onboarding'))

    let claiming!: Promise<unknown>
    act(() => {
      claiming = result.current.claim({ username: 'carol' })
    })
    await waitFor(() => expect(held).toBe(true))
    rerender({ boardingAddress: 'bc1second' })
    expect(result.current.status).toBe('loading')
    await act(async () => {
      release()
      await claiming
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.receiver?.handle).toBe('carol')
    expect(result.current.busy).toBe(false)
  })

  it('settles back on the same receiver when the boarding address arrives after a session registered', async () => {
    serve({ modes: ['session'] })
    const { result, rerender } = renderHook(
      ({ boardingAddress }: { boardingAddress?: string }) =>
        useLnurlRail({ enabled: true, identity, arkadeAddress: DECODABLE_ARK, boardingAddress }),
      { initialProps: { boardingAddress: undefined as string | undefined } },
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const lnurl = result.current.lnurl

    rerender({ boardingAddress: WALLET_BOARDING_ADDRESS })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.lnurl).toBe(lnurl)
    expect(result.current.error).toBe('')
  })

  it('fails soft when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    const { result } = renderRail()

    await waitFor(() => expect(result.current.status).toBe('failed'))
    expect(result.current.error).not.toBe('')
  })
})

describe('useLnurlRails', () => {
  const asked = (rail: string) =>
    server.fetch.mock.calls.filter(([url]) => String(url).includes(`paymentOption=${rail}`))

  it('asks for a leg only once its own address is known, so none is refused as foreign', async () => {
    serve({ modes: ['self'], addresses: [namedAddress('alice')] })
    const rail = renderRail()
    await waitFor(() => expect(rail.result.current.status).toBe('ready'))
    const receiver = rail.result.current.receiver
    const { result, rerender } = renderHook(({ own }) => useLnurlRails(receiver, 20_000, true, own), {
      initialProps: { own: { arkade: '', onchain: '' } },
    })

    await waitFor(() => expect(result.current.targets.lightning).toBeDefined())
    expect(result.current.errors).toEqual({})
    expect(asked('arkade')).toHaveLength(0)
    expect(asked('onchain')).toHaveLength(0)

    rerender({ own: { arkade: DECODABLE_ARK, onchain: WALLET_BOARDING_ADDRESS } })
    await waitFor(() => expect(result.current.targets).toEqual(expect.objectContaining(LNURL_DESTINATIONS)))
    expect(result.current.errors).toEqual({})
  })
})
