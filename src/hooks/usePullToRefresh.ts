import { useRef, useState, useEffect, useCallback } from 'react'
import { triggerHaptic } from '../lib/haptics'

export interface UsePullToRefreshOptions {
  scrollRef: React.RefObject<HTMLElement | null>
  onRefresh?: () => Promise<void>
  threshold?: number
}

export interface UsePullToRefreshResult {
  pullOffset: number
  isRefreshing: boolean
  progress: number
}

// iOS-style rubber band - feels like stretching elastic
function rubberBand(distance: number, dimension: number, coeff: number = 0.55): number {
  return (1 - Math.exp(-distance / dimension / coeff)) * dimension
}

// Check if any scrollable ancestor has scrolled
function isAnyAncestorScrolled(target: HTMLElement, boundary: HTMLElement): boolean {
  let el: HTMLElement | null = target
  while (el && el !== boundary) {
    const style = getComputedStyle(el)
    const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll'
    if (isScrollable && el.scrollTop > 0) {
      return true
    }
    el = el.parentElement
  }
  return boundary.scrollTop > 0
}

export function usePullToRefresh({
  scrollRef,
  onRefresh,
  threshold = 80,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [pullOffset, setPullOffset] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use refs to avoid stale closures in touch handlers
  const pullOffsetRef = useRef(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const pulling = useRef(false)
  const readyToRefresh = useRef(false)
  const thresholdHapticFired = useRef(false)
  const locked = useRef<'none' | 'vertical' | 'horizontal'>('none')
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)

  onRefreshRef.current = onRefresh

  const isEnabled = Boolean(onRefresh)

  const updatePullOffset = useCallback((value: number) => {
    pullOffsetRef.current = value
    setPullOffset(value)
  }, [])

  const reset = useCallback(() => {
    pulling.current = false
    readyToRefresh.current = false
    thresholdHapticFired.current = false
    locked.current = 'none'
    updatePullOffset(0)
  }, [updatePullOffset])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !isEnabled) return

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return

      const target = e.target instanceof HTMLElement ? e.target : null
      if (!target || isAnyAncestorScrolled(target, el)) return

      const touch = e.touches[0]
      startX.current = touch.clientX
      startY.current = touch.clientY
      pulling.current = true
      readyToRefresh.current = false
      thresholdHapticFired.current = false
      locked.current = 'none'
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current || e.touches.length !== 1) return

      const target = e.target instanceof HTMLElement ? e.target : null
      if (!target) {
        reset()
        return
      }

      const touch = e.touches[0]
      const deltaX = touch.clientX - startX.current
      const deltaY = touch.clientY - startY.current

      if (locked.current === 'none' && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        locked.current = Math.abs(deltaY) > Math.abs(deltaX) ? 'vertical' : 'horizontal'
      }

      if (locked.current === 'horizontal') {
        reset()
        return
      }

      if (isAnyAncestorScrolled(target, el)) {
        reset()
        return
      }

      if (deltaY <= 0) {
        readyToRefresh.current = false
        updatePullOffset(0)
        return
      }

      // CRITICAL: preventDefault keeps us in Safari's trusted gesture context
      // This allows the web-haptics hidden switch click to trigger the Taptic Engine
      e.preventDefault()

      const dampedOffset = rubberBand(deltaY, 150)
      updatePullOffset(dampedOffset)

      const isReady = dampedOffset >= threshold
      readyToRefresh.current = isReady

      // Fire haptic when crossing threshold - must be in active touch context
      if (isReady && !thresholdHapticFired.current) {
        thresholdHapticFired.current = true
        triggerHaptic('medium')
      }
    }

    const onTouchEnd = async () => {
      if (!pulling.current) return
      pulling.current = false

      if (readyToRefresh.current && onRefreshRef.current && !refreshingRef.current) {
        refreshingRef.current = true
        setIsRefreshing(true)
        updatePullOffset(60)

        try {
          await onRefreshRef.current()
          triggerHaptic('success')
        } catch {
          triggerHaptic('error')
        } finally {
          refreshingRef.current = false
          setIsRefreshing(false)
          readyToRefresh.current = false
          thresholdHapticFired.current = false
          locked.current = 'none'
          updatePullOffset(0)
        }
      } else {
        readyToRefresh.current = false
        thresholdHapticFired.current = false
        locked.current = 'none'
        updatePullOffset(0)
      }
    }

    const onTouchCancel = () => {
      reset()
    }

    // passive: false on touchmove is REQUIRED for both preventDefault AND haptics
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [scrollRef, isEnabled, threshold, reset, updatePullOffset])

  return {
    pullOffset,
    isRefreshing,
    progress: Math.min(pullOffset / threshold, 1),
  }
}
