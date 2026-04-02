type C = 0 | 1 | 2 | 3 | 4 | 5
const PALETTE = ['transparent', '#2a1170', '#391998', '#7043f4', '#9b7df8', '#f7931a']

const _ = 0 as C
const D = 1 as C
const B = 2 as C
const M = 3 as C
const L = 4 as C
const O = 5 as C // orange (bitcoin accent)

// Pixel-art swap arrows: right arrow on top, left arrow on bottom
const grid: C[][] = [
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, M, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, M, M, _, _, _, _, _],
  [_, _, D, D, D, D, D, D, M, M, M, M, _, _, _, _],
  [_, D, L, L, L, L, L, M, M, O, O, M, M, _, _, _],
  [_, D, L, L, L, L, M, M, O, O, O, O, M, M, _, _],
  [_, _, D, D, D, D, D, D, M, M, M, M, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, M, M, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, M, _, _, _, _, _],
  [_, _, _, _, _, M, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, M, M, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, M, M, M, M, D, D, D, D, D, D, _, _, _],
  [_, _, M, M, O, O, M, M, B, B, B, B, B, D, _, _],
  [_, M, M, O, O, O, O, M, M, B, B, B, B, D, _, _],
  [_, _, M, M, O, O, M, M, B, B, B, B, B, D, _, _],
  [_, _, _, M, M, M, M, D, D, D, D, D, D, _, _, _],
  [_, _, _, _, M, M, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, M, _, _, _, _, _, _, _, _, _, _],
]

function buildRects() {
  const rows = grid.length
  const cols = Math.max(...grid.map((r) => r.length))
  const cell = 64 / Math.max(rows, cols)
  const oX = (64 - cols * cell) / 2
  const oY = (64 - rows * cell) / 2
  const rects: { x: number; y: number; w: number; h: number; fill: string; id: string }[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x]
      if (c) {
        rects.push({
          x: oX + x * cell,
          y: oY + y * cell,
          w: cell + 0.5,
          h: cell + 0.5,
          fill: PALETTE[c],
          id: `p${x}r${y}`,
        })
      }
    }
  }
  return rects
}

const RECTS = buildRects()

export default function BancoIcon({ big = false }: { big?: boolean }) {
  const size = big ? 78 : 55
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 64 64'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      role='img'
      aria-label='Banco icon'
    >
      {RECTS.map((r) => (
        <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
    </svg>
  )
}
