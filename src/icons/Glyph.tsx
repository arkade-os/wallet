/**
 * The wallet's icon set: familiar shapes on a 24px grid, drawn with a 1.75
 * stroke and round ends. Every icon component in this folder that has been
 * redrawn renders through Glyph so the set stays one family.
 */
export const glyphs = {
  arrowDown: 'M12 4v16M5 13l7 7 7-7',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  arrowUp: 'M12 20V4M5 11l7-7 7 7',
  arrowUpDown: 'M8 20V4M4 8l4-4 4 4M16 4v16M12 16l4 4 4-4',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronUp: 'm6 15 6-6 6 6',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  close: 'M18 6 6 18M6 6l12 12',
  copy: 'M10 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM5 15a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1',
  external: 'M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  eyeOff:
    'M4 4l16 16M9.9 5.8A8.6 8.6 0 0 1 12 5.5c6 0 9.5 6.500 9.5 6.500a15 15 0 0 1-2.700 3.400M6.300 7.400A15 15 0 0 0 2.500 12S6 18.500 12 18.500a8.700 8.700 0 0 0 3.800-.900M9.900 9.900a3 3 0 0 0 4.200 4.200',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  hourglass:
    'M7 4h10M7 20h10M8 4v3a4 4 0 0 0 1.600 3.200L12 12l2.400-1.800A4 4 0 0 0 16 7V4M8 20v-3a4 4 0 0 1 1.600-3.200L12 12l2.400 1.800A4 4 0 0 1 16 17v3',
  info: 'M12 11v5M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5',
  lines: 'M4 7h16M4 12h16M4 17h10',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  lock: 'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2ZM8 11V8a4 4 0 0 1 8 0v3',
  paste:
    'M9 4h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2',
  plus: 'M12 5v14M5 12h14',
  qr: 'M5 4h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM15 4h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM5 14h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1ZM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19.5h.5M19.5 14h.5',
  restore: 'M4 12a8 8 0 1 0 2.6-5.9M4 5v4h4M12 8v4l3 2',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16',
  settings:
    'M12.220 2h-.440a2 2 0 0 0-2 2v.180a2 2 0 0 1-1 1.730l-.430.250a2 2 0 0 1-2 0l-.150-.080a2 2 0 0 0-2.730.730l-.220.380a2 2 0 0 0 .730 2.730l.150.100a2 2 0 0 1 1 1.720v.510a2 2 0 0 1-1 1.740l-.150.090a2 2 0 0 0-.730 2.730l.220.380a2 2 0 0 0 2.730.730l.150-.080a2 2 0 0 1 2 0l.430.250a2 2 0 0 1 1 1.730V20a2 2 0 0 0 2 2h.440a2 2 0 0 0 2-2v-.180a2 2 0 0 1 1-1.730l.430-.250a2 2 0 0 1 2 0l.150.080a2 2 0 0 0 2.730-.730l.220-.390a2 2 0 0 0-.730-2.730l-.150-.080a2 2 0 0 1-1-1.740v-.500a2 2 0 0 1 1-1.740l.150-.090a2 2 0 0 0 .730-2.730l-.220-.380a2 2 0 0 0-2.730-.730l-.150.080a2 2 0 0 1-2 0l-.430-.250a2 2 0 0 1-1-1.730V4a2 2 0 0 0-2-2ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  shield: 'M12 3 5 6v5c0 4.5 2.9 8.3 7 10 4.1-1.7 7-5.5 7-10V6l-7-3ZM9 12l2 2 4-4',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  swap: 'M7 4 4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7',
  // Currency marks for asset wells
  bitcoin:
    'M8.500 5v14M6.500 5h7a3.500 3.500 0 0 1 0 7h-5M8.500 12h6a3.500 3.500 0 0 1 0 7h-8M10 3v2M13 3v2M10 19v2M13 19v2',
  dollar: 'M12 3v18M16.500 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7',
  tether:
    'M5 5.500h14M12 5.500V20M6.500 11.500c0 1.100 2.460 2 5.500 2s5.500-.900 5.500-2-2.460-2-5.500-2-5.500.900-5.500 2Z',
} as const

export type GlyphName = keyof typeof glyphs

interface GlyphProps {
  name: GlyphName
  size?: number
  strokeWidth?: number
  className?: string
  dashed?: boolean
}

export default function Glyph({ name, size = 24, strokeWidth = 1.75, className, dashed }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeDasharray={dashed ? '2.5 3.5' : undefined}
      className={className}
      aria-hidden='true'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d={glyphs[name]} />
    </svg>
  )
}

/** A 40px round well holding a glyph, used by activity rows. */
export function GlyphWell({ name, dashed }: { name: GlyphName; dashed?: boolean }) {
  return (
    <svg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
      <rect width='40' height='40' rx='20' fill='var(--surface)' />
      <g
        transform='translate(11 11) scale(0.75)'
        stroke='currentColor'
        strokeWidth='2.3'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeDasharray={dashed ? '2.5 3.5' : undefined}
      >
        <path d={glyphs[name]} />
      </g>
    </svg>
  )
}
