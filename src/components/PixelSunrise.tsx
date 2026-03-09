import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { EASE_OUT_QUINT } from '../lib/animations'

interface PixelSunriseProps {
  show: boolean
  reducedMotion: boolean
}

export default function PixelSunrise({ show, reducedMotion }: PixelSunriseProps) {
  const gradient = (
    <div
      style={{
        width: '100%',
        height: '50%',
        background:
          'radial-gradient(ellipse 300% 100% at 50% 0%, rgba(57,25,152,0.65) 0%, rgba(57,25,152,0.5) 25%, rgba(57,25,152,0.22) 50%, rgba(57,25,152,0.07) 72%, transparent 100%)',
      }}
    />
  )

  const wrapperStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none',
    transformOrigin: 'top center',
  }

  let content: React.ReactNode

  if (reducedMotion) {
    content = show ? <div style={wrapperStyle}>{gradient}</div> : null
  } else {
    content = (
      <motion.div
        initial={{ opacity: 0, scaleY: 0.3 }}
        animate={show ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0.3 }}
        transition={{
          duration: 1.8,
          ease: EASE_OUT_QUINT as unknown as [number, number, number, number],
        }}
        style={wrapperStyle}
      >
        {gradient}
      </motion.div>
    )
  }

  // Portal to document.body so the gradient escapes IonPage's max-width container
  return createPortal(content, document.body)
}
