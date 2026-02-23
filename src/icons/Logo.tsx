import { useCallback, useEffect, useRef, useState } from 'react'

// 8x8 grid on 35x35 viewBox — each cell is 4.375px
const GRID = 8
const CELL = 35 / GRID
const GAP = 0.3
const REVERT_DELAY = 3000
const MORPH_MS = 350
const SCALE_CLOSED = CELL / (CELL - GAP) // ≈1.074 — closes the gap exactly

type Pixel = { x: number; y: number }

function parseShape(str: string): Pixel[] {
  const pixels: Pixel[] = []
  str
    .trim()
    .split('\n')
    .forEach((line, row) => {
      line
        .trim()
        .split('')
        .forEach((ch, col) => {
          if (ch === 'X') pixels.push({ x: col, y: row })
        })
    })
  return pixels.sort((a, b) => a.y - b.y || a.x - b.x)
}

// Pixel positions approximating the Arkade logo shape.
// These are only used as morph anchor points — the actual logo
// is always rendered with its original SVG paths.
const SHAPES = [
  parseShape(`
    ..XXXX..
    .XXXXXX.
    XX....XX
    XX....XX
    ..XXXX..
    ..XXXX..
    XX....XX
    XX....XX
  `),
  // Space invader
  parseShape(`
    ..X..X..
    ...XX...
    ..XXXX..
    .XX..XX.
    XXXXXXXX
    X.XXXX.X
    X.X..X.X
    .X.XX.X.
  `),
  // Heart
  parseShape(`
    .XX..XX.
    XXXXXXXX
    XXXXXXXX
    .XXXXXX.
    ..XXXX..
    ...XX...
    ...XX...
    ........
  `),
]

type Slot = { x: number; y: number; id: string }
const SLOT_SHAPES: Slot[][] = SHAPES.map((shape) => shape.map((p, i) => ({ x: p.x, y: p.y, id: `s${i}` })))

export default function LogoIcon({ small }: { small?: boolean }) {
  const [shapeIdx, setShapeIdx] = useState(0)
  const [settled, setSettled] = useState(true)
  const [reverting, setReverting] = useState(false)
  const revertRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const size = small ? 35 : 50
  const slots = SLOT_SHAPES[shapeIdx]

  useEffect(() => {
    return () => {
      if (revertRef.current) clearTimeout(revertRef.current)
      if (settleRef.current) clearTimeout(settleRef.current)
    }
  }, [])

  const startRevert = useCallback(() => {
    if (settleRef.current) clearTimeout(settleRef.current)
    setReverting(true)
    setShapeIdx(0)
    settleRef.current = setTimeout(() => {
      setSettled(true)
      setReverting(false)
    }, MORPH_MS + 50)
  }, [])

  const handleClick = useCallback(() => {
    if (revertRef.current) clearTimeout(revertRef.current)
    if (settleRef.current) clearTimeout(settleRef.current)

    if (reverting) {
      // Tapped during revert — cancel and go to invader
      setReverting(false)
      setSettled(false)
      requestAnimationFrame(() => {
        setShapeIdx(1)
        revertRef.current = setTimeout(startRevert, REVERT_DELAY)
      })
      return
    }

    if (settled) {
      // Leaving the original logo: show pixels at logo positions,
      // then on the next frame morph to the target shape
      setSettled(false)
      requestAnimationFrame(() => {
        setShapeIdx(1)
        revertRef.current = setTimeout(startRevert, REVERT_DELAY)
      })
      return
    }

    // Currently showing pixel shapes — advance
    const next = (shapeIdx + 1) % SHAPES.length
    if (next === 0) {
      startRevert()
    } else {
      setShapeIdx(next)
      revertRef.current = setTimeout(startRevert, REVERT_DELAY)
    }
  }, [settled, reverting, shapeIdx, startRevert])

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
      onKeyDown={() => {}}
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
