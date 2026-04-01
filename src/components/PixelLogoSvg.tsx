import { SLOT_SHAPES, CELL, GAP, SCALE_CLOSED } from '../icons/pixel-shapes'

// Morph CSS transition duration (ms) — how long pixels take to slide between shapes
const MORPH_MS = 180

const PIXEL_ORIGIN = `${(CELL - GAP) / 2}px ${(CELL - GAP) / 2}px`

interface PixelLogoSvgProps {
  activeShape: number
  size: number
}

export default function PixelLogoSvg({ activeShape, size }: PixelLogoSvgProps) {
  const slots = SLOT_SHAPES[activeShape]
  const isArcade = activeShape === 0

  // SVG paths: visible when on Arcade shape (clean, non-pixelated A)
  const pathsOpacity = isArcade ? 1 : 0
  const pathsTransition = isArcade ? 'opacity 100ms ease-out' : 'opacity 60ms ease-out'

  // Pixels: visible when NOT on Arcade, scale to close gaps when returning to Arcade
  const pixelScale = isArcade ? SCALE_CLOSED : 1
  const pixelOpacity = isArcade ? 0 : 1
  const morphTransition = isArcade
    ? `transform ${MORPH_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 100ms ease-out`
    : `transform ${MORPH_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 60ms ease-out`

  return (
    <svg width={size} height={size} viewBox='0 0 35 35' fill='none' xmlns='http://www.w3.org/2000/svg'>
      {/* Clean SVG paths — visible when on Arcade shape */}
      <g style={{ opacity: pathsOpacity, transition: pathsTransition }}>
        <path d='M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z' fill='var(--logo-color)' />
        <path d='M8.75 26.25V17.5H26.25V26.25H8.75Z' fill='var(--logo-color)' />
        <path d='M8.75 26.25H2.45431e-07V35H8.75V26.25Z' fill='var(--logo-color)' />
        <path d='M26.25 26.25V35H35V26.25H26.25Z' fill='var(--logo-color)' />
      </g>
      {/* Pixel rects — always in DOM for transition tracking, visible when morphing */}
      {slots.map((slot) => (
        <rect
          key={slot.id}
          width={CELL - GAP}
          height={CELL - GAP}
          rx={0.4}
          fill='var(--logo-color)'
          style={{
            transform: `translate(${slot.x * CELL}px, ${slot.y * CELL}px) scale(${pixelScale})`,
            transformOrigin: PIXEL_ORIGIN,
            opacity: pixelOpacity,
            transition: morphTransition,
          }}
        />
      ))}
    </svg>
  )
}
