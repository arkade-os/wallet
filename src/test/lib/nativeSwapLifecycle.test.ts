import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { attachNativeSwapLifecycle } from '../../lib/nativeSwapLifecycle'

vi.mock('../../lib/nativeBridge', () => ({ isNativeHost: () => true }))
let detach: () => void
beforeEach(() => {
  detach = () => {}
})
afterEach(() => detach())
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

it('stops on Android pause and resumes software work on foreground return', async () => {
  const client = { start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined) }
  const start = client.start
  detach = attachNativeSwapLifecycle(client)
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

it('stops again if the app is paused while start is awaiting', async () => {
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
  detach = attachNativeSwapLifecycle(client)
  const pending = client.start()
  await tick()
  window.dispatchEvent(new Event('arkade-native-paused'))
  await tick()
  started()
  await expect(pending).rejects.toThrow('Open the app')
  expect(client.stop).toHaveBeenCalledTimes(2)
})
