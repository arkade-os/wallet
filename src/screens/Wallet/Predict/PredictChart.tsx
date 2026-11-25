import { useEffect, useRef, useState } from 'react'
import type { PriceSample } from '../../../lib/predict/marketFeed'
import type { PredictKind } from '../../../lib/predict/constants'
import { usdFromCents } from '../../../lib/predict/pricing'
import { useTranslation } from '../../../providers/language'
import { formatClockTime } from './format'

interface PredictChartProps {
  samples: PriceSample[]
  lineCents: number | null
  expiry: number
  kind: PredictKind
  nowSec: number
  /** Seconds of history before the window opens. */
  lead?: number
}

const PAD_TOP = 10
const PAD_BOTTOM = 26
const TAG_W = 96

/**
 * The price against the price to beat, from a little before the window opens
 * to its close. The side that wins is tinted, the time still to run is shaded,
 * and the close is a dashed rule at the right edge.
 */
export default function PredictChart({ samples, lineCents, expiry, kind, nowSec, lead = 60 }: PredictChartProps) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const start = Math.min(expiry - 300 - lead, nowSec - 240)
  const end = Math.max(expiry, nowSec + 1)
  const shown = samples.filter((s) => s.time >= start && s.time <= end)
  const { w, h } = size
  const ready = w > 0 && h > 0 && shown.length >= 2 && lineCents != null

  let body: JSX.Element | null = null
  if (ready) {
    const prices = shown.map((s) => s.priceCents).concat(lineCents)
    let lo = Math.min(...prices)
    let hi = Math.max(...prices)
    const floor = lineCents * 0.0004
    if (hi - lo < floor) {
      const mid = (hi + lo) / 2
      lo = mid - floor / 2
      hi = mid + floor / 2
    }
    const pad = (hi - lo) * 0.18
    lo -= pad
    hi += pad
    const bottom = h - PAD_BOTTOM
    const x = (time: number) => ((time - start) / (end - start)) * w
    const y = (cents: number) => PAD_TOP + ((hi - cents) / (hi - lo)) * (bottom - PAD_TOP)
    const path = shown.map((s, i) => `${i ? 'L' : 'M'}${x(s.time).toFixed(1)},${y(s.priceCents).toFixed(1)}`).join(' ')
    const last = shown[shown.length - 1]!
    const lx = x(last.time)
    const ly = y(last.priceCents)
    const lineY = y(lineCents)
    const nowX = Math.min(w, Math.max(0, x(nowSec)))
    const tagY = Math.min(bottom - 11, Math.max(PAD_TOP + 11, lineY))

    body = (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden='true'>
        <rect
          className='predict-chart__win'
          x={0}
          y={kind === 2 ? PAD_TOP : lineY}
          width={w}
          height={Math.max(0, kind === 2 ? lineY - PAD_TOP : bottom - lineY)}
        />
        {nowX < w ? (
          <rect className='predict-chart__ahead' x={nowX} y={PAD_TOP} width={w - nowX} height={bottom - PAD_TOP} />
        ) : null}
        <line className='predict-chart__line' x1={0} x2={w} y1={lineY} y2={lineY} />
        <line className='predict-chart__close' x1={w - 0.5} x2={w - 0.5} y1={PAD_TOP} y2={bottom} />
        <path className='predict-chart__price' d={path} />
        <circle className='predict-chart__halo' cx={lx} cy={ly} r={9} />
        <circle className='predict-chart__dot' cx={lx} cy={ly} r={4.5} />
        <rect className='predict-chart__tag' x={w - TAG_W - 6} y={tagY - 11} width={TAG_W} height={22} rx={6} />
        <text className='predict-chart__tag-text' x={w - TAG_W / 2 - 6} y={tagY + 4} textAnchor='middle'>
          {usdFromCents(lineCents)}
        </text>
        <text className='predict-chart__axis' x={0} y={h - 8}>
          {formatClockTime(start)}
        </text>
        <text className='predict-chart__axis' x={w} y={h - 8} textAnchor='end'>
          {t('predict.closeAxis', { time: formatClockTime(expiry) })}
        </text>
      </svg>
    )
  }

  return (
    <div
      ref={box}
      className='predict-chart'
      role='img'
      aria-label={t('predict.chartLabel')}
      data-testid='predict-chart'
    >
      {body ?? <span className='predict-chart__empty'>{t('predict.loadingMarket')}</span>}
    </div>
  )
}
