import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSolverRoutingVersion,
  readSolverRouting,
  saveSolverRouting,
  subscribeSolverRouting,
} from '../../lib/solverRouting'

describe('solver routing preferences', () => {
  beforeEach(() => localStorage.clear())
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
