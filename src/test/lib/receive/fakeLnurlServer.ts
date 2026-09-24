import { vi } from 'vitest'

export const LNURL_BASE = 'https://lnurl.test'
export const LNURL_DOMAIN = 'lnurl.test'
// Decodable: registerArkadeIdentity validates the Arkade address locally.
export const DECODABLE_ARK =
  'ark1qqpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqcrqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrdcvtpk'

export interface FakeAddress {
  handle: string
  username: string | null
  lightningAddress: string | null
  nameless: boolean
  sessionLnurl: string | null
  status: 'active'
  domain: string
}

const json = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, statusText: String(status), json: async () => body }) as Response

const named = (username: string, sessionLnurl: string | null = null): FakeAddress => ({
  handle: username,
  username,
  lightningAddress: `${username}@${LNURL_DOMAIN}`,
  nameless: false,
  sessionLnurl,
  status: 'active',
  domain: LNURL_DOMAIN,
})

export const namedAddress = named

export const namelessAddress = (handle = 'sess1'): FakeAddress => ({
  handle,
  username: null,
  lightningAddress: null,
  nameless: true,
  sessionLnurl: `LNURL1${handle.toUpperCase()}`,
  status: 'active',
  domain: LNURL_DOMAIN,
})

/** The endpoints `arkadeLnurl` calls, backed by one in-memory address list. */
export function fakeLnurlServer(opts: {
  modes: string[]
  addresses?: FakeAddress[]
  requireApiKey?: boolean
  reject?: { code: string; error: string }
  /** The identity's existing session row, which the server hands back to a nameless claim. */
  sessionRow?: FakeAddress
  capabilitiesFail?: boolean
}) {
  const addresses = [...(opts.addresses ?? [])]
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body as string) : {}
    const path = url.pathname
    if (path === '/lnurl/domain') {
      if (opts.capabilitiesFail) return json(500, { error: 'domain lookup failed' })
      return json(200, {
        domain: LNURL_DOMAIN,
        allocationModes: opts.modes,
        usernameRules: { minLen: 3, maxLen: 20, pattern: '^[a-z0-9-]+$' },
        requireApiKey: opts.requireApiKey ?? false,
      })
    }
    if (path === '/lnurl/address' && method === 'GET') return json(200, addresses)
    if (path === '/lnurl/address' && method === 'POST') {
      if (opts.reject) return json(409, opts.reject)
      if (body.nameless) {
        const held = opts.sessionRow ?? addresses.find((a) => a.sessionLnurl)
        if (held) return json(200, held)
        const row = namelessAddress()
        addresses.push(row)
        return json(200, row)
      }
      const row = named(body.username ?? 'brave-otter')
      addresses.push(row)
      return json(200, row)
    }
    if (path.endsWith('/arkade') && method === 'POST') return json(200, {})
    if (method === 'PATCH') {
      if (opts.reject) return json(409, opts.reject)
      const handle = decodeURIComponent(path.split('/').pop()!)
      const index = addresses.findIndex((a) => a.handle === handle)
      addresses[index] = named(body.username ?? 'brave-otter', addresses[index].sessionLnurl)
      return json(200, addresses[index])
    }
    return json(404, { error: `no route ${method} ${path}` })
  })
  const calls = (method: string, path: string) =>
    fetchMock.mock.calls.filter(
      ([input, init]) => (init?.method ?? 'GET') === method && new URL(String(input)).pathname === path,
    )
  return { fetch: fetchMock, addresses, calls }
}
