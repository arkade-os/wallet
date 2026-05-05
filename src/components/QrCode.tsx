import { useMemo, useRef } from 'react'
import encodeQR from 'qr'
import FlexCol from './FlexCol'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface QrCodeProps {
  value: string
}

// Finder pattern locations (7x7 squares at three corners)
function isFinderPattern(row: number, col: number, size: number): boolean {
  if (row < 7 && col < 7) return true
  if (row < 7 && col >= size - 7) return true
  if (row >= size - 7 && col < 7) return true
  return false
}

// Check if a module is in the logo zone (center area to clear for logo)
function isLogoZone(row: number, col: number, size: number, logoModules: number): boolean {
  const center = size / 2
  const half = logoModules / 2
  return row >= center - half && row < center + half && col >= center - half && col < center + half
}

// Render finder pattern with rounded corners
function renderFinderPattern(
  originX: number,
  originY: number,
  moduleSize: number,
  fgColor: string,
  bgColor: string,
): JSX.Element[] {
  const r = moduleSize * 0.6
  const elements: JSX.Element[] = []
  const key = `fp-${originX}-${originY}`

  elements.push(
    <rect
      key={`${key}-outer`}
      x={originX}
      y={originY}
      width={moduleSize * 7}
      height={moduleSize * 7}
      rx={r * 2.5}
      ry={r * 2.5}
      fill={fgColor}
    />,
  )

  elements.push(
    <rect
      key={`${key}-inner`}
      x={originX + moduleSize}
      y={originY + moduleSize}
      width={moduleSize * 5}
      height={moduleSize * 5}
      rx={r * 1.8}
      ry={r * 1.8}
      fill={bgColor}
    />,
  )

  elements.push(
    <rect
      key={`${key}-center`}
      x={originX + moduleSize * 2}
      y={originY + moduleSize * 2}
      width={moduleSize * 3}
      height={moduleSize * 3}
      rx={r * 1.2}
      ry={r * 1.2}
      fill={fgColor}
    />,
  )

  return elements
}

export default function QrCode({ value }: QrCodeProps) {
  const prefersReduced = useReducedMotion()
  const prevMatrixRef = useRef<boolean[][] | null>(null)
  const renderCountRef = useRef(0)

  const svgContent = useMemo(() => {
    if (!value) return null

    const matrix = encodeQR(value, 'raw', { ecc: 'medium', border: 0 })
    const size = matrix.length
    const moduleSize = 10
    const quietZone = moduleSize * 4
    const svgSize = size * moduleSize + quietZone * 2

    // Hardcoded for scanner reliability — QR must always be dark-on-white regardless of theme
    const fgColor = '#040404'
    const bgColor = '#ffffff'
    const logoColor = '#391998'

    const logoModules = Math.ceil(size * 0.2)
    const logoZoneSize = logoModules % 2 === 0 ? logoModules + 1 : logoModules

    const prevMatrix = prevMatrixRef.current
    const isUpdate = prevMatrix !== null && prevMatrix.length === size
    const shouldAnimate = isUpdate && !prefersReduced
    renderCountRef.current++

    const elements: JSX.Element[] = []

    // Background
    elements.push(<rect key='bg' x={0} y={0} width={svgSize} height={svgSize} rx={moduleSize * 2} fill={bgColor} />)

    // Data modules
    const dotRadius = moduleSize * 0.42
    const centerRow = size / 2
    const centerCol = size / 2

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (isFinderPattern(row, col, size)) continue
        if (isLogoZone(row, col, size, logoZoneSize)) continue
        if (!matrix[row][col]) continue

        const cx = quietZone + col * moduleSize + moduleSize / 2
        const cy = quietZone + row * moduleSize + moduleSize / 2

        // Determine if this dot is new/changed (animate it)
        const isNew = shouldAnimate && (!prevMatrix[row] || !prevMatrix[row][col])
        if (isNew) {
          const dist = Math.sqrt((row - centerRow) ** 2 + (col - centerCol) ** 2)
          const delay = Math.round(dist * 6)
          elements.push(
            <circle
              key={`d-${row}-${col}-${renderCountRef.current}`}
              cx={cx}
              cy={cy}
              r={dotRadius}
              fill={fgColor}
              style={{
                animation: `qr-dot-in 250ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms both`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            />,
          )
        } else {
          elements.push(<circle key={`d-${row}-${col}`} cx={cx} cy={cy} r={dotRadius} fill={fgColor} />)
        }
      }
    }

    // Save matrix for next comparison
    prevMatrixRef.current = matrix.map((row) => [...row])

    // Finder patterns
    const finderPositions = [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ]
    for (const [row, col] of finderPositions) {
      const x = quietZone + col * moduleSize
      const y = quietZone + row * moduleSize
      elements.push(...renderFinderPattern(x, y, moduleSize, fgColor, bgColor))
    }

    // Logo overlay
    const centerX = quietZone + (size * moduleSize) / 2
    const centerY = quietZone + (size * moduleSize) / 2
    const logoCircleR = logoZoneSize * moduleSize * 0.52

    elements.push(<circle key='logo-bg' cx={centerX} cy={centerY} r={logoCircleR} fill={bgColor} />)

    const logoInnerSize = logoCircleR * 1.2
    const logoOffsetX = centerX - logoInnerSize / 2
    const logoOffsetY = centerY - logoInnerSize / 2
    const scale = logoInnerSize / 35

    elements.push(
      <g key='logo' transform={`translate(${logoOffsetX}, ${logoOffsetY}) scale(${scale})`}>
        <path d='M0 8.75L8.75 0H26.25L35 8.75V17.5H26.25V8.75H8.75V17.5H2.45431e-07L0 8.75Z' fill={logoColor} />
        <path d='M8.75 26.25V17.5H26.25V26.25H8.75Z' fill={logoColor} />
        <path d='M8.75 26.25H2.45431e-07V35H8.75V26.25Z' fill={logoColor} />
        <path d='M26.25 26.25V35H35V26.25H26.25Z' fill={logoColor} />
      </g>,
    )

    return (
      <svg
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        width='100%'
        height='100%'
        xmlns='http://www.w3.org/2000/svg'
        style={{ display: 'block' }}
      >
        <style>{`
          @keyframes qr-dot-in {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            circle { animation: none !important; }
          }
        `}</style>
        {elements}
      </svg>
    )
  }, [value, prefersReduced])

  return (
    <FlexCol centered>
      {svgContent ? (
        <div
          style={{
            borderRadius: '1rem',
            maxWidth: '340px',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          {svgContent}
        </div>
      ) : null}
    </FlexCol>
  )
}
