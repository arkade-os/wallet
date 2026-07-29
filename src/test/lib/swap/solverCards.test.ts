import { beforeEach, describe, expect, it } from 'vitest'
import { getPinnedSolverCards, pinSolverCard, unpinSolverCard } from '../../../lib/swap/solverCards'
import { asCardMarket, btcDepix, solverCard } from './fixtures'

const STORAGE_KEY = 'pinnedSolverCards'

describe('pinned solver cards', () => {
  beforeEach(() => localStorage.clear())

  it('pins a schema-valid card and lists it for its network only', () => {
    const result = pinSolverCard('mutinynet', solverCard())
    expect(result.ok).toBe(true)
    expect(getPinnedSolverCards('mutinynet').map((p) => p.card.name)).toEqual(['privateer'])
    expect(getPinnedSolverCards('bitcoin')).toEqual([])
  })

  it('rejects an invalid card with the schema errors, storing nothing', () => {
    const result = pinSolverCard('mutinynet', { ...solverCard(), version: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join()).toContain('/version must be 0')
    expect(getPinnedSolverCards('mutinynet')).toEqual([])
  })

  it('rejects non-object input without throwing', () => {
    expect(pinSolverCard('mutinynet', 'not a card').ok).toBe(false)
    expect(pinSolverCard('mutinynet', null).ok).toBe(false)
  })

  it('replaces a re-pinned card of the same name on the same network', () => {
    pinSolverCard('mutinynet', solverCard())
    pinSolverCard('mutinynet', solverCard('privateer', [asCardMarket(btcDepix)]))
    const pinned = getPinnedSolverCards('mutinynet')
    expect(pinned).toHaveLength(1)
    expect(pinned[0].card.markets[0].pair).toBe('BTC/DePix')
  })

  it('keeps same-named cards on other networks when replacing', () => {
    pinSolverCard('bitcoin', solverCard())
    pinSolverCard('mutinynet', solverCard('privateer', [asCardMarket(btcDepix)]))
    expect(getPinnedSolverCards('bitcoin')[0].card.markets[0].pair).toBe('BTC/USDT')
  })

  it('unpins by network and name', () => {
    pinSolverCard('mutinynet', solverCard())
    pinSolverCard('mutinynet', solverCard('other'))
    unpinSolverCard('mutinynet', 'privateer')
    expect(getPinnedSolverCards('mutinynet').map((p) => p.card.name)).toEqual(['other'])
  })

  it('survives a corrupt storage blob and drops unshaped entries', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(getPinnedSolverCards('mutinynet')).toEqual([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify([null, { network: 'mutinynet' }, 42]))
    expect(getPinnedSolverCards('mutinynet')).toEqual([])
  })
})
