import { useCallback } from 'react'
import { usePixelMorph } from './usePixelMorph'
import { CELL, GAP, MORPH_MS, SCALE_CLOSED } from './pixel-shapes'
import { hapticLight } from '../lib/haptics'

export default function LogoIcon({ small }: { small?: boolean }) {
  const { settled, reverting, advance, slots } = usePixelMorph()
  const size = small ? 35 : 50
  const handleClick = useCallback(() => {
    hapticLight()
    advance()
  }, [advance])

  // Paths: visible when settled or reverting (fading in during revert)
  const pathsOpacity = settled || reverting ? 1 : 0
  const pathsTransition = reverting ? 'opacity 250ms ease-out' : 'none'

  // Pixels: visible when active, fading out + scaling up during revert
  const pixelScale = reverting ? SCALE_CLOSED : 1
  const pixelOpacity = settled ? 0 : reverting ? 0 : 1
  const pixelTransition = reverting
    ? `transform ${MORPH_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 250ms ease-out`
    : `transform ${MORPH_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`

  const pixelOrigin = `${(CELL - GAP) / 2}px ${(CELL - GAP) / 2}px`

  return (
    <div
      onClick={handleClick}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          handleClick()
        }
      }}
      style={{ cursor: 'pointer', width: size, height: size, padding: 18, margin: -18, boxSizing: 'content-box' }}
    >
      <svg width={size} height={size} viewBox='0 0 35 35' fill='none' xmlns='http://www.w3.org/2000/svg'>
        {/* Original SVG paths — visible when settled, fading in during revert */}
        <g style={{ opacity: pathsOpacity, transition: pathsTransition }}>
          <path
            d='M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z'
            fill='var(--logo-color)'
          />
          <path d='M8.75 26.25V17.5H26.25V26.25H8.75Z' fill='var(--logo-color)' />
          <path d='M8.75 26.25H2.45431e-07V35H8.75V26.25Z' fill='var(--logo-color)' />
          <path d='M26.25 26.25V35H35V26.25H26.25Z' fill='var(--logo-color)' />
        </g>
        {/* Pixel rects — always in DOM for transition tracking */}
        {slots.map((slot) => (
          <rect
            key={slot.id}
            width={CELL - GAP}
            height={CELL - GAP}
            rx={0.4}
            fill='var(--logo-color)'
            style={{
              transform: `translate(${slot.x * CELL}px, ${slot.y * CELL}px) scale(${pixelScale})`,
              transformOrigin: pixelOrigin,
              opacity: pixelOpacity,
              transition: pixelTransition,
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export function LogoIconAnimated() {
  const style: React.CSSProperties = {
    animation: 'var(--animation-pulse)',
  }
  return (
    <svg width='14' height='14' viewBox='0 0 35 35' fill='none' style={style} xmlns='http://www.w3.org/2000/svg'>
      <path d='M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z' fill='white' />
      <path d='M8.75 26.25V17.5H26.25V26.25H8.75Z' fill='white' />
      <path d='M8.75 26.25H2.45431e-07V35H8.75V26.25Z' fill='white' />
      <path d='M26.25 26.25V35H35V26.25H26.25Z' fill='white' />
    </svg>
  )
}
