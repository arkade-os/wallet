import { RefObject, useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { EASE_OUT_QUINT } from '../lib/animations'
import PixelSplash from './PixelSplash'

const LARGE_SIZE = 100
const EASE_QUINT_TUPLE = EASE_OUT_QUINT as unknown as [number, number, number, number]
const EASE_IN = [0.55, 0, 1, 0.45] as [number, number, number, number]

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ─── SVG Shape Paths (all in 0 0 35 35 viewBox) ─────────────────

function ArcadePaths() {
  return (
    <>
      <path d='M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z' fill='var(--logo-color)' />
      <path d='M8.75 26.25V17.5H26.25V26.25H8.75Z' fill='var(--logo-color)' />
      <path d='M8.75 26.25H2.45431e-07V35H8.75V26.25Z' fill='var(--logo-color)' />
      <path d='M26.25 26.25V35H35V26.25H26.25Z' fill='var(--logo-color)' />
    </>
  )
}

// Space invader — compound path from 8x8 grid cells, merged horizontally into solid fill
const INVADER_D =
  'M8.75 0h4.375v4.375H8.75Z' +
  'M21.875 0h4.375v4.375H21.875Z' +
  'M13.125 4.375h8.75v4.375H13.125Z' +
  'M8.75 8.75h17.5v4.375H8.75Z' +
  'M4.375 13.125h8.75v4.375H4.375Z' +
  'M21.875 13.125h8.75v4.375H21.875Z' +
  'M0 17.5h35v4.375H0Z' +
  'M0 21.875h4.375v4.375H0Z' +
  'M8.75 21.875h17.5v4.375H8.75Z' +
  'M30.625 21.875h4.375v4.375H30.625Z' +
  'M0 26.25h4.375v4.375H0Z' +
  'M8.75 26.25h4.375v4.375H8.75Z' +
  'M21.875 26.25h4.375v4.375H21.875Z' +
  'M30.625 26.25h4.375v4.375H30.625Z' +
  'M4.375 30.625h4.375v4.375H4.375Z' +
  'M13.125 30.625h8.75v4.375H13.125Z' +
  'M26.25 30.625h4.375v4.375H26.25Z'

function InvaderPaths() {
  return <path d={INVADER_D} fill='var(--logo-color)' />
}

// Heart — smooth bezier curve
const HEART_D =
  'M17.5 10.5' +
  'C17.5 7 14 3.5 10.5 3.5' +
  'C5.25 3.5 1.75 8.75 1.75 14' +
  'C1.75 21 10.5 28 17.5 33.25' +
  'C24.5 28 33.25 21 33.25 14' +
  'C33.25 8.75 29.75 3.5 24.5 3.5' +
  'C21 3.5 17.5 7 17.5 10.5Z'

function HeartPaths() {
  return <path d={HEART_D} fill='var(--logo-color)' />
}

const SHAPES = [
  { key: 'arcade', Component: ArcadePaths },
  { key: 'invader', Component: InvaderPaths },
  { key: 'heart', Component: HeartPaths },
]

// ─── Component ───────────────────────────────────────────────────

interface OnboardingLogoProps {
  targetRef: RefObject<HTMLDivElement | null>
  onComplete: () => void
  reducedMotion: boolean
}

export default function OnboardingLogo({ targetRef, onComplete, reducedMotion }: OnboardingLogoProps) {
  const [visible, setVisible] = useState(!reducedMotion)
  const [activeShape, setActiveShape] = useState(0)
  const [bounceCount, setBounceCount] = useState(0)

  const bounceControls = useAnimationControls()
  const flyControls = useAnimationControls()
  const containerRef = useRef<HTMLDivElement>(null)

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (reducedMotion) {
      onCompleteRef.current()
      return
    }

    const cancelled = { current: false }

    async function bounceAndMorph(nextShape: number) {
      setBounceCount((c) => c + 1)

      // Down-stroke: squash
      await bounceControls.start({
        y: 40,
        scaleY: 0.7,
        scaleX: 1.2,
        transition: { duration: 0.18, ease: EASE_IN },
      })
      if (cancelled.current) return

      // At bottom: cross-fade to next shape
      setActiveShape(nextShape)

      // Up-stroke: stretch with overshoot
      await bounceControls.start({
        y: -10,
        scaleY: 1.08,
        scaleX: 0.95,
        transition: { duration: 0.22, ease: EASE_QUINT_TUPLE },
      })
      if (cancelled.current) return

      // Settle
      await bounceControls.start({
        y: 0,
        scaleY: 1,
        scaleX: 1,
        transition: { duration: 0.12, ease: EASE_QUINT_TUPLE },
      })
    }

    async function bounceAndMorphAndFly(nextShape: number) {
      setBounceCount((c) => c + 1)

      // Down-stroke
      await bounceControls.start({
        y: 40,
        scaleY: 0.7,
        scaleX: 1.2,
        transition: { duration: 0.18, ease: EASE_IN },
      })
      if (cancelled.current) return

      // Cross-fade at bottom
      setActiveShape(nextShape)

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
      const targetScale = targetRect.width / LARGE_SIZE

      // Unsquash + fly simultaneously
      await Promise.all([
        bounceControls.start({
          y: 0,
          scaleY: 1,
          scaleX: 1,
          transition: { duration: 0.35, ease: EASE_QUINT_TUPLE },
        }),
        flyControls.start({
          x: dx,
          y: dy,
          scale: targetScale,
          transition: { duration: 0.5, ease: EASE_QUINT_TUPLE },
        }),
      ])

      if (cancelled.current) return
      setVisible(false)
      onCompleteRef.current()
    }

    async function runSequence() {
      // Pause showing Arcade
      await delay(700)
      if (cancelled.current) return

      // Bounce + morph to Invader
      await bounceAndMorph(1)
      if (cancelled.current) return

      // Pause showing Invader
      await delay(400)
      if (cancelled.current) return

      // Bounce + morph to Heart
      await bounceAndMorph(2)
      if (cancelled.current) return

      // Pause showing Heart
      await delay(400)
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

  return (
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
          transition={{ duration: 0.3, ease: EASE_QUINT_TUPLE }}
        >
          <motion.div animate={bounceControls} style={{ y: 0, scaleY: 1, scaleX: 1 }}>
            <svg
              width={LARGE_SIZE}
              height={LARGE_SIZE}
              viewBox='0 0 35 35'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              {SHAPES.map((shape, idx) => (
                <g
                  key={shape.key}
                  style={{
                    opacity: activeShape === idx ? 1 : 0,
                    transition: 'opacity 200ms ease-out',
                  }}
                >
                  <shape.Component />
                </g>
              ))}
            </svg>
          </motion.div>
        </motion.div>
        <PixelSplash bounceCount={bounceCount} reducedMotion={reducedMotion} />
      </motion.div>
    </div>
  )
}
