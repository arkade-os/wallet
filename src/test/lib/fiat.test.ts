import { describe, expect, it, vi } from 'vitest'
import { getPriceFeed } from '../../lib/fiat'
import createFetchMock from 'vitest-fetch-mock'

const fetchMocker = createFetchMock(vi)

fetchMocker.enableMocks()

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
    expect(result).toEqual({
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
    const result = await getPriceFeed()
    expect(result).toEqual({ eur: 100, usd: 200, chf: 93, cup: undefined })
  })
})
