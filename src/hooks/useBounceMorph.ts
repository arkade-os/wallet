import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnimationControls } from 'framer-motion'
import { delay, SPRING_BACK, SQUASH } from '../lib/animations'

// Shape indices: 0=Arcade, 1=Invader, 2=Heart
// Sequence: Arcade → Invader → Heart → Arcade (loop or stop)
const SEQUENCE = [1, 2, 0] as const

interface UseBounceMorphOptions {
  reducedMotion: boolean
  onBounce?: () => void
}

interface UseBounceMorphResult {
  activeShape: number
  bounceCount: number
  bounceControls: ReturnType<typeof useAnimationControls>
  isArcade: boolean
  requestStop: () => void
  stopped: boolean
}

export function useBounceMorph({ reducedMotion, onBounce }: UseBounceMorphOptions): UseBounceMorphResult {
  const [activeShape, setActiveShape] = useState(0)
  const [bounceCount, setBounceCount] = useState(0)
  const [stopped, setStopped] = useState(reducedMotion)

  const bounceControls = useAnimationControls()
  // Stable ref so the loop always uses the current controls without needing it in deps
  const controlsRef = useRef(bounceControls)
  controlsRef.current = bounceControls

  const stopRequested = useRef(false)
  const cancelled = useRef(false)
  const onBounceRef = useRef(onBounce)
  onBounceRef.current = onBounce

  const requestStop = useCallback(() => {
    stopRequested.current = true
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      stopRequested.current = false
      setActiveShape(0)
      setStopped(true)
      return
    }

    stopRequested.current = false
    setStopped(false)
    cancelled.current = false

    async function bounceAndMorph(nextShape: number) {
      setBounceCount((c) => c + 1)
      onBounceRef.current?.()
      setActiveShape(nextShape)

      await controlsRef.current.start(SQUASH)
      if (cancelled.current) return

      await controlsRef.current.start(SPRING_BACK)
    }

    async function runLoop() {
      await delay(180)
      if (cancelled.current) return

      // eslint-disable-next-line no-constant-condition
      while (true) {
        for (const nextShape of SEQUENCE) {
          // Checkpoint: if stop requested and we're about to morph back to Arcade,
          // do the final morph then stop gracefully
          if (stopRequested.current && nextShape === 0) {
            await bounceAndMorph(0)
            if (cancelled.current) return
            await delay(180) // let morph CSS transition settle
            if (cancelled.current) return
            setStopped(true)
            return
          }

          await bounceAndMorph(nextShape)
          if (cancelled.current) return

          await delay(60)
          if (cancelled.current) return
        }

        // End of full cycle (back at Arcade) — check stop
        if (stopRequested.current) {
          await delay(180)
          if (cancelled.current) return
          setStopped(true)
          return
        }

        await delay(60)
        if (cancelled.current) return
      }
    }

    runLoop()

    return () => {
      cancelled.current = true
      controlsRef.current.stop()
    }
    // Only re-run if reducedMotion changes. bounceControls is stable (useConstant),
    // but we use controlsRef to avoid any risk of deps-caused re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  return {
    activeShape,
    bounceCount,
    bounceControls,
    isArcade: activeShape === 0,
    requestStop,
    stopped,
  }
}
