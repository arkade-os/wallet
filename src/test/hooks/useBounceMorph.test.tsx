import { Suspense } from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBounceMorph } from '../../hooks/useBounceMorph'

const Probe = () => {
  useBounceMorph({ reducedMotion: false })
  return null
}

let suspended = false
const Suspender = () => {
  if (suspended) throw new Promise<void>(() => {})
  return null
}

const tree = () => (
  <Suspense fallback={null}>
    <Probe />
    <Suspender />
  </Suspense>
)

afterEach(() => {
  suspended = false
  vi.useRealTimers()
})

describe('useBounceMorph', () => {
  // Re-suspending runs the hidden children's layout cleanups (unmounting the
  // controls) but not their passive ones: the same gap an async unmount opens.
  it('starts no animation while its controls are unmounted', async () => {
    vi.useFakeTimers()
    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => rejections.push(reason)
    process.on('unhandledRejection', onRejection)
    try {
      const { rerender } = render(tree())
      await act(() => vi.advanceTimersByTimeAsync(500))

      suspended = true
      rerender(tree())
      await act(() => vi.advanceTimersByTimeAsync(500))
    } finally {
      process.off('unhandledRejection', onRejection)
    }

    expect(rejections).toEqual([])
  })
})
