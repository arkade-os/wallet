import { ArkAddress } from '@arkade-os/sdk'
import { bech32 } from '@scure/base'
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

/** The client checks an invoice's amount, which it reads off the bech32 prefix alone. */
export const fakeInvoice = (amountMsat: number): string =>
  bech32.encode(`lnbcrt${amountMsat * 10}p`, bech32.toWords(new Uint8Array(64)), 2000)

export const WALLET_BOARDING_ADDRESS = 'bc1testaddr'
const ownArk = ArkAddress.decode(DECODABLE_ARK)
const otherKey = (fill: number) => new Uint8Array(32).fill(fill)

/** What an honest server answers: a fresh address on the wallet's operator, and its registered boarding address. */
export const LNURL_DESTINATIONS = {
  arkade: new ArkAddress(ownArk.serverPubKey, otherKey(7), ownArk.hrp).encode(),
  onchain: WALLET_BOARDING_ADDRESS,
}

export const FOREIGN_DESTINATIONS = {
  arkade: new ArkAddress(otherKey(9), otherKey(7), ownArk.hrp).encode(),
  onchain: 'bc1qforeignaddress',
}

/** The endpoints `arkadeLnurl` calls, backed by one in-memory address list. */
export function fakeLnurlServer(opts: {
  modes: string[]
  addresses?: FakeAddress[]
  requireApiKey?: boolean
  reject?: { code: string; error: string }
  /** The identity's existing session row, which the server hands back to a nameless claim. */
  sessionRow?: FakeAddress
  capabilitiesFail?: boolean
  invoiceError?: string
  destinationError?: string
  foreignDestinations?: boolean
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
    // `/lnurl/<id>` is a nameless receiver's LNURL, which the server serves with the same rails.
    if (method === 'GET' && (path.startsWith('/.well-known/lnurlp/') || /^\/lnurl\/[^/]+$/.test(path))) {
      return json(200, {
        tag: 'payRequest',
        callback: `${LNURL_BASE}/callback/${path.split('/').pop()}`,
        minSendable: 1_000,
        maxSendable: 100_000_000_000,
        metadata: '[]',
        paymentOptions: [
          { id: 'lightning', type: 'lightning' },
          { id: 'arkade', type: 'arkade' },
          { id: 'onchain', type: 'onchain' },
        ],
      })
    }
    if (path.startsWith('/callback/')) {
      const rail = url.searchParams.get('paymentOption')
      if (rail === 'arkade' || rail === 'onchain') {
        if (opts.destinationError) return json(200, { status: 'ERROR', reason: opts.destinationError })
        const destinations = opts.foreignDestinations ? FOREIGN_DESTINATIONS : LNURL_DESTINATIONS
        return json(200, { status: 'OK', paymentOption: rail, paymentDestination: destinations[rail] })
      }
      if (opts.invoiceError) return json(200, { status: 'ERROR', reason: opts.invoiceError })
      return json(200, { pr: fakeInvoice(Number(url.searchParams.get('amount'))), routes: [] })
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
