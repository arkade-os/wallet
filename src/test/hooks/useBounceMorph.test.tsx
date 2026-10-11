import { act, cleanup, renderHook } from '@testing-library/react'
import { ReactNode, StrictMode, useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBounceMorph } from '../../hooks/useBounceMorph'

describe('useBounceMorph lifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('starts only the current loop after StrictMode remounts its effects', async () => {
    const onBounce = vi.fn()
    const { result } = renderHook(() => useBounceMorph({ reducedMotion: false, onBounce }), {
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    })
    const start = vi.spyOn(result.current.bounceControls, 'start')

    await act(() => vi.advanceTimersByTimeAsync(180))

    expect(onBounce).toHaveBeenCalledTimes(1)
    expect(start).toHaveBeenCalledTimes(2)
    expect(result.current.bounceCount).toBe(1)
    expect(result.current.activeShape).toBe(1)
  })

  it('does not resume an old animation when a new loop replaces it', async () => {
    const { result, rerender } = renderHook(({ reducedMotion }) => useBounceMorph({ reducedMotion }), {
      initialProps: { reducedMotion: false },
    })
    let finishAnimation!: () => void
    const animation = new Promise<void>((resolve) => {
      finishAnimation = resolve
    })
    const start = vi.spyOn(result.current.bounceControls, 'start').mockImplementationOnce(() => animation)
    await act(() => vi.advanceTimersByTimeAsync(180))
    expect(start).toHaveBeenCalledTimes(1)

    rerender({ reducedMotion: true })
    expect(result.current.activeShape).toBe(0)
    expect(result.current.stopped).toBe(true)
    rerender({ reducedMotion: false })
    await act(async () => finishAnimation())

    expect(start).toHaveBeenCalledTimes(1)
    await act(() => vi.advanceTimersByTimeAsync(180))
    expect(start).toHaveBeenCalledTimes(3)
    expect(result.current.bounceCount).toBe(2)
  })

  it('stops the controls and cancels a delayed bounce when unmounted', async () => {
    let stopsBeforePassiveCleanup = 0
    let countStops = () => 0
    const { result, unmount } = renderHook(() => {
      useEffect(
        () => () => {
          stopsBeforePassiveCleanup = countStops()
        },
        [],
      )
      return useBounceMorph({ reducedMotion: false })
    })
    const start = vi.spyOn(result.current.bounceControls, 'start')
    const stop = vi.spyOn(result.current.bounceControls, 'stop')
    countStops = () => stop.mock.calls.length
    await act(() => vi.advanceTimersByTimeAsync(180))
    expect(start).toHaveBeenCalledTimes(2)

    unmount()
    await act(() => vi.advanceTimersByTimeAsync(240))

    expect(stop).toHaveBeenCalledTimes(2)
    expect(stopsBeforePassiveCleanup).toBe(2)
    expect(start).toHaveBeenCalledTimes(2)
  })

  it('finishes at the Arcade shape after a graceful stop request', async () => {
    const { result } = renderHook(() => useBounceMorph({ reducedMotion: false }))
    act(() => result.current.requestStop())
    await act(() => vi.advanceTimersByTimeAsync(480))

    expect(result.current.activeShape).toBe(0)
    expect(result.current.isArcade).toBe(true)
    expect(result.current.bounceCount).toBe(3)
    expect(result.current.stopped).toBe(true)
  })
})
