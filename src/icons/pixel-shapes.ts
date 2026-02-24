// 8x8 grid on 35x35 viewBox — each cell is 4.375px
export const GRID = 8
export const CELL = 35 / GRID
export const GAP = 0.3
export const REVERT_DELAY = 3000
export const MORPH_MS = 350
export const SCALE_CLOSED = CELL / (CELL - GAP) // ≈1.074 — closes the gap exactly

export type Pixel = { x: number; y: number }
export type Slot = { x: number; y: number; id: string }

export function parseShape(str: string): Pixel[] {
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

// Shape 0 is the "home" state (Arkade logo pixel approximation).
// Shapes can have different pixel counts — they get padded to the max below.
const SHAPES_RAW: Pixel[][] = [
  // 0: Arkade logo (home — only used as morph anchor; real logo uses SVG paths)
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
  // 1: Space invader
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
  // 2: Bitcoin
  parseShape(`
    ...XX...
    .XXXXXX.
    .XX..XXX
    .XXXXXX.
    .XX..XXX
    .XXXXXX.
    ...XX...
    ........
  `),
  // 3: Heart
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

// Pad all shapes to the same pixel count so CSS transitions work smoothly.
// Shorter shapes get phantom pixels stacked on existing pixels so they're invisible.
const MAX_PIXELS = Math.max(...SHAPES_RAW.map((s) => s.length))
export const SHAPES: Pixel[][] = SHAPES_RAW.map((shape) => {
  if (shape.length >= MAX_PIXELS) return shape
  const padding: Pixel[] = Array.from({ length: MAX_PIXELS - shape.length }, (_, i) => {
    const donor = shape[i % shape.length]
    return { x: donor.x, y: donor.y }
  })
  return [...shape, ...padding]
})

export const SLOT_SHAPES: Slot[][] = SHAPES.map((shape) => shape.map((p, i) => ({ x: p.x, y: p.y, id: `s${i}` })))
