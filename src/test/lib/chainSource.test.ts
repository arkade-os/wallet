// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import * as btc from '@scure/btc-signer'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { MIN_CLAIM_FEE_RATE, claimFeeRate, esploraChainSource } from '../../lib/chainSource'

/**
 * The wallet's L1 reads, which decide whether an onchain-send fill is claimable
 * and when its window shuts. Every case here is one where a wrong answer is
 * indistinguishable from "nothing has happened yet" — an empty UTXO list, a
 * confirmation count that is one too high, a timestamp that is not the median —
 * so none of them would surface as an error. They would surface as a claim that
 * was never attempted.
 */
const REGTEST = { bech32: 'bcrt', pubKeyHash: 0x6f, scriptHash: 0xc4, wif: 0xef }
const xOnly = secp256k1.getPublicKey(new Uint8Array(32).fill(3), true).slice(1)
const pkScript = btc.p2tr(xOnly, undefined, REGTEST).script
const address = btc.Address(REGTEST).encode(btc.OutScript.decode(pkScript))

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
})

/** A fetch that answers by path suffix, and records what it was asked. */
const routes = (table: Record<string, unknown>) => {
  const seen: string[] = []
  const impl = (async (url: string, init?: { method?: string; body?: string }) => {
    const path = url.replace('http://esplora/api', '')
    seen.push(`${init?.method ?? 'GET'} ${path}`)
    const key = Object.keys(table).find((candidate) => candidate === path)
    if (key === undefined) return { ok: false, status: 404, text: async () => 'not found', json: async () => ({}) }
    return ok(table[key])
  }) as unknown as typeof fetch
  return { impl, seen }
}

const source = (table: Record<string, unknown>) => {
  const { impl, seen } = routes(table)
  return { chain: esploraChainSource('http://esplora/api/', 'regtest', impl), seen }
}

describe('esploraChainSource', () => {
  describe('getScriptUtxos', () => {
    it('looks the script up by its address, never by a hand-rolled script hash', () => {
      // A byte-reversed script hash returns an empty list rather than an error,
      // and an empty list is exactly what "not funded yet" looks like — so this
      // mistake would surface as a claim window that quietly expired.
      const { chain, seen } = source({ '/blocks/tip/height': '200', [`/address/${address}/utxo`]: [] })
      return chain.getScriptUtxos(pkScript).then(() => {
        expect(seen).toContain(`GET /address/${address}/utxo`)
      })
    })

    it('counts a block-height confirmation inclusively', async () => {
      const { chain } = source({
        '/blocks/tip/height': '200',
        [`/address/${address}/utxo`]: [
          { txid: 'a', vout: 0, value: 12_345, status: { confirmed: true, block_height: 200 } },
        ],
      })
      const [utxo] = await chain.getScriptUtxos(pkScript)
      // Mined into the tip is one confirmation, not zero and not two.
      expect(utxo).toEqual({ txid: 'a', vout: 0, amount: BigInt(12_345), confirmations: 1 })
    })

    it('calls a mempool output zero deep, not one', async () => {
      // A 1-confirmation policy must not be satisfied by a transaction that can
      // still be replaced.
      const { chain } = source({
        '/blocks/tip/height': '200',
        [`/address/${address}/utxo`]: [{ txid: 'a', vout: 1, value: 500, status: { confirmed: false } }],
      })
      expect((await chain.getScriptUtxos(pkScript))[0].confirmations).toBe(0)
    })

    it('reports an unfunded script as no outputs rather than throwing', async () => {
      const { chain } = source({ '/blocks/tip/height': '200', [`/address/${address}/utxo`]: [] })
      expect(await chain.getScriptUtxos(pkScript)).toEqual([])
    })
  })

  describe('getSpendingTx', () => {
    it('returns nothing while the output is unspent', async () => {
      const { chain } = source({ '/tx/abc/outspend/0': { spent: false } })
      expect(await chain.getSpendingTx('abc', 0)).toBeNull()
    })

    it('fetches the raw spend, which is where the preimage is read from', async () => {
      const { chain } = source({
        '/tx/abc/outspend/0': { spent: true, txid: 'spender' },
        '/tx/spender/hex': '0200000000\n',
      })
      expect(await chain.getSpendingTx('abc', 0)).toEqual({ txHex: '0200000000' })
    })
  })

  describe('getMtp', () => {
    it('takes the median of the last eleven blocks, not the tip timestamp', async () => {
      // Consensus matures a CLTV leaf against MTP, which lags the tip by about
      // an hour. Using the tip's own timestamp would call the solver's refund
      // leaf open while the trader's claim was in fact still available.
      const block = (height: number, timestamp: number) => ({ height, timestamp })
      const { chain } = source({
        '/blocks': [
          block(20, 2000),
          block(19, 1900),
          block(18, 1800),
          block(17, 1700),
          block(16, 1600),
          block(15, 1500),
          block(14, 1400),
          block(13, 1300),
          block(12, 1200),
          block(11, 1100),
        ],
        '/blocks/10': [block(10, 1000), block(9, 900), block(8, 800)],
      })
      // Heights 20..10, median of the eleven timestamps is height 15's.
      expect(await chain.getMtp()).toBe(1500)
    })

    it('takes the median of what exists on a chain shorter than eleven blocks', async () => {
      const { chain } = source({
        '/blocks': [
          { height: 2, timestamp: 300 },
          { height: 1, timestamp: 200 },
          { height: 0, timestamp: 100 },
        ],
      })
      expect(await chain.getMtp()).toBe(200)
    })
  })

  describe('broadcast', () => {
    it('returns the txid the node accepted', async () => {
      const impl = vi.fn(async () => ok('deadbeef')) as unknown as typeof fetch
      const chain = esploraChainSource('http://esplora/api', 'regtest', impl)
      expect(await chain.broadcast('0200')).toBe('deadbeef')
    })

    it('surfaces the node’s rejection rather than a bare status', async () => {
      const impl = (async () => ({ ok: false, status: 400, text: async () => 'min relay fee not met' })) as never
      const chain = esploraChainSource('http://esplora/api', 'regtest', impl)
      await expect(chain.broadcast('0200')).rejects.toThrow(/min relay fee not met/)
    })
  })
})

describe('claimFeeRate', () => {
  it('takes the two-block target, rounded up', async () => {
    const impl = (async () => ok({ '1': 12.4, '2': 8.2, '3': 4 })) as never
    expect(await claimFeeRate('http://esplora/api', impl)).toBe(9)
  })

  it('never stops a claim it cannot price', async () => {
    // The claim races a consensus deadline; an esplora that cannot answer must
    // not be the reason the fill is forfeited. The floor still relays.
    const dead = (async () => {
      throw new Error('esplora down')
    }) as never
    expect(await claimFeeRate('http://esplora/api', dead)).toBe(MIN_CLAIM_FEE_RATE)
    const empty = (async () => ok({})) as never
    expect(await claimFeeRate('http://esplora/api', empty)).toBe(MIN_CLAIM_FEE_RATE)
  })
})
