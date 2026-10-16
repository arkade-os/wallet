import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { SingleKey } from '@arkade-os/sdk'
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

  it('drops a claim that lands after the facade changed', async () => {
    serve({ modes: ['self'] })
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const inner = server.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST' && new URL(String(input)).pathname === '/lnurl/address') await gate
        return inner(input, init)
      }),
    )
    const { result, rerender } = renderHook(
      ({ boardingAddress }) => useLnurlRail({ enabled: true, identity, arkadeAddress: DECODABLE_ARK, boardingAddress }),
      { initialProps: { boardingAddress: 'bc1first' } },
    )
    await waitFor(() => expect(result.current.status).toBe('onboarding'))

    let claiming!: Promise<void>
    act(() => {
      claiming = result.current.claim({ username: 'carol' })
    })
    rerender({ boardingAddress: 'bc1second' })
    await waitFor(() => expect(result.current.status).toBe('onboarding'))
    await act(async () => {
      release()
      await claiming
    })

    expect(result.current.receiver).toBeUndefined()
    expect(result.current.busy).toBe(false)
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
