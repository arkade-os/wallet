import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useAnimationControls } from 'framer-motion'
import { EASE_OUT_QUINT_TUPLE, EASE_IN_OUT_QUINT_TUPLE } from '../lib/animations'
import { useBounceMorph } from '../hooks/useBounceMorph'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getLogoAnchor } from '../lib/logoAnchor'
import PixelLogoSvg from './PixelLogoSvg'
import PixelSplash from './PixelSplash'
import Text from './Text'

const LARGE_SIZE = 100
// Max frames to wait for the header logo anchor to mount before falling back to fly-up
const ANCHOR_RETRY_FRAMES = 10

interface LoadingLogoProps {
  text?: string
  done?: boolean
  exitMode?: 'fly-to-target' | 'fly-up' | 'none'
  onExitComplete?: () => void
}

export default function LoadingLogo({ text, done, exitMode = 'none', onExitComplete }: LoadingLogoProps) {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const showBackground = exitMode !== 'none'
  const containerRef = useRef<HTMLDivElement>(null)
  const flyControls = useAnimationControls()
  const flyControlsRef = useRef(flyControls)
  flyControlsRef.current = flyControls
  const exitModeRef = useRef(exitMode)
  exitModeRef.current = exitMode
  const onExitCompleteRef = useRef(onExitComplete)
  onExitCompleteRef.current = onExitComplete

  const { activeShape, bounceCount, bounceControls, requestStop, stopped } = useBounceMorph({
    reducedMotion,
  })

  // When done signal arrives, request the bounce loop to stop
  useEffect(() => {
    if (done) requestStop()
  }, [done, requestStop])

  // When bounce loop has stopped, play exit animation
  useEffect(() => {
    if (!stopped || !done) return

    const mode = exitModeRef.current

    if (mode === 'none') {
      onExitCompleteRef.current?.()
      return
    }

    if (reducedMotion) {
      setVisible(false)
      onExitCompleteRef.current?.()
      return
    }

    const flyUp = () =>
      flyControlsRef.current.start({
        y: -200,
        scale: 0.5,
        opacity: 0,
        transition: { duration: 0.35, ease: EASE_OUT_QUINT_TUPLE },
      })

    async function runExit() {
      if (mode === 'fly-to-target') {
        // Wait for anchor to be mounted (may lag behind page render)
        let target = getLogoAnchor()
        if (!target) {
          for (let i = 0; i < ANCHOR_RETRY_FRAMES; i++) {
            await new Promise<void>((r) => requestAnimationFrame(() => r()))
            target = getLogoAnchor()
            if (target) break
          }
        }
        const container = containerRef.current
        if (target && container) {
          const targetRect = target.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()

          const dx = targetRect.left + targetRect.width / 2 - (containerRect.left + containerRect.width / 2)
          const dy = targetRect.top + targetRect.height / 2 - (containerRect.top + containerRect.height / 2)
          const targetScale = 35 / LARGE_SIZE

          // Fly to the logo position (background stays opaque throughout)
          await flyControlsRef.current.start({
            x: dx,
            y: dy,
            scale: targetScale,
            opacity: 1,
            transition: { duration: 0.4, ease: EASE_IN_OUT_QUINT_TUPLE },
          })
        } else {
          await flyUp()
        }
      } else {
        await flyUp()
      }

      setVisible(false)
      onExitCompleteRef.current?.()
    }

    runExit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopped, done])

  const exiting = stopped && done && exitModeRef.current !== 'none'

  if (!visible) return null

  return createPortal(
    <>
      {/* White background — covers page content during bounce + fly, removed on exit complete */}
      {showBackground ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--ion-background-color, #fff)',
            zIndex: 9,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 10,
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <motion.div
          ref={containerRef}
          animate={flyControls}
          style={{ position: 'relative', x: 0, y: 0, scale: 1, opacity: 1 }}
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: EASE_OUT_QUINT_TUPLE }}
          >
            <motion.div animate={bounceControls} style={{ y: 0, scaleY: 1, scaleX: 1 }}>
              <PixelLogoSvg activeShape={activeShape} size={LARGE_SIZE} />
            </motion.div>
          </motion.div>
          <PixelSplash bounceCount={bounceCount} reducedMotion={reducedMotion} />
        </motion.div>
        {text ? (
          <motion.div
            style={{ paddingTop: '0.5rem' }}
            animate={{ opacity: exiting ? 0 : 1 }}
            transition={{ duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }}
          >
            <Text centered small wrap heading>
              {text}
            </Text>
          </motion.div>
        ) : null}
      </div>
    </>,
    document.body,
  )
}
