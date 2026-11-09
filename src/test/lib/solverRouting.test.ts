import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readSolverRouting, saveSolverRouting, subscribeSolverRouting } from '../../lib/solverRouting'

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
})
