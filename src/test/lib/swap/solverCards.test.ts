import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Network } from '@arkade-os/solver-discovery'
import {
  getPinnedSolverCards,
  MAX_CARD_JSON_BYTES,
  MAX_PINNED_CARDS_PER_NETWORK,
  pinSolverCard,
  unpinAllSolverCards,
  unpinSolverCard,
} from '../../../lib/swap/solverCards'
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

  it('unpins all cards for one network, leaving other networks alone', () => {
    pinSolverCard('mutinynet', solverCard())
    pinSolverCard('mutinynet', solverCard('other'))
    pinSolverCard('bitcoin', solverCard('elsewhere'))
    unpinAllSolverCards('mutinynet')
    expect(getPinnedSolverCards('mutinynet')).toEqual([])
    expect(getPinnedSolverCards('bitcoin').map((p) => p.card.name)).toEqual(['elsewhere'])
  })

  it('survives a corrupt storage blob and drops unshaped entries', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(getPinnedSolverCards('mutinynet')).toEqual([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify([null, { network: 'mutinynet' }, 42]))
    expect(getPinnedSolverCards('mutinynet')).toEqual([])
  })

  it('keeps shaped entries while dropping junk from the same blob', () => {
    pinSolverCard('mutinynet', solverCard())
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([null, 42, { network: 'mutinynet' }, ...stored]))
    expect(getPinnedSolverCards('mutinynet').map((p) => p.card.name)).toEqual(['privateer'])
  })

  it('refuses networks solver discovery does not know', () => {
    const result = pinSolverCard('testnet' as unknown as Network, solverCard())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join()).toContain('not supported')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('rejects a card bigger than the storage budget', () => {
    // the schema caps no field length, so a pathological name inflates the card
    const result = pinSolverCard('mutinynet', solverCard('x'.repeat(MAX_CARD_JSON_BYTES)))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join()).toContain('too large')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('caps the number of pinned solvers per network', () => {
    for (let i = 0; i < MAX_PINNED_CARDS_PER_NETWORK; i++) {
      expect(pinSolverCard('mutinynet', solverCard(`solver-${i}`)).ok).toBe(true)
    }
    expect(pinSolverCard('mutinynet', solverCard('one-too-many')).ok).toBe(false)
    // replacing at the cap still works, and other networks are unaffected
    expect(pinSolverCard('mutinynet', solverCard('solver-0')).ok).toBe(true)
    expect(pinSolverCard('bitcoin', solverCard('elsewhere')).ok).toBe(true)
  })

  it('reports a failed storage write instead of pretending success', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    try {
      const result = pinSolverCard('mutinynet', solverCard())
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.join()).toContain('could not save')
    } finally {
      spy.mockRestore()
    }
    expect(getPinnedSolverCards('mutinynet')).toEqual([])
  })
})
