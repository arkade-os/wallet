import { describe, expect, it, vi } from 'vitest'
import { reloadOnWorkerTakeover } from '../../lib/serviceWorkerTakeover'

const fakeContainer = (controller: object | null) => {
  const target = new EventTarget()
  return {
    container: Object.assign(target, { controller }) as unknown as ServiceWorkerContainer,
    takeOver: () => target.dispatchEvent(new Event('controllerchange')),
  }
}

describe('reloadOnWorkerTakeover', () => {
  it('reloads when a new worker takes over a controlled page', () => {
    const reload = vi.fn()
    const { container, takeOver } = fakeContainer({})
    reloadOnWorkerTakeover(container, reload)

    takeOver()

    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload when the first worker claims a fresh page, only on a later takeover', () => {
    const reload = vi.fn()
    const { container, takeOver } = fakeContainer(null)
    reloadOnWorkerTakeover(container, reload)

    takeOver()
    expect(reload).not.toHaveBeenCalled()

    takeOver()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does nothing without service worker support', () => {
    expect(() => reloadOnWorkerTakeover(undefined, vi.fn())).not.toThrow()
  })
})
