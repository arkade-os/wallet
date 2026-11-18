import { useMemo } from 'react'

interface ValueChartProps {
  points: { time: number; value: number }[]
  label: string
  height?: number
}

const W = 1000
const PAD_TOP = 14
const PAD_BOTTOM = 10
const PAD_RIGHT = 26

/**
 * The Home chart: one smooth line, no axes, ending in the square pixel that
 * marks "now". The line is drawn in a stretched viewBox with a non-scaling
 * stroke, so it fills any width; the pixel is real DOM so it stays square.
 */
export default function ValueChart({ points, label, height = 120 }: ValueChartProps) {
  const { path, endY } = useMemo(() => {
    if (points.length < 2) return { path: '', endY: 0.5 }
    const min = Math.min(...points.map((p) => p.value))
    const max = Math.max(...points.map((p) => p.value))
    const span = max - min || 1
    const t0 = points[0].time
    const t1 = points.at(-1)?.time ?? t0 + 1
    const xs = points.map((p) => ((p.time - t0) / (t1 - t0 || 1)) * (W - PAD_RIGHT))
    const ys = points.map((p) => PAD_TOP + (1 - (p.value - min) / span) * (height - PAD_TOP - PAD_BOTTOM))
    // Catmull-Rom to cubic Bézier for a line without corners
    let d = `M${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[Math.max(0, i - 1)]
      const y0 = ys[Math.max(0, i - 1)]
      const x3 = xs[Math.min(xs.length - 1, i + 2)]
      const y3 = ys[Math.min(ys.length - 1, i + 2)]
      const c1x = xs[i] + (xs[i + 1] - x0) / 6
      const c1y = ys[i] + (ys[i + 1] - y0) / 6
      const c2x = xs[i + 1] - (x3 - xs[i]) / 6
      const c2y = ys[i + 1] - (y3 - ys[i]) / 6
      d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`
    }
    return { path: d, endY: (ys.at(-1) ?? height / 2) / height }
  }, [height, points])

  if (!path) return null

  return (
    <div className='value-chart' style={{ height }} role='img' aria-label={label}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio='none' aria-hidden='true'>
        <path d={path} vectorEffect='non-scaling-stroke' />
      </svg>
      <span
        className='value-chart__now'
        style={{ left: `${((W - PAD_RIGHT) / W) * 100}%`, top: `${endY * 100}%` }}
        aria-hidden='true'
      />
    </div>
  )
}
