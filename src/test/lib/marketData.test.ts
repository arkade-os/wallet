import { describe, expect, it } from 'vitest'
import { buildConstantMarketSeries } from '../../lib/marketData'

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
