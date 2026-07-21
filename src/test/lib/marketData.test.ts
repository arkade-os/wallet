import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildConstantMarketSeries, fetchHistoricalMarketData } from '../../lib/marketData'
import { Currencies } from '../../lib/types'

describe('buildConstantMarketSeries', () => {
  it('samples the full window densely enough to reach the chart edges', () => {
    const series = buildConstantMarketSeries(1, 600, 1_000)

    expect(series).toHaveLength(101)
    expect(series[0]).toEqual({ time: 400, value: 1 })
    expect(series[1]).toEqual({ time: 406, value: 1 })
    expect(series[50]).toEqual({ time: 700, value: 1 })
    expect(series[100]).toEqual({ time: 1_000, value: 1 })
  })

  it('uses a stable one-day window for the all-time constant series', () => {
    const series = buildConstantMarketSeries(1, -1, 100_000)

    expect(series).toHaveLength(101)
    expect(series[0]).toEqual({ time: 13_600, value: 1 })
    expect(series[50]).toEqual({ time: 56_800, value: 1 })
    expect(series[100]).toEqual({ time: 100_000, value: 1 })
  })
})

describe('fetchHistoricalMarketData', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads fresh BRL history from the public BTCBRL market', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        [1_000_000, '1', '1', '1', '320000.00'],
        [2_000_000, '1', '1', '1', '321000.00'],
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchHistoricalMarketData(604_800, Currencies.BRL)).resolves.toEqual([
      { time: 1_000, value: 320_000 },
      { time: 2_000, value: 321_000 },
    ])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://data-api.binance.vision/api/v3/klines?symbol=BTCBRL&interval=1h&limit=168',
      { signal: undefined },
    )
  })

  it('falls back to the chart proxy when the public BTCBRL market is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          when: 2_000_000,
          from: 'coingecko',
          data: [
            { time: 1_000, value: 320_000 },
            { time: 2_000, value: 321_000 },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchHistoricalMarketData(604_800, Currencies.BRL)).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenLastCalledWith('https://price-chart-proxy.arkade.money?period=oneWeek&fiat=BRL', {
      signal: undefined,
    })
  })
})
