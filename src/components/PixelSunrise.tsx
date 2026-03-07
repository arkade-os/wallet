import { motion } from 'framer-motion'
import { EASE_OUT_QUINT } from '../lib/animations'

// 8 columns x 5 rows — opacity pattern creates a chunky pixelated sunrise arc
const ROWS = 5
const COLS = 8
const BLOCK_HEIGHT = 16

// Opacity map: [row][col] — center-bright, edges-dim, top-transparent
const OPACITY_MAP = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0.05, 0.1, 0.1, 0.05, 0, 0],
  [0, 0.05, 0.12, 0.2, 0.2, 0.12, 0.05, 0],
  [0.05, 0.1, 0.18, 0.3, 0.3, 0.18, 0.1, 0.05],
  [0.08, 0.15, 0.25, 0.4, 0.4, 0.25, 0.15, 0.08],
]

interface PixelSunriseProps {
  reducedMotion: boolean
}

export default function PixelSunrise({ reducedMotion }: PixelSunriseProps) {
  const blocks: { row: number; col: number; opacity: number }[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const opacity = OPACITY_MAP[r][c]
      if (opacity > 0) blocks.push({ row: r, col: c, opacity })
    }
  }

  const content = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, ${BLOCK_HEIGHT}px)`,
        width: '100%',
      }}
    >
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const row = Math.floor(i / COLS)
        const col = i % COLS
        const opacity = OPACITY_MAP[row][col]
        return (
          <div
            key={i}
            style={{
              background: opacity > 0 ? 'var(--purple)' : 'transparent',
              opacity,
              height: BLOCK_HEIGHT,
            }}
          />
        )
      })}
    </div>
  )

  if (reducedMotion) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1, pointerEvents: 'none' }}>{content}</div>
    )
  }

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.6,
        ease: EASE_OUT_QUINT as unknown as [number, number, number, number],
        delay: 0.2,
      }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1, pointerEvents: 'none' }}
    >
      {content}
    </motion.div>
  )
}
