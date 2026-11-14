import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPriceFeed } from '../../lib/fiat'
import createFetchMock from 'vitest-fetch-mock'

const fetchMocker = createFetchMock(vi)

fetchMocker.enableMocks()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fiat utilities', () => {
  it('should fetch fiat values from Yadio.io', async () => {
    const expected = {
      EUR: 100,
      USD: 200,
      CHF: 93,
      JPY: 300,
      GBP: 150,
      CNY: 50,
      BRL: 40,
      CUP: 42000000,
    }
    const mockResponse = { BTC: expected }
    fetchMocker.mockResponseOnce(JSON.stringify(mockResponse))
    const result = await getPriceFeed()
    expect(result).toStrictEqual({
      eur: 100,
      usd: 200,
      chf: 93,
      jpy: 300,
      gbp: 150,
      cny: 50,
      brl: 40,
      cup: 42000000,
    })
  })

  it('falls back to blockchain.info when Yadio.io fails', async () => {
    const mockResponse = {
      EUR: { last: 100 },
      USD: { last: 200 },
      CHF: { last: 93 },
    }
    fetchMocker.mockRejectOnce(new Error('yadio down'))
    fetchMocker.mockResponseOnce(JSON.stringify(mockResponse))
    // blockchain.info does not quote CUP, so the fallback re-fetches Yadio
    // for the CUP rate only.
    fetchMocker.mockResponseOnce(JSON.stringify({ BTC: { CUP: 42000000 } }))
    const result = await getPriceFeed()
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(result).toStrictEqual({
      eur: 100,
      usd: 200,
      chf: 93,
      jpy: undefined,
      gbp: undefined,
      cny: undefined,
      brl: undefined,
      cup: 42000000,
    })
  })

  it('falls back to blockchain.info when Yadio.io returns a partial feed', async () => {
    fetchMocker.mockResponseOnce(JSON.stringify({ BTC: { USD: 200 } }))
    fetchMocker.mockResponseOnce(
      JSON.stringify({
        EUR: { last: 100 },
        USD: { last: 200 },
        CHF: { last: 93 },
      }),
    )
    fetchMocker.mockResponseOnce(JSON.stringify({ BTC: { CUP: 42000000 } }))
    const result = await getPriceFeed()
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(result).toStrictEqual({
      eur: 100,
      usd: 200,
      chf: 93,
      jpy: undefined,
      gbp: undefined,
      cny: undefined,
      brl: undefined,
      cup: 42000000,
    })
  })

  it('uses the Yadio feed when CUP is missing without falling back', async () => {
    const mockResponse = {
      BTC: { EUR: 100, USD: 200, CHF: 93, JPY: 300, GBP: 150, CNY: 50, BRL: 40 } as Record<string, number>,
    }
    fetchMocker.mockResponseOnce(JSON.stringify(mockResponse))
    const result = await getPriceFeed()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result).toStrictEqual({
      eur: 100,
      usd: 200,
      chf: 93,
      jpy: 300,
      gbp: 150,
      cny: 50,
      brl: 40,
      cup: undefined,
    })
  })

  it('rejects non-finite rates and falls back to blockchain.info', async () => {
    // Raw JSON so JSON.parse yields Infinity (JSON.stringify would turn NaN
    // into null) and the guard rejects a genuinely non-finite number.
    const overflowRate = '{"BTC":{"EUR":1e999,"USD":200,"CHF":93,"JPY":300,"GBP":150,"CNY":50,"BRL":40}}'
    fetchMocker.mockResponseOnce(overflowRate)
    fetchMocker.mockResponseOnce(
      JSON.stringify({
        EUR: { last: 100 },
        USD: { last: 200 },
        CHF: { last: 93 },
      }),
    )
    fetchMocker.mockResponseOnce(JSON.stringify({ BTC: { CUP: 42000000 } }))
    const result = await getPriceFeed()
    expect(result).toStrictEqual({
      eur: 100,
      usd: 200,
      chf: 93,
      jpy: undefined,
      gbp: undefined,
      cny: undefined,
      brl: undefined,
      cup: 42000000,
    })
  })

  it('drops unusable rates from the blockchain.info fallback', async () => {
    fetchMocker.mockRejectOnce(new Error('yadio down'))
    // Raw JSON so JSON.parse yields Infinity; JPY is a literal 0. Both are rates
    // the feed must report as "no price" rather than hand to the provider.
    fetchMocker.mockResponseOnce('{"EUR":{"last":1e999},"USD":{"last":200},"CHF":{"last":93},"JPY":{"last":0}}')
    fetchMocker.mockResponseOnce(JSON.stringify({ BTC: { CUP: 42000000 } }))
    const result = await getPriceFeed()
    expect(result).toStrictEqual({
      eur: undefined,
      usd: 200,
      chf: 93,
      jpy: undefined,
      gbp: undefined,
      cny: undefined,
      brl: undefined,
      cup: 42000000,
    })
  })

  it('gives up on a request that never settles instead of hanging the feed', async () => {
    vi.useFakeTimers()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    try {
      const pending = getPriceFeed()
      // Both the Yadio attempt and the blockchain.info fallback hit the deadline.
      await vi.advanceTimersByTimeAsync(20_000)
      // Without a working deadline this promise would never settle.
      await expect(pending).resolves.toBeUndefined()
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
      consoleSpy.mockRestore()
      vi.useRealTimers()
    }
  })
})
