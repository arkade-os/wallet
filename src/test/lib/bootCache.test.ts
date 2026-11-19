import { beforeEach, describe, expect, it } from 'vitest'
import {
  FIAT_PRICES_MAX_AGE_MS,
  HOME_SNAPSHOT_TXS,
  readAspInfoSnapshot,
  readFiatPricesSnapshot,
  readHomeSnapshot,
  saveAspInfoSnapshot,
  saveFiatPricesSnapshot,
  saveHomeSnapshot,
  type HomeSnapshot,
} from '../../lib/bootCache'
import { clearStorage } from '../../lib/storage'
import { emptyAspInfo } from '../../lib/asp'
import type { Tx } from '../../lib/types'

const URL = 'https://server.example'
const info = { ...emptyAspInfo, url: URL, network: 'mutinynet', signerPubkey: '02'.repeat(33), dust: 330n }

const tx = (n: number): Tx =>
  ({
    amount: 1000 + n,
    boardingTxid: '',
    createdAt: 1_700_000_000 + n,
    explorable: undefined,
    preconfirmed: false,
    redeemTxid: `redeem-${n}`,
    roundTxid: '',
    settled: true,
    type: 'received',
  }) as Tx

const home = (over: Partial<HomeSnapshot> = {}): HomeSnapshot => ({
  build: 'build-1',
  pubkey: 'pubkey-1',
  aspUrl: URL,
  savedAt: 1,
  balance: 148_000,
  availableBalance: 140_000,
  assetBalances: [{ assetId: 'aa'.repeat(34), amount: 5n }],
  availableAssetBalances: [{ assetId: 'aa'.repeat(34), amount: 2n }],
  txs: [tx(1), tx(2)],
  ...over,
})

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

describe('Home snapshot', () => {
  it('gives back what was saved for this wallet and build, bigints intact', () => {
    saveHomeSnapshot(home())

    const read = readHomeSnapshot('pubkey-1', 'build-1')

    expect(read?.balance).toBe(148_000)
    expect(read?.assetBalances).toEqual([{ assetId: 'aa'.repeat(34), amount: 5n }])
    expect(read?.txs.map((row) => row.redeemTxid)).toEqual(['redeem-1', 'redeem-2'])
  })

  it('has nothing for another wallet', () => {
    saveHomeSnapshot(home())

    expect(readHomeSnapshot('pubkey-2', 'build-1')).toBeUndefined()
    expect(readHomeSnapshot(undefined, 'build-1')).toBeUndefined()
  })

  it('has nothing for another build, whose rows may not have the same shape', () => {
    saveHomeSnapshot(home())

    expect(readHomeSnapshot('pubkey-1', 'build-2')).toBeUndefined()
  })

  it('keeps only the rows Home can use', () => {
    saveHomeSnapshot(home({ txs: Array.from({ length: 40 }, (_, n) => tx(n)) }))

    expect(readHomeSnapshot('pubkey-1', 'build-1')?.txs).toHaveLength(HOME_SNAPSHOT_TXS)
  })

  it('reads a damaged entry as nothing rather than handing a screen a broken row', () => {
    saveHomeSnapshot(home())
    const stored = JSON.parse(localStorage.getItem('homeSnapshot')!)
    stored.txs[0] = { amount: 'lots' }
    localStorage.setItem('homeSnapshot', JSON.stringify(stored))

    expect(readHomeSnapshot('pubkey-1', 'build-1')).toBeUndefined()
  })

  it('goes with everything else when the wallet is reset', async () => {
    saveHomeSnapshot(home())
    saveAspInfoSnapshot(info, 'build-1')

    await clearStorage()

    expect(readHomeSnapshot('pubkey-1', 'build-1')).toBeUndefined()
    expect(readAspInfoSnapshot(URL, 'build-1')).toBeUndefined()
  })
})
