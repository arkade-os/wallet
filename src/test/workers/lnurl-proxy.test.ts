import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { FORWARDED } from '../../../workers/lnurl-proxy/index'

const LOOKUP = 'https://arkade.money/.well-known/lnurlp/alice'
const ORIGIN = 'lnurl-origin.arkade.money'
const env = { LNURL_ORIGIN: ORIGIN }

const upstream = (body: string, headers: Record<string, string> = {}, status = 200) =>
  vi.fn(async (_req: Request, _init?: RequestInit) => new Response(body, { status, headers }))

afterEach(() => vi.unstubAllGlobals())

describe('lightning address proxy', () => {
  it('sends the lookup to the lnurl-server origin under this host', async () => {
    const fetch = upstream('{"tag":"payRequest"}')
    vi.stubGlobal('fetch', fetch)

    const res = await worker.fetch(new Request(LOOKUP), env)

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

    await worker.fetch(new Request(LOOKUP, { headers }), env)

    const [sent] = fetch.mock.calls[0]
    expect(sent.headers.get('authorization')).toBeNull()
    expect(sent.headers.get('cookie')).toBeNull()
    expect(sent.headers.get('accept')).toBe('application/json')
  })

  it('forwards the callback too', async () => {
    const fetch = upstream('{"pr":"lnbc1"}')
    vi.stubGlobal('fetch', fetch)

    await worker.fetch(new Request(`${LOOKUP}/callback?amount=1000`), env)

    expect(fetch.mock.calls[0][0].url).toBe(`${LOOKUP}/callback?amount=1000`)
  })

  it("forwards a nameless wallet's session lnurl and its callback from /lnurl/", async () => {
    const fetch = upstream('{"tag":"payRequest"}')
    vi.stubGlobal('fetch', fetch)
    const session = `https://arkade.money/lnurl/${'ab'.repeat(16)}`

    await worker.fetch(new Request(session), env)
    await worker.fetch(new Request(`${session}/callback?amount=1000`), env)

    expect(fetch.mock.calls.map(([sent]) => sent.url)).toEqual([session, `${session}/callback?amount=1000`])
  })

  it('serves whatever comes back as JSON that cannot run or frame on the wallet origin', async () => {
    vi.stubGlobal(
      'fetch',
      upstream('<script>alert(1)</script>', { 'content-type': 'text/html', 'set-cookie': 'a=b' }, 502),
    )

    const res = await worker.fetch(new Request(LOOKUP), env)

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

    expect((await worker.fetch(new Request(LOOKUP, { method: 'POST' }), env)).status).toBe(405)
    expect((await worker.fetch(new Request(`${LOOKUP}/other`), env)).status).toBe(404)
    expect((await worker.fetch(new Request(`${LOOKUP}/callback/more`), env)).status).toBe(404)
    expect((await worker.fetch(new Request('https://arkade.money/lnurl/address'), env)).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('answers 404 while no origin is configured, as an LNURL error a browser payer can read', async () => {
    const res = await worker.fetch(new Request(LOOKUP), {})

    expect(res.status).toBe(404)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox")
    expect(await res.json()).toEqual({ status: 'ERROR', reason: 'Not found' })
  })

  it('refuses a request that came back through itself with a 508 Cloudflare does not mask', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    const res = await worker.fetch(new Request(LOOKUP, { headers: { [FORWARDED]: '1' } }), env)

    expect(res.status).toBe(508)
    expect(await res.json()).toEqual({ status: 'ERROR', reason: 'LNURL origin unreachable' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
