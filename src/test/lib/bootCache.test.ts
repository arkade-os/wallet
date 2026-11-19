import { beforeEach, describe, expect, it } from 'vitest'
import {
  FIAT_PRICES_MAX_AGE_MS,
  readAspInfoSnapshot,
  readFiatPricesSnapshot,
  saveAspInfoSnapshot,
  saveFiatPricesSnapshot,
} from '../../lib/bootCache'
import { emptyAspInfo } from '../../lib/asp'

const URL = 'https://server.example'
const info = { ...emptyAspInfo, url: URL, network: 'mutinynet', signerPubkey: '02'.repeat(33), dust: 330n }

beforeEach(() => localStorage.clear())

describe('server info snapshot', () => {
  it('gives back the last answer for the same server, bigints intact', () => {
    saveAspInfoSnapshot(info, 'build-1')

    const read = readAspInfoSnapshot(URL, 'build-1')

    expect(read?.network).toBe('mutinynet')
    expect(read?.dust).toBe(330n)
    expect(read?.utxoMaxAmount).toBe(-1n)
  })

  it('has nothing for another server', () => {
    saveAspInfoSnapshot(info, 'build-1')

    expect(readAspInfoSnapshot('https://other.example', 'build-1')).toBeUndefined()
  })

  it('has nothing for another build, whose fields may not be the same', () => {
    saveAspInfoSnapshot(info, 'build-1')

    expect(readAspInfoSnapshot(URL, 'build-2')).toBeUndefined()
  })

  it('never keeps an unreachable answer', () => {
    saveAspInfoSnapshot({ ...emptyAspInfo, url: URL, unreachable: true }, 'build-1')

    expect(readAspInfoSnapshot(URL, 'build-1')).toBeUndefined()
  })

  it('reads a damaged entry as nothing', () => {
    localStorage.setItem('aspInfoSnapshot', '{"build":"build-1","info":{"url":"https://server.example"')
    expect(readAspInfoSnapshot(URL, 'build-1')).toBeUndefined()

    const partial = { url: URL, unreachable: false, network: 'mutinynet' }
    localStorage.setItem('aspInfoSnapshot', JSON.stringify({ build: 'build-1', info: partial }))
    expect(readAspInfoSnapshot(URL, 'build-1')).toBeUndefined()
  })
})

describe('fiat prices snapshot', () => {
  const prices = { eur: 60_000, usd: 65_000, chf: 58_000, jpy: 9_000_000, gbp: 51_000, cny: 470_000, brl: 350_000 }

  it('gives back prices saved within the last day', () => {
    saveFiatPricesSnapshot(prices, 1_000)

    expect(readFiatPricesSnapshot(1_000 + FIAT_PRICES_MAX_AGE_MS)).toEqual(prices)
  })

  it('has nothing once they are more than a day old', () => {
    saveFiatPricesSnapshot(prices, 1_000)

    expect(readFiatPricesSnapshot(1_001 + FIAT_PRICES_MAX_AGE_MS)).toBeUndefined()
  })

  it('does not keep a feed that left a currency out', () => {
    saveFiatPricesSnapshot({ ...prices, usd: undefined as unknown as number }, 1_000)

    expect(readFiatPricesSnapshot(1_000)).toBeUndefined()
  })
})
