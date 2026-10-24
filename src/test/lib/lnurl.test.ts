import { afterEach, describe, expect, it, vi } from 'vitest'
import { encodeLnurl } from '@arkade-os/lnurl-client/arkade'
import { fetchArkAddress } from '../../lib/lnurl'

afterEach(() => vi.unstubAllGlobals())

describe('fetchArkAddress', () => {
  it('adds method=ark beside a query the LNURL already carries', async () => {
    const fetch = vi.fn(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_url: string | URL) => new Response(JSON.stringify({ address: 'ark1x', expiryDate: '', hint: '' })),
    )
    vi.stubGlobal('fetch', fetch)

    await fetchArkAddress(encodeLnurl('https://service.example/lnurlp?id=abc'))

    expect(String(fetch.mock.calls[0][0])).toBe('https://service.example/lnurlp?id=abc&method=ark')
  })
})
