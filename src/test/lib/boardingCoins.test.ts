import { describe, expect, it } from 'vitest'
import { takeFreshCoins } from '../../lib/boardingCoins'

const coin = (txid: string, value = 1) => ({ txid, vout: 0, value })

describe('takeFreshCoins', () => {
  it('returns only outpoints that were not already known', () => {
    const known = new Set(['stored:0'])
    const fresh = takeFreshCoins(known, [coin('stored', 50_000), coin('new', 21_000)])
    expect(fresh).toEqual([coin('new', 21_000)])
    expect(takeFreshCoins(known, [coin('stored'), coin('new')])).toEqual([])
  })
})
