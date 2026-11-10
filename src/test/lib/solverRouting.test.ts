import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSolverRoutingVersion,
  readSolverRouting,
  saveSolverRouting,
  subscribeSolverRouting,
  effectiveSolverRouting,
  isSolverCardEnabled,
  isSolverGloballyEnabled,
  isSolverEnabled,
  saveSolverCardEnabled,
  enableSolverGlobally,
} from '../../lib/solverRouting'
import { btcUsdt } from './swapFixtures'
import { solverDirectionKey, solverId } from '@arkade-os/solver-discovery'

describe('solver routing preferences', () => {
  beforeEach(() => localStorage.clear())
  it('persists preferFirst per network and direction and clears it without changing saved priority', () => {
    saveSolverRouting('bitcoin', 'give>take', { mode: 'usage', priority: ['b', 'a'], preferFirst: 'a' })
    expect(readSolverRouting('bitcoin', 'give>take')).toEqual({ mode: 'usage', priority: ['b', 'a'], preferFirst: 'a' })
    expect(readSolverRouting('bitcoin', 'take>give').preferFirst).toBeUndefined()
    expect(readSolverRouting('mutinynet', 'give>take').preferFirst).toBeUndefined()
    saveSolverRouting('bitcoin', 'give>take', {
      ...readSolverRouting('bitcoin', 'give>take'),
      mode: 'cost',
      disabled: ['a'],
    })
    expect(readSolverRouting('bitcoin', 'give>take')).toMatchObject({ mode: 'cost', disabled: ['a'], preferFirst: 'a' })
    for (const preferFirst of ['', undefined, 4, ['a']]) {
      saveSolverRouting('bitcoin', 'give>take', { ...readSolverRouting('bitcoin', 'give>take'), preferFirst } as never)
      expect(readSolverRouting('bitcoin', 'give>take')).toEqual({ mode: 'cost', priority: ['b', 'a'], disabled: ['a'] })
    }
  })
  it('scopes priorities to the network and ordered direction', () => {
    saveSolverRouting('bitcoin', 'give>take', { mode: 'usage', priority: ['a', 'b'] })
    expect(readSolverRouting('bitcoin', 'give>take')).toEqual({ mode: 'usage', priority: ['a', 'b'] })
    expect(readSolverRouting('mutinynet', 'give>take')).toEqual({ mode: 'manual', priority: [] })
    expect(readSolverRouting('bitcoin', 'take>give')).toEqual({ mode: 'manual', priority: [] })
  })
  it('ignores corrupt values and filters duplicate priorities', () => {
    localStorage.setItem('solverRouting', '{')
    expect(readSolverRouting('bitcoin', 'a')).toEqual({ mode: 'manual', priority: [] })
    saveSolverRouting('bitcoin', 'a', { mode: 'other', priority: ['a', 3, 'a', '', 'b'], usage: { a: 99 } } as never)
    expect(readSolverRouting('bitcoin', 'a')).toEqual({ mode: 'manual', priority: ['a', 'b'] })
  })
  it('persists disabled solver IDs per direction while retaining priority', () => {
    saveSolverRouting('bitcoin', 'give>take', { mode: 'usage', priority: ['a', 'b'], disabled: ['a'] })
    expect(readSolverRouting('bitcoin', 'give>take')).toEqual({
      mode: 'usage',
      priority: ['a', 'b'],
      disabled: ['a'],
    })
    expect(readSolverRouting('bitcoin', 'take>give').disabled).toBeUndefined()
    expect(readSolverRouting('mutinynet', 'give>take').disabled).toBeUndefined()
  })
  it('combines card pauses with direction choices without changing cards or priority', () => {
    const input = {
      network: 'bitcoin' as const,
      label: 'pin',
      card: { version: 0, name: 'pin', discovery_pubkey: 'a'.repeat(64) },
    }
    const market = {
      ...btcUsdt,
      source: 'pin',
      sourceType: 'local' as const,
      solver: 'pin',
      discovery_pubkey: 'a'.repeat(64),
    }
    const id = solverId(market, 'bitcoin')
    const direction = solverDirectionKey(market, 'base', 'bitcoin')
    localStorage.setItem('solverCards', JSON.stringify([input]))
    const cards = localStorage.getItem('solverCards')
    saveSolverRouting('bitcoin', direction, { priority: [id], disabled: [id] })
    saveSolverCardEnabled(input, false)
    expect(isSolverCardEnabled(input)).toBe(false)
    expect(isSolverEnabled(market, 'base', 'bitcoin')).toBe(false)
    expect(isSolverEnabled(market, 'quote', 'bitcoin')).toBe(false)
    expect(effectiveSolverRouting('bitcoin', direction, [{ card: market }]).disabled).toEqual([id])
    expect(localStorage.getItem('solverCards')).toBe(cards)
    expect(isSolverGloballyEnabled({ ...market, sourceType: 'registry' }, 'bitcoin')).toBe(false)
    expect(
      isSolverGloballyEnabled({ ...market, discovery_pubkey: 'A'.repeat(64), sourceType: 'registry' }, 'bitcoin'),
    ).toBe(false)
    expect(
      isSolverGloballyEnabled({ ...market, discovery_pubkey: 'b'.repeat(64), sourceType: 'registry' }, 'bitcoin'),
    ).toBe(true)
    expect(isSolverGloballyEnabled(market, 'mutinynet')).toBe(true)
    expect(isSolverGloballyEnabled({ ...market, solver: 'renamed' }, 'bitcoin')).toBe(false)
    saveSolverCardEnabled(input, true)
    expect(isSolverEnabled(market, 'base', 'bitcoin')).toBe(false)
    expect(isSolverEnabled(market, 'quote', 'bitcoin')).toBe(true)
    expect(readSolverRouting('bitcoin', direction).priority).toEqual([id])
  })
  it('does not report a card paused when its preference write fails', () => {
    const input = { network: 'bitcoin' as const, label: 'pin', card: { version: 0, name: 'pin' } }
    const listener = vi.fn()
    const unsubscribe = subscribeSolverRouting(listener)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('full')
    })
    expect(() => saveSolverCardEnabled(input, false)).toThrow('full')
    expect(isSolverCardEnabled(input)).toBe(true)
    expect(listener).not.toHaveBeenCalled()
    setItem.mockRestore()
    saveSolverCardEnabled(input, false)
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('can re-enable a paused registry mirror after its pinned card was removed', () => {
    const input = {
      network: 'bitcoin' as const,
      label: 'Pin',
      card: { version: 0, name: 'Pin', discovery_pubkey: 'a'.repeat(64) },
    }
    const mirror = { ...btcUsdt, discovery_pubkey: 'a'.repeat(64), sourceType: 'registry' as const }
    localStorage.setItem('solverCards', JSON.stringify([input]))
    saveSolverCardEnabled(input, false)
    localStorage.removeItem('solverCards')
    expect(isSolverGloballyEnabled(mirror, 'bitcoin')).toBe(false)
    enableSolverGlobally(mirror, 'bitcoin')
    expect(isSolverGloballyEnabled(mirror, 'bitcoin')).toBe(true)
  })
  it('notifies only after a successful write and propagates storage failures', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSolverRouting(listener)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('full')
    })
    expect(() => saveSolverRouting('bitcoin', 'a', { mode: 'cost' })).toThrow('full')
    expect(listener).not.toHaveBeenCalled()
    setItem.mockRestore()
    saveSolverRouting('bitcoin', 'a', { mode: 'cost' })
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it.each(['solverRouting', null])('dispatches an external storage event for %s once to all subscribers', (key) => {
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = subscribeSolverRouting(first)
    const unsubscribeSecond = subscribeSolverRouting(second)
    const before = getSolverRoutingVersion()
    try {
      window.dispatchEvent(new StorageEvent('storage', { key }))
      expect(getSolverRoutingVersion()).toBe(before + 1)
      expect(first).toHaveBeenCalledOnce()
      expect(second).toHaveBeenCalledOnce()
    } finally {
      unsubscribeFirst()
      unsubscribeSecond()
    }
  })

  it('registers one storage handler until the last subscriber leaves', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = subscribeSolverRouting(first)
    const unsubscribeSecond = subscribeSolverRouting(second)
    try {
      expect(addListener).toHaveBeenCalledOnce()
      unsubscribeFirst()
      expect(removeListener).not.toHaveBeenCalled()
      window.dispatchEvent(new StorageEvent('storage', { key: 'solverRouting' }))
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledOnce()
      unsubscribeSecond()
      expect(removeListener).toHaveBeenCalledExactlyOnceWith('storage', addListener.mock.calls[0][1])
      const before = getSolverRoutingVersion()
      window.dispatchEvent(new StorageEvent('storage', { key: 'solverRouting' }))
      expect(getSolverRoutingVersion()).toBe(before)
    } finally {
      unsubscribeFirst()
      unsubscribeSecond()
      addListener.mockRestore()
      removeListener.mockRestore()
    }
  })
})
