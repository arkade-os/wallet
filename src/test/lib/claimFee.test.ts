import { describe, expect, it } from 'vitest'
import { claimFeeRate, MIN_CLAIM_FEE_RATE } from '../../lib/claimFee'

const serving = (body: unknown, ok = true): typeof fetch =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch

describe('claimFeeRate', () => {
  it('prefers the two-block bucket', async () => {
    expect(await claimFeeRate('http://e', serving({ '1': 30, '2': 20, '3': 10 }))).toBe(20)
  })

  // The bug: a bucket reported as 0 was taken and then rejected, dropping the
  // claim to the floor while a usable neighbour sat right there.
  it('skips an unusable higher-priority bucket rather than falling to the floor', async () => {
    expect(await claimFeeRate('http://e', serving({ '1': 25, '2': 0, '3': 12 }))).toBe(25)
    expect(await claimFeeRate('http://e', serving({ '1': 'nope', '2': null, '3': 12 }))).toBe(12)
  })

  it('rounds up, because a fractional sat/vB is not a rate a node takes', async () => {
    expect(await claimFeeRate('http://e', serving({ '2': 4.2 }))).toBe(5)
  })

  it('falls back to the floor when nothing is usable', async () => {
    expect(await claimFeeRate('http://e', serving({ '1': 0, '2': 1, '3': -4 }))).toBe(MIN_CLAIM_FEE_RATE)
    expect(await claimFeeRate('http://e', serving({}))).toBe(MIN_CLAIM_FEE_RATE)
  })

  it('never throws: a refusing or unreachable esplora must not stop a ready claim', async () => {
    expect(await claimFeeRate('http://e', serving({ '2': 20 }, false))).toBe(MIN_CLAIM_FEE_RATE)
    const boom = (async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    expect(await claimFeeRate('http://e', boom)).toBe(MIN_CLAIM_FEE_RATE)
  })
})
