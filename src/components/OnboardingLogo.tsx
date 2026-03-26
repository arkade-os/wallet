import { RefObject, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useAnimationControls } from 'framer-motion'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'
import PixelLogoSvg from './PixelLogoSvg'
import PixelSplash from './PixelSplash'

const LARGE_SIZE = 100
const SMALL_SIZE = 28
const EASE_IN = [0.55, 0, 1, 0.45] as [number, number, number, number]

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Shape indices in pixel-shapes.ts: 0=Arcade, 1=Invader, 2=Heart
// Sequence: Arcade → Invader → Heart → Arcade (fly)

interface OnboardingLogoProps {
  targetRef: RefObject<HTMLDivElement | null>
  onComplete: () => void
  onFlyStart?: () => void
  reducedMotion: boolean
}

export default function OnboardingLogo({ targetRef, onComplete, onFlyStart, reducedMotion }: OnboardingLogoProps) {
  const [visible, setVisible] = useState(!reducedMotion)
  const [activeShape, setActiveShape] = useState(0)
  const [bounceCount, setBounceCount] = useState(0)

  const bounceControls = useAnimationControls()
  const flyControls = useAnimationControls()
  const containerRef = useRef<HTMLDivElement>(null)

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onFlyStartRef = useRef(onFlyStart)
  onFlyStartRef.current = onFlyStart

  useEffect(() => {
    if (reducedMotion) {
      onCompleteRef.current()
      return
    }

    const cancelled = { current: false }

    async function bounceAndMorph(nextShape: number) {
      setBounceCount((c) => c + 1)

      // Trigger morph + bounce simultaneously
      setActiveShape(nextShape)

      // Quick squash down (gravity)
      await bounceControls.start({
        y: 20,
        scaleY: 0.75,
        scaleX: 1.15,
        transition: { duration: 0.06, ease: EASE_IN },
      })
      if (cancelled.current) return

      // Spring recovery — overshoots past origin, one clean bounce, settles
      await bounceControls.start({
        y: 0,
        scaleY: 1,
        scaleX: 1,
        transition: { type: 'spring', stiffness: 600, damping: 18, mass: 0.6 },
      })
    }

    async function bounceAndMorphAndFly(nextShape: number) {
      setBounceCount((c) => c + 1)

      // Trigger morph + squash simultaneously
      setActiveShape(nextShape)

      // Quick squash down
      await bounceControls.start({
        y: 20,
        scaleY: 0.75,
        scaleX: 1.15,
        transition: { duration: 0.06, ease: EASE_IN },
      })
      if (cancelled.current) return

      // Calculate fly target
      const target = targetRef.current
      const container = containerRef.current
      if (!target || !container) {
        onCompleteRef.current()
        return
      }

      const targetRect = target.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      const currentCenterX = containerRect.left + containerRect.width / 2
      const currentCenterY = containerRect.top + containerRect.height / 2
      const targetCenterX = targetRect.left + targetRect.width / 2
      const targetCenterY = targetRect.top + targetRect.height / 2

      const dx = targetCenterX - currentCenterX
      const dy = targetCenterY - currentCenterY
      const targetScale = SMALL_SIZE / LARGE_SIZE

      // Signal gradient sunrise to begin
      onFlyStartRef.current?.()

      // Unsquash + fly simultaneously
      await Promise.all([
        bounceControls.start({
          y: 0,
          scaleY: 1,
          scaleX: 1,
          transition: { duration: 0.2, ease: EASE_OUT_QUINT_TUPLE },
        }),
        flyControls.start({
          x: dx,
          y: dy,
          scale: targetScale,
          transition: { duration: 0.35, ease: EASE_OUT_QUINT_TUPLE },
        }),
      ])

      if (cancelled.current) return
      setVisible(false)
      onCompleteRef.current()
    }

    async function runSequence() {
      // Brief pause showing Arcade
      await delay(180)
      if (cancelled.current) return

      // Bounce + morph to Invader
      await bounceAndMorph(1)
      if (cancelled.current) return

      // Brief pause
      await delay(60)
      if (cancelled.current) return

      // Bounce + morph to Heart
      await bounceAndMorph(2)
      if (cancelled.current) return

      // Brief pause
      await delay(60)
      if (cancelled.current) return

      // Bounce + morph to Arcade + fly to header
      await bounceAndMorphAndFly(0)
    }

    runSequence()

    return () => {
      cancelled.current = true
      bounceControls.stop()
      flyControls.stop()
    }
  }, [reducedMotion, bounceControls, flyControls, targetRef])

  if (!visible) return null

  // Portal to body so the logo escapes IonPage's max-width container on desktop
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <motion.div ref={containerRef} animate={flyControls} style={{ position: 'relative', x: 0, y: 0, scale: 1 }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: EASE_OUT_QUINT_TUPLE }}
        >
          <motion.div animate={bounceControls} style={{ y: 0, scaleY: 1, scaleX: 1 }}>
            <PixelLogoSvg activeShape={activeShape} size={LARGE_SIZE} />
          </motion.div>
        </motion.div>
        <PixelSplash bounceCount={bounceCount} reducedMotion={reducedMotion} />
      </motion.div>
    </div>,
    document.body,
  )
}
