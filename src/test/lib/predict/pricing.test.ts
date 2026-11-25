import { describe, expect, it } from 'vitest'
import { BEACON_READ_FEE, Q_MAX_MAINNET } from '../../../lib/predict/constants'
import {
  formatCountdown,
  holderPayoff,
  openingSample,
  payoutMultiplier,
  payoutRefusal,
  predictMultiplier,
  predictPayout,
  probAbove,
  settlementOutputs,
  upcomingWindows,
  usdFromCents,
  windowOpen,
} from '../../../lib/predict/pricing'

describe('predict pricing & window math', () => {
  it('computes ~1.90x at-the-money multiplier with 5% desk edge', () => {
    const years = 300 / (365.25 * 86_400)
    const up = predictMultiplier({ kind: 2, spotCents: 6_500_000, lineCents: 6_500_000, years, vol: 0.55 })
    const down = predictMultiplier({ kind: 3, spotCents: 6_500_000, lineCents: 6_500_000, years, vol: 0.55 })
    expect(up).toBe(1.9)
    expect(down).toBe(1.89)
    expect(probAbove(6_500_000, 6_500_000, years, 0.55)).toBeCloseTo(0.5, 2)
  })

  it('returns null outside [1.05x, 10x] bounds', () => {
    const years = 300 / (365.25 * 86_400)
    expect(predictMultiplier({ kind: 2, spotCents: 6_500_000, lineCents: 10_000_000, years, vol: 0.55 })).toBeNull()
    expect(predictMultiplier({ kind: 2, spotCents: 10_000_000, lineCents: 6_500_000, years, vol: 0.55 })).toBeNull()
  })

  it('computes payout and refuses payouts that do not beat stake after read fee', () => {
    const stake = 10_000n
    const payout = predictPayout(stake, 1.9)
    expect(payout).toBe(19_000n)
    expect(payoutMultiplier(stake, payout)).toBe(1.9)
    expect(payoutRefusal(payout, stake, BEACON_READ_FEE, Q_MAX_MAINNET)).toBe('')
    expect(payoutRefusal(11_000n, 10_000n, BEACON_READ_FEE, Q_MAX_MAINNET)).toBe('payout')
    expect(payoutRefusal(Q_MAX_MAINNET + 1n, 10_000n, BEACON_READ_FEE, Q_MAX_MAINNET)).toBe('payout')
  })

  it('resolves all-or-nothing holderPayoff with exact tie going to the desk', () => {
    expect(holderPayoff(2, 6_500_001n, 6_500_000n, 19_000n)).toBe(19_000n)
    expect(holderPayoff(2, 6_500_000n, 6_500_000n, 19_000n)).toBe(0n)
    expect(holderPayoff(3, 6_499_999n, 6_500_000n, 19_000n)).toBe(19_000n)
    expect(holderPayoff(3, 6_500_000n, 6_500_000n, 19_000n)).toBe(0n)
    expect(settlementOutputs(19_000n, 19_000n, BEACON_READ_FEE)).toEqual({ mode: 'holder', holder: 18_000n })
    expect(settlementOutputs(0n, 19_000n, BEACON_READ_FEE)).toEqual({ mode: 'writer', writer: 18_000n })
  })

  it('picks valid 5-minute grid windows and the earliest opening sample', () => {
    const windows = upcomingWindows(1_700_000_000, 3)
    expect(windows).toHaveLength(3)
    for (const w of windows) {
      expect(w % 300).toBe(0)
      expect(w).toBeGreaterThanOrEqual(1_700_000_000 + 120)
    }
    const open = windowOpen(windows[0]!)
    const picked = openingSample(
      [
        { priceCents: 100, time: open - 5 },
        { priceCents: 200, time: open + 25 },
        { priceCents: 150, time: open + 5 },
      ],
      open,
    )
    expect(picked?.priceCents).toBe(150)
  })

  it('formats USD cents and countdowns', () => {
    expect(usdFromCents(6_547_566n)).toBe('$65,475.66')
    expect(formatCountdown(125)).toBe('2:05')
  })
})
