import { describe, expect, it } from 'vitest'
import { buildCrossRatePoints } from '../../../lib/marketData'

describe('account market data', () => {
  it('derives fiat cross-rates only from time-aligned market observations', () => {
    const points = buildCrossRatePoints(
      [
        { time: 1_000, value: 50_000 },
        { time: 2_000, value: 51_000 },
      ],
      [
        { time: 1_010, value: 250_000 },
        { time: 2_010, value: 255_000 },
      ],
    )

    expect(points).toEqual([
      { time: 1_000, value: 5 },
      { time: 2_000, value: 5 },
    ])
  })

  it('does not combine observations from non-overlapping periods', () => {
    const points = buildCrossRatePoints(
      [
        { time: 1_000, value: 50_000 },
        { time: 2_000, value: 51_000 },
      ],
      [
        { time: 20_000, value: 250_000 },
        { time: 21_000, value: 255_000 },
      ],
    )

    expect(points).toEqual([])
  })
})
