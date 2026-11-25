import { describe, expect, it } from 'vitest'
import { classifyPredictIntent, splitPayouts } from '../../../lib/predict/lifecycle'

const HOLDER = `5120${'aa'.repeat(32)}`
const VAULT = `5120${'bb'.repeat(32)}`
const DESK = `5120${'cc'.repeat(32)}`
const TX1 = '11'.repeat(32)
const TX2 = '22'.repeat(32)

describe('predict intent lifecycle classification', () => {
  it('classifies open, funded, expired-refundable, filled, and refunded states', () => {
    expect(
      classifyPredictIntent({
        coins: [],
        spends: {},
        collateral: 19_000n,
        stake: 10_000n,
        holderScript: HOLDER,
        vaultScript: VAULT,
        now: 1_000,
        deadline: 1_060,
      }).phase,
    ).toBe('open')

    const funded = classifyPredictIntent({
      coins: [{ value: 10_000n, spent: false, spentBy: '', txid: TX1 }],
      spends: {},
      collateral: 19_000n,
      stake: 10_000n,
      holderScript: HOLDER,
      vaultScript: VAULT,
      now: 1_010,
      deadline: 1_060,
    })
    expect(funded.phase).toBe('funded')
    expect(funded.refundable).toBe(false)

    const expired = classifyPredictIntent({
      coins: [{ value: 10_000n, spent: false, spentBy: '', txid: TX1 }],
      spends: {},
      collateral: 19_000n,
      stake: 10_000n,
      holderScript: HOLDER,
      vaultScript: VAULT,
      now: 1_070,
      deadline: 1_060,
    })
    expect(expired.phase).toBe('expired')
    expect(expired.refundable).toBe(true)

    const filled = classifyPredictIntent({
      coins: [{ value: 10_000n, spent: true, spentBy: TX2, txid: TX1 }],
      spends: { [TX2]: [{ amount: 19_000n, script: VAULT }] },
      collateral: 19_000n,
      stake: 10_000n,
      holderScript: HOLDER,
      vaultScript: VAULT,
      now: 1_020,
      deadline: 1_060,
    })
    expect(filled.phase).toBe('filled')
    expect(filled.closeTxid).toBe(TX2)

    const refunded = classifyPredictIntent({
      coins: [{ value: 10_000n, spent: true, spentBy: TX2, txid: TX1 }],
      spends: { [TX2]: [{ amount: 10_000n, script: HOLDER }] },
      collateral: 19_000n,
      stake: 10_000n,
      holderScript: HOLDER,
      vaultScript: VAULT,
      now: 1_090,
      deadline: 1_060,
    })
    expect(refunded.phase).toBe('refunded')
    expect(refunded.refundable).toBe(false)
  })

  it('splits settlement payouts skipping beacon continuation at output 0', () => {
    const beacon = `5120${'dd'.repeat(32)}`
    const win = splitPayouts(
      [
        { amount: 2_000n, script: beacon },
        { amount: 18_000n, script: HOLDER },
      ],
      HOLDER,
      DESK,
    )
    expect(win).toEqual({ user: 18_000n, desk: 0n })
  })
})
