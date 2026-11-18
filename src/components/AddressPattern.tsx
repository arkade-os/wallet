import { useMemo } from 'react'

interface AddressPatternProps {
  /** The address, handle or key the pattern is drawn from. */
  value: string
  size?: number
  className?: string
}

/** FNV-1a: small, stable, and good enough to spread addresses over 2^9 patterns. */
const hash = (value: string): number => {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/**
 * A small symmetric pattern drawn from an address, shown in place of
 * initials. The same address always gives the same pattern, so a pasted
 * address that is not the one paid last time looks different at a glance.
 */
export default function AddressPattern({ value, size = 40, className }: AddressPatternProps) {
  const cells = useMemo(() => {
    const h = hash(value.trim().toLowerCase())
    const on: [number, number][] = []
    for (let row = 0; row < 3; row++) {
      if ((h >> (row * 2)) & 1) on.push([0, row], [2, row])
      if ((h >> (row * 2 + 1)) & 1) on.push([1, row])
    }
    if (on.length < 4) on.push([1, 1], [0, 0], [2, 0])
    return on
  }, [value])

  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 40 40'
      className={className}
      aria-hidden='true'
      focusable='false'
      xmlns='http://www.w3.org/2000/svg'
    >
      <rect width='40' height='40' rx='20' fill='var(--well, var(--surface))' />
      {cells.map(([col, row]) => (
        <rect key={`${col}-${row}`} x={11.5 + col * 6} y={11.5 + row * 6} width='5' height='5' fill='var(--pattern)' />
      ))}
    </svg>
  )
}
