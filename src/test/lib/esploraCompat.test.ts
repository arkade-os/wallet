import { describe, it, expect, vi, afterEach } from 'vitest'
import { rewriteEsploraBlocksUrl, installEsploraFetchCompat } from '../../lib/esploraCompat'

describe('rewriteEsploraBlocksUrl', () => {
  it('rewrites the mutinynet esplora blocks URL to the mempool v1 route', () => {
    expect(rewriteEsploraBlocksUrl('https://mutinynet.com/api/blocks')).toBe('https://mutinynet.com/api/v1/blocks')
  })

  it('leaves other mutinynet API routes untouched', () => {
    expect(rewriteEsploraBlocksUrl('https://mutinynet.com/api/blocks/tip/height')).toBe(
      'https://mutinynet.com/api/blocks/tip/height',
    )
    expect(rewriteEsploraBlocksUrl('https://mutinynet.com/api/tx/abc')).toBe('https://mutinynet.com/api/tx/abc')
  })

  it('leaves other explorers untouched', () => {
    expect(rewriteEsploraBlocksUrl('https://mempool.space/api/blocks')).toBe('https://mempool.space/api/blocks')
    expect(rewriteEsploraBlocksUrl('http://localhost:3000/api/blocks')).toBe('http://localhost:3000/api/blocks')
  })
})

describe('installEsploraFetchCompat', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('rewrites string and URL inputs before delegating to fetch', async () => {
    const spy = vi.fn().mockResolvedValue(new Response('[]'))
    globalThis.fetch = spy
    installEsploraFetchCompat()

    await globalThis.fetch('https://mutinynet.com/api/blocks')
    expect(spy).toHaveBeenLastCalledWith('https://mutinynet.com/api/v1/blocks', undefined)

    await globalThis.fetch(new URL('https://mutinynet.com/api/blocks'))
    expect(spy).toHaveBeenLastCalledWith('https://mutinynet.com/api/v1/blocks', undefined)
  })

  it('passes through non-matching requests unchanged', async () => {
    const spy = vi.fn().mockResolvedValue(new Response('[]'))
    globalThis.fetch = spy
    installEsploraFetchCompat()

    const init = { method: 'POST', body: 'txhex' }
    await globalThis.fetch('https://mutinynet.com/api/tx', init)
    expect(spy).toHaveBeenLastCalledWith('https://mutinynet.com/api/tx', init)
  })

  it('rewrites Request inputs preserving the original request options', async () => {
    const spy = vi.fn().mockResolvedValue(new Response('[]'))
    globalThis.fetch = spy
    installEsploraFetchCompat()

    await globalThis.fetch(new Request('https://mutinynet.com/api/blocks', { headers: { 'X-Test': '1' } }))
    const forwarded = spy.mock.calls[0][0] as Request
    expect(forwarded.url).toBe('https://mutinynet.com/api/v1/blocks')
    expect(forwarded.headers.get('X-Test')).toBe('1')
  })
})
