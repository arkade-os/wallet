import { motion } from 'framer-motion'
import { EASE_OUT_QUINT } from '../lib/animations'

interface PixelSunriseProps {
  reducedMotion: boolean
}

export default function PixelSunrise({ reducedMotion }: PixelSunriseProps) {
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
  }

  if (reducedMotion) {
    return <div style={wrapperStyle}>{gradient}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.8,
        ease: EASE_OUT_QUINT as unknown as [number, number, number, number],
        delay: 0.1,
      }}
      style={wrapperStyle}
    >
      {gradient}
    </motion.div>
  )
}
