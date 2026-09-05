/**
 * The one arithmetic in the book that can destroy money.
 *
 * An Arkade transaction spending asset-bearing inputs burns every atomic unit
 * its packet does not name, so a bid fill is only safe if the packet returns
 * the taker's surplus. These are pure sums — no chain, no wallet.
 */
import { describe, expect, it } from 'vitest'
import { deliverAsset } from '../../lib/book'

const sum = (xs: { amount: bigint }[]) => xs.reduce((s, x) => s + x.amount, 0n)

describe('deliverAsset', () => {
  it('returns the surplus to the taker rather than burning it', () => {
    const { inputs, outputs } = deliverAsset([700n, 500n], 900n)
    // both coins are needed, and both are spent WHOLE
    expect(inputs).toEqual([
      { vin: 1, amount: 700n },
      { vin: 2, amount: 500n },
    ])
    expect(outputs).toEqual([
      { vout: 0, amount: 900n }, // the maker's price
      { vout: 1, amount: 300n }, // ours back
    ])
  })

  it('conserves every atomic unit it moves', () => {
    for (const [coins, want] of [
      [[1_000n], 1n],
      [[3n, 3n, 3n], 7n],
      [[10n ** 30n], 10n ** 29n],
    ] as const) {
      const { inputs, outputs } = deliverAsset(coins, want)
      expect(sum(inputs)).toBe(sum(outputs))
      expect(outputs[0]).toEqual({ vout: 0, amount: want })
    }
  })

  it('spends no more coins than the price needs', () => {
    // the third coin is untouched: an unneeded input is one more balance to
    // account for, and every one of them is a burn if the packet misses it
    expect(deliverAsset([500n, 500n, 500n], 600n).inputs).toHaveLength(2)
    expect(deliverAsset([500n, 500n, 500n], 500n).inputs).toHaveLength(1)
  })

  it('omits the surplus output when the coins land exactly', () => {
    const { inputs, outputs } = deliverAsset([400n, 600n], 1_000n)
    expect(inputs).toHaveLength(2)
    expect(outputs).toEqual([{ vout: 0, amount: 1_000n }])
  })

  it('refuses when the taker holds too little, naming both sides', () => {
    expect(() => deliverAsset([100n, 250n], 500n)).toThrow(/wants 500, you hold 350/)
    expect(() => deliverAsset([], 1n)).toThrow(/not enough of that asset/)
  })
})
