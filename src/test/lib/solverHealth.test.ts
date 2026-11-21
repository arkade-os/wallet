import { beforeEach, expect, it, vi } from 'vitest'
import { solverHealth } from '../../lib/solverHealth'
import { getSolverRoutingVersion, SOLVER_HEALTH_STORAGE_KEY } from '../../lib/solverRouting'

beforeEach(() => localStorage.clear())

it('retains reliability across reloads without changing the saved preference', async () => {
  const scope = { network: 'mutinynet', direction: 'give>take' }
  localStorage.setItem('solverRouting', '{"saved":"unchanged"}')
  const version = getSolverRoutingVersion()
  await solverHealth.record(scope, 'solver-a', 'failure')
  expect(getSolverRoutingVersion()).toBe(version)
  await solverHealth.record(scope, 'solver-a', 'failure')
  expect(getSolverRoutingVersion()).toBe(version + 1)
  expect(await solverHealth.deprioritized(scope)).toEqual(['solver-a'])
  expect(await solverHealth.deprioritized({ ...scope, direction: 'take>give' })).toEqual([])
  expect(await solverHealth.deprioritized({ ...scope, network: 'bitcoin' })).toEqual([])
  expect(localStorage.getItem('solverRouting')).toBe('{"saved":"unchanged"}')
  vi.resetModules()
  const restored = await import('../../lib/solverHealth')
  expect(await restored.solverHealth.deprioritized(scope)).toEqual(['solver-a'])
  await restored.solverHealth.record(scope, 'solver-a', 'success')
  expect(await restored.solverHealth.deprioritized(scope)).toEqual([])
  expect(JSON.parse(localStorage.getItem(SOLVER_HEALTH_STORAGE_KEY) ?? '{}')).toEqual({
    [JSON.stringify(['mutinynet', 'give>take'])]: {},
  })
})
