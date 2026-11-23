import { createSolverHealth } from '@arkade-os/swap'
import { notifySolverRouting, SOLVER_HEALTH_STORAGE_KEY } from './solverRouting'

const read = (): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SOLVER_HEALTH_STORAGE_KEY) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export const solverHealth = createSolverHealth({
  storage: {
    load: ({ network, direction }) => read()[JSON.stringify([network, direction])],
    save: ({ network, direction }, records) =>
      localStorage.setItem(
        SOLVER_HEALTH_STORAGE_KEY,
        JSON.stringify({
          ...read(),
          [JSON.stringify([network, direction])]: records,
        }),
      ),
  },
  onChange: notifySolverRouting,
})
