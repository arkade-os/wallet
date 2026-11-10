import { beforeEach, describe, expect, it, vi } from 'vitest'
import { previewSolverQuote } from '../../lib/solverQuote'
import { btcUsdt } from './swapFixtures'
import { quoteOffer, solverDirectionKey, solverId } from '@arkade-os/solver-discovery'
import { ASSET_CARRIER_SATS, findMarket, QUOTE_OPTIONS } from '@arkade-os/swap/protocol'
import { saveSolverCardEnabled, saveSolverRouting } from '../../lib/solverRouting'
import { assetSwapRepository } from '../../lib/swapRepository'
import { solverHealth } from '../../lib/solverHealth'

describe('solver quote preview', () => {
  beforeEach(() => localStorage.clear())
  it.each(['bounds', 'cancel'])('does not penalize a solver for %s', async (reason) => {
    const market = { ...btcUsdt, max_base_amount: '1' }
    const error = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    const fetchImpl = vi.fn(async () => {
      if (reason === 'cancel') throw error
      return new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))
    }) as typeof fetch
    for (let i = 0; i < 2; i++) {
      const pending = previewSolverQuote([market], 'btc', btcUsdt.quote_asset.id, '0.0001', 'mutinynet', fetchImpl)
      if (reason === 'cancel') await expect(pending).rejects.toBe(error)
      else await pending
    }
    expect(
      await solverHealth.deprioritized({
        network: 'mutinynet',
        direction: solverDirectionKey(market, 'base', 'mutinynet'),
      }),
    ).toEqual([])
    expect(localStorage.getItem('solverHealth')).toBeNull()
  })
  it('stops preferring a repeatedly unavailable feed and retains the saved preference', async () => {
    const dead = { ...btcUsdt, source: 'dead', price_feed: 'https://dead.example/price' }
    const live = { ...btcUsdt, source: 'live' }
    const direction = solverDirectionKey(dead, 'base', 'mutinynet')
    saveSolverRouting('mutinynet', direction, { mode: 'usage', preferFirst: solverId(dead, 'mutinynet') })
    const calls: string[] = []
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      calls.push(String(url))
      if (String(url) === dead.price_feed) throw new Error('offline')
      return new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))
    }) as typeof fetch
    for (let i = 0; i < 2; i++)
      expect(
        (await previewSolverQuote([dead, live], 'btc', btcUsdt.quote_asset.id, '0.0001', 'mutinynet', fetchImpl))
          .market,
      ).toEqual(live)
    expect(await solverHealth.deprioritized({ network: 'mutinynet', direction })).toEqual([solverId(dead, 'mutinynet')])
    calls.length = 0
    expect(
      (await previewSolverQuote([dead, live], 'btc', btcUsdt.quote_asset.id, '0.0001', 'mutinynet', fetchImpl)).market,
    ).toEqual(live)
    expect(calls).toEqual([live.price_feed])
  })
  it('shares the trader direction across opposite card orientations', async () => {
    const reversed = {
      ...btcUsdt,
      source: 'reversed',
      pair: 'USDT/BTC',
      base_asset: btcUsdt.quote_asset,
      quote_asset: btcUsdt.base_asset,
      min_base_amount: btcUsdt.min_quote_amount,
      max_base_amount: btcUsdt.max_quote_amount,
      min_quote_amount: btcUsdt.min_base_amount,
      max_quote_amount: btcUsdt.max_base_amount,
    }
    expect(findMarket([reversed], 'btc', btcUsdt.quote_asset.id)?.give).toBe('quote')
    const direction = solverDirectionKey(btcUsdt, 'base', 'mutinynet')
    expect(solverDirectionKey(reversed, 'quote', 'mutinynet')).toBe(direction)
    expect(solverDirectionKey(reversed, 'base', 'mutinynet')).not.toBe(direction)
    saveSolverRouting('mutinynet', direction, { preferFirst: solverId(btcUsdt, 'mutinynet') })
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))) as typeof fetch
    const plan = await previewSolverQuote(
      [reversed, btcUsdt],
      'btc',
      btcUsdt.quote_asset.id,
      '0.0001',
      'mutinynet',
      fetchImpl,
    )
    expect(plan.market).toEqual(btcUsdt)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
  it.each([true, false])('tries preferFirst before cost-ranked fallbacks when available=%s', async (available) => {
    const preferred = { ...btcUsdt, source: 'preferred', price_feed: 'https://preferred.example/price', fee_bps: 500 }
    const middle = { ...btcUsdt, source: 'middle', price_feed: 'https://middle.example/price', fee_bps: 100 }
    const cheapest = { ...btcUsdt, source: 'cheapest', price_feed: 'https://cheapest.example/price', fee_bps: 0 }
    saveSolverRouting('mutinynet', solverDirectionKey(preferred, 'base', 'mutinynet'), {
      mode: 'cost',
      preferFirst: solverId(preferred, 'mutinynet'),
    })
    const calls: string[] = []
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      calls.push(String(url))
      if (!available && String(url) === preferred.price_feed) throw new Error('offline')
      return new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))
    }) as typeof fetch
    const plan = await previewSolverQuote(
      [middle, cheapest, preferred],
      'btc',
      btcUsdt.quote_asset.id,
      '0.0001',
      'mutinynet',
      fetchImpl,
    )
    expect(plan.market).toEqual(available ? preferred : cheapest)
    expect(calls.filter((url) => url === preferred.price_feed)).toHaveLength(2)
    expect(calls.slice(available ? -1 : -2)).toEqual(
      available ? [preferred.price_feed] : [preferred.price_feed, cheapest.price_feed],
    )
  })
  it('continues after an unavailable feed and preserves the successful market', async () => {
    const dead = { ...btcUsdt, source: 'dead', price_feed: 'https://dead.example/price' }
    const live = { ...btcUsdt, source: 'live' }
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes('dead.example')) throw new Error('offline')
      return new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))
    }) as typeof fetch
    const plan = await previewSolverQuote([dead, live], 'btc', btcUsdt.quote_asset.id, '0.0001', 'mutinynet', fetchImpl)
    expect(plan.market).toEqual(live)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
  it('uses persisted manual priority before fetching a preview', async () => {
    const first = { ...btcUsdt, source: 'first' }
    const preferred = { ...btcUsdt, source: 'preferred' }
    saveSolverRouting('mutinynet', solverDirectionKey(first, 'base', 'mutinynet'), {
      priority: [solverId(preferred, 'mutinynet')],
    })
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))) as typeof fetch
    const plan = await previewSolverQuote(
      [first, preferred],
      'btc',
      btcUsdt.quote_asset.id,
      '0.0001',
      'mutinynet',
      fetchImpl,
    )
    expect(plan.market).toEqual(preferred)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('does not fetch a paused card or a solver disabled for this direction', async () => {
    const pausedCard = {
      ...btcUsdt,
      solver: 'Pin',
      source: 'Pin',
      sourceType: 'local' as const,
      discovery_pubkey: undefined,
      price_feed: 'https://paused.example/price',
    }
    const pausedDirection = { ...btcUsdt, source: 'direction', price_feed: 'https://direction.example/price' }
    const live = { ...btcUsdt, source: 'live' }
    saveSolverCardEnabled({ network: 'mutinynet', label: 'Pin', card: { version: 0, name: 'Pin' } }, false)
    saveSolverRouting('mutinynet', solverDirectionKey(live, 'base', 'mutinynet'), {
      mode: 'cost',
      disabled: [solverId(pausedDirection, 'mutinynet')],
    })
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))) as typeof fetch
    const plan = await previewSolverQuote(
      [pausedCard, pausedDirection, live],
      'btc',
      btcUsdt.quote_asset.id,
      '0.0001',
      'mutinynet',
      fetchImpl,
    )
    expect(plan.market).toEqual(live)
    for (const [url] of vi.mocked(fetchImpl).mock.calls) expect(String(url)).toBe(live.price_feed)
  })

  it('does not request feeds when every solver for a direction is paused', async () => {
    saveSolverRouting('mutinynet', solverDirectionKey(btcUsdt, 'base', 'mutinynet'), {
      disabled: [solverId(btcUsdt, 'mutinynet')],
    })
    const fetchImpl = vi.fn() as typeof fetch
    await expect(
      previewSolverQuote([btcUsdt], 'btc', btcUsdt.quote_asset.id, '0.0001', 'mutinynet', fetchImpl),
    ).rejects.toThrow('No enabled solver')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('ranks cost at the entered amount before previewing', async () => {
    const expensive = { ...btcUsdt, source: 'expensive', fee_bps: 200 }
    const cheap = { ...btcUsdt, source: 'cheap', fee_bps: 10 }
    saveSolverRouting('mutinynet', solverDirectionKey(expensive, 'base', 'mutinynet'), { mode: 'cost' })
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))) as typeof fetch
    const plan = await previewSolverQuote(
      [expensive, cheap],
      'btc',
      btcUsdt.quote_asset.id,
      '0.0001',
      'mutinynet',
      fetchImpl,
    )
    expect(plan.market).toEqual(cheap)
  })

  it('falls back to saved priority when completed usage cannot be read', async () => {
    const first = { ...btcUsdt, source: 'first' }
    const preferred = { ...btcUsdt, source: 'preferred' }
    saveSolverRouting('mutinynet', solverDirectionKey(first, 'base', 'mutinynet'), {
      mode: 'usage',
      priority: [solverId(preferred, 'mutinynet')],
    })
    vi.spyOn(assetSwapRepository, 'getSwapRecordsPage').mockRejectedValueOnce(new Error('history unavailable'))
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))) as typeof fetch
    const plan = await previewSolverQuote(
      [first, preferred],
      'btc',
      btcUsdt.quote_asset.id,
      '0.0001',
      'mutinynet',
      fetchImpl,
    )
    expect(plan.market).toEqual(preferred)
  })

  it('includes the delivered carrier in both cost ranking and preview amounts', async () => {
    const market = {
      ...btcUsdt,
      quote_asset: { ...btcUsdt.quote_asset, caip19_id: `arkade:mutinynet/asset:${btcUsdt.quote_asset.id}` },
    }
    const charged = { ...market, source: 'charged', fee_bps: 0, charges_delivered_carrier: true }
    const expensive = { ...market, source: 'expensive', fee_bps: 1000 }
    saveSolverRouting('mutinynet', solverDirectionKey(charged, 'base', 'mutinynet'), { mode: 'cost' })
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))) as typeof fetch
    const plan = await previewSolverQuote(
      [charged, expensive],
      'btc',
      btcUsdt.quote_asset.id,
      '0.0001',
      'mutinynet',
      fetchImpl,
    )
    const expected = await quoteOffer(charged, {
      give: 'base',
      giveAmount: '0.0001',
      carrierSats: ASSET_CARRIER_SATS,
      fetchImpl,
      ...QUOTE_OPTIONS,
    })
    expect(plan.market).toEqual(charged)
    expect(plan.receive.atomic).toEqual(expected.receive.atomic)
    expect(plan.receive.atomic).toBeLessThan(BigInt(1000))
  })

  it('skips a solver whose give maximum cannot serve the entered amount', async () => {
    const small = { ...btcUsdt, source: 'small', max_base_amount: '5000' }
    const large = { ...btcUsdt, source: 'large' }
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))) as typeof fetch
    const plan = await previewSolverQuote(
      [small, large],
      'btc',
      btcUsdt.quote_asset.id,
      '0.0001',
      'mutinynet',
      fetchImpl,
    )
    expect(plan.market).toEqual(large)
  })

  it('skips a solver whose Bitcoin output is below the server dust limit', async () => {
    const dusty = { ...btcUsdt, source: 'dusty', fee_bps: 9000, min_base_amount: '1' }
    const live = { ...btcUsdt, source: 'live', fee_bps: 0, min_base_amount: '1' }
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 10000 } }))) as typeof fetch
    const plan = await previewSolverQuote(
      [dusty, live],
      btcUsdt.quote_asset.id,
      'btc',
      '1',
      'mutinynet',
      fetchImpl,
      undefined,
      BigInt(5000),
    )
    expect(plan.market).toEqual(live)
    expect(plan.receive.atomic).toBeGreaterThanOrEqual(BigInt(5000))
  })

  it('rejects unsupported pairs without requesting feeds', async () => {
    const fetchImpl = vi.fn() as typeof fetch
    await expect(previewSolverQuote([btcUsdt], 'unknown', 'btc', '1', 'bitcoin', fetchImpl)).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
