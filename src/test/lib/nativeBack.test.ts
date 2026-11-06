import { afterEach, expect, it, vi } from 'vitest'
import { getNativeBackCount, handleNativeBack, registerNativeBack, subscribeNativeBack } from '../../lib/nativeBack'

const disposers: (() => void)[] = []
afterEach(() =>
  disposers
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose()),
)

it('closes the latest nested overlay before the outer overlay and consumes each Back', () => {
  const outer = vi.fn(() => closeOuter())
  const inner = vi.fn(() => closeInner())
  const closeOuter = registerNativeBack(outer)
  const closeInner = registerNativeBack(inner)
  disposers.push(closeOuter, closeInner)
  expect(getNativeBackCount()).toBe(2)
  expect(handleNativeBack()).toBe(true)
  expect(inner).toHaveBeenCalledOnce()
  expect(outer).not.toHaveBeenCalled()
  expect(getNativeBackCount()).toBe(1)
  expect(handleNativeBack()).toBe(true)
  expect(outer).toHaveBeenCalledOnce()
  expect(handleNativeBack()).toBe(false)
})

it('notifies subscribers when overlays change and tolerates earlier overlays unmounting first', () => {
  const changed = vi.fn()
  const last = vi.fn()
  const unsubscribe = subscribeNativeBack(changed)
  const closeFirst = registerNativeBack(vi.fn())
  const closeLast = registerNativeBack(last)
  disposers.push(unsubscribe, closeFirst, closeLast)
  closeFirst()
  expect(getNativeBackCount()).toBe(1)
  expect(handleNativeBack()).toBe(true)
  expect(last).toHaveBeenCalledOnce()
  closeLast()
  closeLast()
  expect(changed).toHaveBeenCalledTimes(4)
  expect(getNativeBackCount()).toBe(0)
})
