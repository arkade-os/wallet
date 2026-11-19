/**
 * Arrows drawn on a 5×5 grid of square pixels, the geometry of the Arkade
 * mark and of the arrows on arkadeos.com buttons. Used where an action is set
 * like the site's buttons; the line icons in Glyph stay the wallet's default.
 */
const cells = {
  // a corner and a tail: the head points up and right
  upRight: ['..XXX', '...XX', '..X.X', '.X...', 'X....'],
  downLeft: ['....X', '...X.', 'X.X..', 'XX...', 'XXX..'],
} as const

export type PixelArrowDirection = keyof typeof cells

/** Each lit cell as "x y", read once from the grids above. */
const pixels = Object.fromEntries(
  Object.entries(cells).map(([direction, rows]) => [
    direction,
    rows.flatMap((row, y) => [...row].flatMap((cell, x) => (cell === 'X' ? [`${x} ${y}`] : []))),
  ]),
) as Record<PixelArrowDirection, string[]>

export default function PixelArrow({ direction, size = 15 }: { direction: PixelArrowDirection; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 5 5'
      fill='currentColor'
      shapeRendering='crispEdges'
      aria-hidden='true'
      xmlns='http://www.w3.org/2000/svg'
    >
      {pixels[direction].map((pixel) => {
        const [x, y] = pixel.split(' ')
        return <rect key={pixel} x={x} y={y} width='1' height='1' />
      })}
    </svg>
  )
}
