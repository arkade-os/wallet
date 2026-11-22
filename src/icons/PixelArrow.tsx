const PATHS = {
  upRight: 'M2 0h3v1H2ZM3 1h2v1H3ZM2 2h1v1H2ZM4 2h1v1H4ZM1 3h1v1H1ZM0 4h1v1H0Z',
  downLeft: 'M4 0h1v1H4ZM3 1h1v1H3ZM0 2h1v1H0ZM2 2h1v1H2ZM0 3h2v1H0ZM0 4h3v1H0Z',
} as const

export type PixelArrowDirection = keyof typeof PATHS

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
      <path d={PATHS[direction]} />
    </svg>
  )
}
