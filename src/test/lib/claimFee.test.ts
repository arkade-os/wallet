import { beforeEach, describe, expect, it, vi } from 'vitest'
import { claimFeeRate, MIN_CLAIM_FEE_RATE } from '../../lib/claimFee'
import { consoleError } from '../../lib/logs'

vi.mock('../../lib/logs', () => ({ consoleError: vi.fn() }))

const BASE = 'http://e/api'
const MEMPOOL = '/v1/fees/recommended'
const ESPLORA = '/fee-estimates'

type Reply = { status?: number; type?: string; body?: unknown }

const reply = ({ status = 200, type = 'application/json', body = {} }: Reply) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': type }),
    json: async () => body,
  }) as unknown as Response

/** The SPA a base URL missing `/api` reaches: 200 and HTML, but still parseable as an empty fee set. */
const spa = { status: 200, type: 'text/html', body: {} }

const server = (routes: Record<string, Reply>) => {
  const seen: string[] = []
  const impl = (async (url: string) => {
    seen.push(url.slice(BASE.length))
    const hit = Object.keys(routes).find((path) => url.endsWith(path))
    return reply(hit ? routes[hit] : { status: 404, type: 'text/html' })
  }) as unknown as typeof fetch
  return { impl, seen }
}

describe('claimFeeRate', () => {
  beforeEach(() => vi.mocked(consoleError).mockClear())

  it('reads the named tiers an Arkade mempool deployment actually serves', async () => {
    const { impl, seen } = server({ [MEMPOOL]: { body: { fastestFee: 3, halfHourFee: 1, hourFee: 1 } } })
    expect(await claimFeeRate(BASE, impl)).toBe(3)
    expect(seen[0]).toBe(MEMPOOL)
  })

  it('prefers the tightest tier, because an unconfirmed claim loses the fill', async () => {
    const { impl } = server({ [MEMPOOL]: { body: { fastestFee: 7, halfHourFee: 2 } } })
    expect(await claimFeeRate(BASE, impl)).toBe(7)
  })

  it('skips a tier at or below the floor rather than believing it', async () => {
    const zero = server({ [MEMPOOL]: { body: { fastestFee: 0, halfHourFee: 5 } } })
    expect(await claimFeeRate(BASE, zero.impl)).toBe(5)
    const atFloor = server({ [MEMPOOL]: { body: { fastestFee: 1, halfHourFee: 4 } } })
    expect(await claimFeeRate(BASE, atFloor.impl)).toBe(4)
  })

  it('rounds up, because a fractional sat/vB is not a rate a node takes', async () => {
    const { impl } = server({ [MEMPOOL]: { body: { fastestFee: 4.2 } } })
    expect(await claimFeeRate(BASE, impl)).toBe(5)
  })

  it('still reads an Esplora-backed deployment, which serves the other shape', async () => {
    const { impl, seen } = server({ [ESPLORA]: { body: { '1': 30, '2': 20, '3': 10 } } })
    expect(await claimFeeRate(BASE, impl)).toBe(20)
    expect(seen).toContain(ESPLORA)
  })

  it('refuses a 200 carrying HTML instead of reading it as an empty fee set', async () => {
    const { impl, seen } = server({ [MEMPOOL]: spa, [ESPLORA]: { body: { '2': 6 } } })
    expect(await claimFeeRate(BASE, impl)).toBe(6)
    expect(seen).toContain(ESPLORA)
  })

  it('falls back to the floor when the deployment 404s the fee endpoints', async () => {
    const { impl } = server({})
    expect(await claimFeeRate(BASE, impl)).toBe(MIN_CLAIM_FEE_RATE)
  })

  it('never throws: a refusing or unreachable deployment must not stop a ready claim', async () => {
    const boom = (async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    expect(await claimFeeRate(BASE, boom)).toBe(MIN_CLAIM_FEE_RATE)
  })

  it('reports a fee source it could not read at all', async () => {
    const { impl } = server({ [MEMPOOL]: spa, [ESPLORA]: spa })
    expect(await claimFeeRate(BASE, impl)).toBe(MIN_CLAIM_FEE_RATE)
    expect(consoleError).toHaveBeenCalledOnce()
  })

  it('stays quiet when the source is read and the network is simply at the floor', async () => {
    const { impl } = server({ [MEMPOOL]: { body: { fastestFee: 1, halfHourFee: 1 } } })
    expect(await claimFeeRate(BASE, impl)).toBe(MIN_CLAIM_FEE_RATE)
    expect(consoleError).not.toHaveBeenCalled()
  })
})
