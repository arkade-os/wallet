import { describe, expect, it, vi } from 'vitest'
import { getPriceFeed } from '../../lib/fiat'
import createFetchMock from 'vitest-fetch-mock'

const fetchMocker = createFetchMock(vi)

fetchMocker.enableMocks()

describe('fiat utilities', () => {
  it('should fetch fiat values', async () => {
    const expected = {
      eur: 100,
      usd: 200,
      chf: 93,
      brl: 38,
      jpy: undefined,
      gbp: undefined,
      cny: undefined,
    }
    const mockResponse = {
      EUR: { last: expected.eur },
      USD: { last: expected.usd },
      CHF: { last: expected.chf },
      BRL: { last: expected.brl },
    }
    fetchMocker.mockResponseOnce(JSON.stringify(mockResponse))
    const result = await getPriceFeed()
    expect(result).toEqual(expected)
  })
})
