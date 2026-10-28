import { afterEach, describe, expect, it, vi } from 'vitest'
import { FORWARDED, onRequest } from '../../../functions/.well-known/lnurlp/[[path]]'

const LOOKUP = 'https://arkade.money/.well-known/lnurlp/alice'
const ORIGIN = 'lnurl-origin.arkade.money'

afterEach(() => vi.unstubAllGlobals())

describe('lightning address proxy', () => {
  it('sends the lookup to the lnurl-server origin under this host', async () => {
    const fetch = vi.fn(async (_req: Request, _init?: RequestInit) => new Response('{"tag":"payRequest"}'))
    vi.stubGlobal('fetch', fetch)

    const res = await onRequest({ request: new Request(LOOKUP), env: { LNURL_ORIGIN: ORIGIN } })

    expect(await res.text()).toBe('{"tag":"payRequest"}')
    const [sent, init] = fetch.mock.calls[0]
    expect(sent.url).toBe(LOOKUP)
    expect(sent.headers.get(FORWARDED)).toBe('1')
    expect(init).toEqual({ cf: { resolveOverride: ORIGIN } })
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
