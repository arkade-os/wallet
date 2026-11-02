import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { attachNativeSwapLifecycle } from '../../lib/nativeSwapLifecycle'

const state = vi.hoisted(() => ({ connected: true, subscribers: new Set<() => void>() }))
vi.mock('../../lib/nativeBridge', () => ({
  isNativeHost: () => true,
  getNativeCardState: () => ({ status: state.connected ? 'connected' : 'disconnected' }),
  subscribeNativeCardState: (listener: () => void) => {
    state.subscribers.add(listener)
    return () => state.subscribers.delete(listener)
  },
  CardRequiredError: class extends Error {
    constructor() {
      super('Connect the card')
      this.name = 'CardRequiredError'
    }
  },
}))
let detach: () => void
beforeEach(() => {
  state.connected = true
  state.subscribers.clear()
  detach = () => {}
})
afterEach(() => detach())
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

it('pauses a card driver on removal and requires explicit start after reconnect', async () => {
  const client = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined) }
  const start = client.start
  detach = attachNativeSwapLifecycle(client, true, vi.fn())
  await client.start()
  state.connected = false
  state.subscribers.forEach((listener) => listener())
  await tick()
  expect(client.stop).toHaveBeenCalledOnce()
  await expect(client.start()).rejects.toMatchObject({ name: 'CardRequiredError' })
  state.connected = true
  state.subscribers.forEach((listener) => listener())
  await tick()
  expect(start).toHaveBeenCalledOnce()
  await client.start()
  expect(start).toHaveBeenCalledTimes(2)
})

it('stops on Android pause and resumes software work on foreground return', async () => {
  const client = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined) }
  const start = client.start
  detach = attachNativeSwapLifecycle(client, false, vi.fn())
  window.dispatchEvent(new Event('arkade-native-paused'))
  await tick()
  await expect(client.start()).rejects.toThrow('Open the app')
  window.dispatchEvent(new Event('arkade-native-resumed'))
  await tick()
  expect(start).toHaveBeenCalledOnce()
  detach()
  window.dispatchEvent(new Event('arkade-native-resumed'))
  await tick()
  expect(start).toHaveBeenCalledOnce()
})

it('stops again if a card disappears while start is awaiting', async () => {
  let started!: () => void
  const client = {
    start: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          started = resolve
        }),
    ),
    stop: vi.fn().mockResolvedValue(undefined),
  }
  detach = attachNativeSwapLifecycle(client, true, vi.fn())
  const pending = client.start()
  await tick()
  state.connected = false
  started()
  await expect(pending).rejects.toMatchObject({ name: 'CardRequiredError' })
  expect(client.stop).toHaveBeenCalledOnce()
})
