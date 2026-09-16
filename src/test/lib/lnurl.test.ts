import fixtures from '../fixtures.json'
import createFetchMock from 'vitest-fetch-mock'
import { describe, expect, it, vi } from 'vitest'
import { checkLnUrlConditions, fetchInvoice, getCallbackUrl, isValidLnUrl } from '../../lib/lnurl'

const fetchMocker = createFetchMock(vi)

fetchMocker.enableMocks()

const mockLNURLResponse = {
  callback: 'https://pay.staging.galoy.io/.well-known/lnurlp/testing',
  minSendable: 1000,
  maxSendable: 100000000000,
  metadata: 'mock-metadata',
}

// a valid 2100 sats lightning invoice
const validSatsAmount = 2100
const validLnInvoice =
  'lnbc21u1p424dq0sp5695fx2997y87rxa0m0r36q3q4n5ras6sag0qr4v8kznvtf6s9z7spp5q4nzvscxkg3y39eptcpwcqrnqx5qdja2k8smq8swrwcwwy43gj5qhp5uwcvgs5clswpfxhm7nyfjmaeysn6us0yvjdexn9yjkv3k7zjhp2sxq9z0rgqcqpnrzjqwryaup9lh50kkranzgcdnn2fgvx390wgj5jd07rwr3vxeje0glc7r43a5qqrpgqqqqqqqlgqqqq0ncqjq9qxpqysgqjf4gj8sjywp0wmr49jdxkduurggl4j3upukqmsyylw5cpf4k4qdhhqv473za9xntyazwquzqh6j5sqkmxm7v48lrhvjsftrlt82aepqqq0uys9'

describe('lnurl utilities', () => {
  it('should decode lnurl values', async () => {
    for (const test of fixtures.lib.lnurl) {
      expect(test).toHaveProperty('lnUrlOrAddress')
      expect(isValidLnUrl(test.lnUrlOrAddress)).toBe(true)
      expect(getCallbackUrl(test.lnUrlOrAddress)).toBe(test.callback)
    }
  })

  it('should fetch lnurl conditions', async () => {
    for (const test of fixtures.lib.lnurl) {
      const localMockResponse = { ...mockLNURLResponse, callback: test.callback }
      fetchMocker.mockResponseOnce(JSON.stringify(localMockResponse))
      expect(await checkLnUrlConditions(test.lnUrlOrAddress)).toEqual(localMockResponse)
    }
  })

  it('should fetch lightning invoice', async () => {
    for (const test of fixtures.lib.lnurl) {
      const localMockResponse = { ...mockLNURLResponse, callback: test.callback }
      fetchMocker.mockResponseOnce(JSON.stringify(localMockResponse))
      fetchMocker.mockResponseOnce(JSON.stringify({ pr: validLnInvoice }))
      expect(await fetchInvoice(test.lnUrlOrAddress, validSatsAmount, '')).toBe(validLnInvoice)
    }
  })

  it('should throw an error when the invoice is invalid', async () => {
    for (const test of fixtures.lib.lnurl) {
      const localMockResponse = { ...mockLNURLResponse, callback: test.callback }
      fetchMocker.mockResponseOnce(JSON.stringify(localMockResponse))
      fetchMocker.mockResponseOnce(JSON.stringify({ pr: 'lnbc12345678' }))
      await expect(fetchInvoice(test.lnUrlOrAddress, validSatsAmount, '')).rejects.toThrow(
        'Server returned an invalid invoice.',
      )
    }
  })

  it('should throw an error when the invoice amount does not match the requested amount', async () => {
    for (const test of fixtures.lib.lnurl) {
      const localMockResponse = { ...mockLNURLResponse, callback: test.callback }
      fetchMocker.mockResponseOnce(JSON.stringify(localMockResponse))
      fetchMocker.mockResponseOnce(JSON.stringify({ pr: validLnInvoice }))
      await expect(fetchInvoice(test.lnUrlOrAddress, validSatsAmount + 100, '')).rejects.toThrow(
        'Invoice amount does not match requested amount.',
      )
    }
  })
})
