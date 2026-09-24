import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SingleKey } from '@arkade-os/sdk'
import { LnurlError } from '@arkade-os/lnurl-client'
import { configuredLnurlServer, lnurlReceiver, lnurlClaimErrorMessage } from '../../../lib/receive/lnurlRail'

const BASE_URL = 'https://lnurl.test'
const DOMAIN = 'lnurl.test'
// A real, decodable Arkade address: registerArkadeIdentity validates it locally via ArkAddress.decode.
const ARK =
  'ark1qqpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqcrqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrdcvtpk'
// Real deterministic signer: the facade signs twice to prove determinism before deriving a session token.
const identity = SingleKey.fromHex('01'.repeat(32))

const jsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response

const fetchMock = vi.fn<typeof fetch>()

const bodyOf = (call: unknown[]): Record<string, unknown> => JSON.parse((call[1] as RequestInit).body as string)
const callTo = (suffix: string) => fetchMock.mock.calls.find(([url]) => (url as string).endsWith(suffix))!

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_LNURL_SERVER', BASE_URL)
  vi.stubEnv('VITE_LNURL_DOMAIN', '')
})

afterEach(() => vi.unstubAllEnvs())

describe('configuredLnurlServer', () => {
  it('is undefined when no server is configured', () => {
    vi.stubEnv('VITE_LNURL_SERVER', '')
    expect(configuredLnurlServer()).toBeUndefined()
  })

  it('trims the server and derives the domain from its hostname', () => {
    vi.stubEnv('VITE_LNURL_SERVER', `  ${BASE_URL}  `)
    expect(configuredLnurlServer()).toEqual({ baseUrl: BASE_URL, domain: DOMAIN })
  })
})

describe('lnurlReceiver', () => {
  it('is undefined when unconfigured', () => {
    vi.stubEnv('VITE_LNURL_SERVER', '')
    expect(lnurlReceiver({ identity, arkadeAddress: ARK })).toBeUndefined()
  })

  it('passes capabilities() through to the domain endpoint', async () => {
    const capabilities = {
      domain: DOMAIN,
      allocationModes: ['self', 'random'],
      usernameRules: { minLen: 3, maxLen: 20, pattern: '.*' },
      requireApiKey: false,
    }
    fetchMock.mockResolvedValue(jsonResponse(200, capabilities))

    const result = await lnurlReceiver({ identity, arkadeAddress: ARK })!.capabilities()

    expect(result).toEqual(capabilities)
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/lnurl/domain?domain=${DOMAIN}`, undefined)
  })

  describe('claim', () => {
    const registered = (over: Partial<Record<string, unknown>> = {}) => ({
      lightningAddress: 'alice@lnurl.test',
      lnurl: 'LNURL1EXAMPLE',
      username: 'alice',
      handle: 'alice',
      domain: DOMAIN,
      status: 'active',
      nameless: false,
      sessionLnurl: null,
      ...over,
    })

    beforeEach(() => {
      fetchMock.mockImplementation(async (url, init) => {
        const target = url as string
        if (target.endsWith('/lnurl/address') && init?.method === 'POST') return jsonResponse(200, registered())
        if (target.endsWith('/arkade') && init?.method === 'POST') return jsonResponse(200, {})
        throw new Error(`unexpected fetch ${init?.method ?? 'GET'} ${target}`)
      })
    })

    it('claims a chosen username, then binds the identity to it', async () => {
      const receiver = await lnurlReceiver({ identity, arkadeAddress: ARK })!.claim({ username: 'alice' })

      expect(bodyOf(callTo('/lnurl/address'))).toEqual({ token: expect.any(String), username: 'alice', domain: DOMAIN })
      const bind = bodyOf(callTo('/arkade'))
      expect(bind).toEqual({
        arkadeAddress: ARK,
        claimPublicKey: expect.stringMatching(/^0[23][0-9a-f]{64}$/),
        domain: DOMAIN,
      })
      expect(callTo('/arkade')[0]).toBe(`${BASE_URL}/lnurl/address/alice/arkade`)
      expect(receiver.lightningAddress).toBe('alice@lnurl.test')
    })

    it('claims a server-picked username when none is requested', async () => {
      fetchMock.mockImplementation(async (url, init) => {
        const target = url as string
        if (target.endsWith('/lnurl/address') && init?.method === 'POST') {
          return jsonResponse(
            200,
            registered({ username: 'brave-otter', handle: 'brave-otter', lightningAddress: 'brave-otter@lnurl.test' }),
          )
        }
        if (target.endsWith('/arkade') && init?.method === 'POST') return jsonResponse(200, {})
        throw new Error(`unexpected fetch ${init?.method ?? 'GET'} ${target}`)
      })

      const receiver = await lnurlReceiver({ identity, arkadeAddress: ARK })!.claim()

      expect(bodyOf(callTo('/lnurl/address'))).toEqual({ token: expect.any(String), domain: DOMAIN })
      const bind = bodyOf(callTo('/arkade'))
      expect(bind).toEqual({
        arkadeAddress: ARK,
        claimPublicKey: expect.stringMatching(/^0[23][0-9a-f]{64}$/),
        domain: DOMAIN,
      })
      expect(callTo('/arkade')[0]).toBe(`${BASE_URL}/lnurl/address/brave-otter/arkade`)
      expect(receiver.lightningAddress).toBe('brave-otter@lnurl.test')
    })

    it('carries a claim code alongside the requested username', async () => {
      const receiver = await lnurlReceiver({ identity, arkadeAddress: ARK })!.claim({
        username: 'alice',
        claimCode: 'secret-code',
      })

      expect(bodyOf(callTo('/lnurl/address'))).toEqual({
        token: expect.any(String),
        username: 'alice',
        claimCode: 'secret-code',
        domain: DOMAIN,
      })
      expect(bodyOf(callTo('/arkade'))).toEqual({
        arkadeAddress: ARK,
        claimPublicKey: expect.stringMatching(/^0[23][0-9a-f]{64}$/),
        domain: DOMAIN,
      })
      expect(callTo('/arkade')[0]).toBe(`${BASE_URL}/lnurl/address/alice/arkade`)
      expect(receiver.lightningAddress).toBe('alice@lnurl.test')
    })

    it('claims a nameless receiver and still binds the identity', async () => {
      fetchMock.mockImplementation(async (url, init) => {
        const target = url as string
        if (target.endsWith('/lnurl/address') && init?.method === 'POST') {
          return jsonResponse(
            200,
            registered({
              lightningAddress: null,
              username: null,
              handle: 'sess123',
              nameless: true,
              sessionLnurl: 'LNURL1SESSION',
            }),
          )
        }
        return jsonResponse(200, {})
      })

      const receiver = await lnurlReceiver({ identity, arkadeAddress: ARK })!.claim({ nameless: true })

      expect(bodyOf(callTo('/lnurl/address'))).toEqual({ token: expect.any(String), domain: DOMAIN, nameless: true })
      expect(callTo('/arkade')[0]).toBe(`${BASE_URL}/lnurl/address/sess123/arkade`)
      expect(receiver.handle).toBe('sess123')
      expect(receiver.lightningAddress).toBeUndefined()
    })

    // Review Focus 3: an identity that already upgraded to a name gets that
    // named row back from a nameless claim, not a fresh session — the server
    // still flags it (sessionLnurl set), so the facade accepts rather than
    // treating it as ignoring `nameless`.
    it('yields the named receiver when a nameless claim finds an already-upgraded identity', async () => {
      fetchMock.mockImplementation(async (url, init) => {
        const target = url as string
        if (target.endsWith('/lnurl/address') && init?.method === 'POST') {
          return jsonResponse(200, registered({ sessionLnurl: 'LNURL1SESSIONALICE' }))
        }
        return jsonResponse(200, {})
      })

      const receiver = await lnurlReceiver({ identity, arkadeAddress: ARK })!.claim({ nameless: true })

      expect(receiver.lightningAddress).toBe('alice@lnurl.test')
    })
  })

  it("owned() returns this domain's active row, not another domain's", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [
        {
          username: 'bob',
          domain: 'other.test',
          status: 'active',
          lightningAddress: 'bob@other.test',
          lnurl: 'X',
          handle: 'bob',
          nameless: false,
          sessionLnurl: null,
          createdAt: 1,
        },
        {
          username: 'alice',
          domain: DOMAIN,
          status: 'active',
          lightningAddress: 'alice@lnurl.test',
          lnurl: 'Y',
          handle: 'alice',
          nameless: false,
          sessionLnurl: null,
          createdAt: 2,
        },
      ]),
    )

    const receiver = await lnurlReceiver({ identity, arkadeAddress: ARK })!.owned()

    expect(receiver?.handle).toBe('alice')
    expect(receiver?.lightningAddress).toBe('alice@lnurl.test')
  })
})

describe('lnurlClaimErrorMessage', () => {
  it('translates a known server code', () => {
    expect(lnurlClaimErrorMessage(new LnurlError('username already taken', { code: 'taken' }))).toBe(
      'That name is already taken.',
    )
  })

  it('falls back to the error message for anything else', () => {
    expect(lnurlClaimErrorMessage(new Error('offline'))).toBe('offline')
  })
})
