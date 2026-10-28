import { afterEach, describe, expect, it, vi } from 'vitest'
import { FORWARDED, onRequest } from '../../../functions/.well-known/lnurlp/[[path]]'

const LOOKUP = 'https://arkade.money/.well-known/lnurlp/alice'
const ORIGIN = 'lnurl-origin.arkade.money'

const upstream = (body: string, headers: Record<string, string> = {}, status = 200) =>
  vi.fn(async (_req: Request, _init?: RequestInit) => new Response(body, { status, headers }))

afterEach(() => vi.unstubAllGlobals())

describe('lightning address proxy', () => {
  it('sends the lookup to the lnurl-server origin under this host', async () => {
    const fetch = upstream('{"tag":"payRequest"}')
    vi.stubGlobal('fetch', fetch)

    const res = await onRequest({ request: new Request(LOOKUP), env: { LNURL_ORIGIN: ORIGIN } })

    expect(await res.text()).toBe('{"tag":"payRequest"}')
    const [sent, init] = fetch.mock.calls[0]
    expect(sent.url).toBe(LOOKUP)
    expect(sent.headers.get(FORWARDED)).toBe('1')
    expect(init).toEqual({ cf: { resolveOverride: ORIGIN } })
  })

  it("keeps the wallet's credentials and cookies to itself", async () => {
    const fetch = upstream('{}')
    vi.stubGlobal('fetch', fetch)
    const headers = { Authorization: 'Basic d2FsbGV0OnNlY3JldA==', Cookie: 'session=1', Accept: 'application/json' }

    await onRequest({ request: new Request(LOOKUP, { headers }), env: { LNURL_ORIGIN: ORIGIN } })

    const [sent] = fetch.mock.calls[0]
    expect(sent.headers.get('authorization')).toBeNull()
    expect(sent.headers.get('cookie')).toBeNull()
    expect(sent.headers.get('accept')).toBe('application/json')
  })

  it('forwards the callback too', async () => {
    const fetch = upstream('{"pr":"lnbc1"}')
    vi.stubGlobal('fetch', fetch)

    await onRequest({ request: new Request(`${LOOKUP}/callback?amount=1000`), env: { LNURL_ORIGIN: ORIGIN } })

    expect(fetch.mock.calls[0][0].url).toBe(`${LOOKUP}/callback?amount=1000`)
  })

  it('serves whatever comes back as JSON that cannot run or frame on the wallet origin', async () => {
    vi.stubGlobal(
      'fetch',
      upstream('<script>alert(1)</script>', { 'content-type': 'text/html', 'set-cookie': 'a=b' }, 502),
    )

    const res = await onRequest({ request: new Request(LOOKUP), env: { LNURL_ORIGIN: ORIGIN } })

    expect(res.status).toBe(502)
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox")
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('forwards nothing but a GET of an address or its callback', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const env = { LNURL_ORIGIN: ORIGIN }

    expect((await onRequest({ request: new Request(LOOKUP, { method: 'POST' }), env })).status).toBe(405)
    expect((await onRequest({ request: new Request(`${LOOKUP}/other`), env })).status).toBe(404)
    expect((await onRequest({ request: new Request(`${LOOKUP}/callback/more`), env })).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('answers 404 while no origin is configured', async () => {
    const res = await onRequest({ request: new Request(LOOKUP), env: {} })

    expect(res.status).toBe(404)
  })

  it('refuses a request that came back through itself instead of looping', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    const res = await onRequest({
      request: new Request(LOOKUP, { headers: { [FORWARDED]: '1' } }),
      env: { LNURL_ORIGIN: ORIGIN },
    })

    expect(res.status).toBe(502)
    expect(fetch).not.toHaveBeenCalled()
  })
})
