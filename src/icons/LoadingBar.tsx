import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

const FILLED_BODY = '#7652E1'
const FILLED_SHADOW = '#391998'
const FRAME = '#E9E2FF'
const TERMINAL = '#7C6EB1'

const BODY_Y = 15.2285
const BODY_H = 23.255
const SHADOW_Y = 38.4834
const SHADOW_H = 7.61072

const SEGMENTS = [
  { id: 's1', body: { x: 22.8389, w: 23.255 }, shadow: { x: 19.0334, w: 27.0603 } },
  { id: 's2', body: { x: 50.322, w: 30.8657 }, shadow: { x: 50.322, w: 30.8657 } },
  { id: 's3', body: { x: 85.4158, w: 30.8657 }, shadow: { x: 85.4158, w: 30.8657 } },
  { id: 's4', body: { x: 120.51, w: 30.8657 }, shadow: { x: 120.51, w: 30.8657 } },
  { id: 's5', body: { x: 155.604, w: 30.8657 }, shadow: { x: 155.604, w: 30.8657 } },
  { id: 's6', body: { x: 191.12, w: 27.0603 }, shadow: { x: 191.12, w: 27.0603 } },
]

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easedSine(t: number, speed: number, phase: number): number {
  const raw = 0.5 + 0.5 * Math.sin(t * speed - phase)
  return easeInOutCubic(raw)
}

export default function LoadingBar() {
  const shouldReduce = useReducedMotion()
  const rectsRef = useRef<(SVGRectElement | null)[]>([])
  const shadowsRef = useRef<(SVGRectElement | null)[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (shouldReduce) {
      cancelAnimationFrame(rafRef.current)
      return
    }
    const animate = (time: number) => {
      const t = time / 1000
      for (let i = 0; i < 6; i++) {
        const bodyEl = rectsRef.current[i]
        const shadowEl = shadowsRef.current[i]
        if (!bodyEl) continue
        const v = easedSine(t, 3.0, i * 0.45)
        const fill = 0.3 + 0.7 * v
        const h = BODY_H * fill
        const y = BODY_Y + (BODY_H - h)
        bodyEl.setAttribute('height', String(h))
        bodyEl.setAttribute('y', String(y))
        if (shadowEl) shadowEl.style.opacity = String(fill)
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [shouldReduce])

  return (
    <svg width='240' height='63' viewBox='0 0 240 63' fill='none' xmlns='http://www.w3.org/2000/svg'>
      {/* Terminals */}
      <rect x='218.181' y='19.4565' width='3.80536' height='22.8322' fill={TERMINAL} />
      <rect width='3.80536' height='22.8322' transform='matrix(-1 0 0 1 19.0334 19.4565)' fill={TERMINAL} />
      <rect x='214.375' y='15.2285' width='3.80536' height='27.0603' fill={TERMINAL} />
      <rect width='3.80536' height='27.0603' transform='matrix(-1 0 0 1 22.8389 15.2285)' fill={TERMINAL} />
      {/* Top and bottom borders */}
      <rect x='19.0334' y='11' width='198.724' height='4.22818' fill={FRAME} />
      <rect x='19.0334' y='46.0942' width='198.724' height='4.22818' fill={FRAME} />
      {/* Corner pieces */}
      <rect width='4.22818' height='4.22818' transform='matrix(1 0 0 -1 218.181 19.4565)' fill={FRAME} />
      <rect
        x='19.0334'
        y='19.4565'
        width='4.22818'
        height='4.22818'
        transform='rotate(180 19.0334 19.4565)'
        fill={FRAME}
      />
      <rect width='4.22818' height='4.22818' transform='matrix(1 0 0 -1 218.181 46.5171)' fill={FRAME} />
      <rect
        x='19.0334'
        y='46.5171'
        width='4.22818'
        height='4.22818'
        transform='rotate(180 19.0334 46.5171)'
        fill={FRAME}
      />
      {/* Side walls */}
      <rect width='4.22818' height='23.255' transform='matrix(1 0 0 -1 221.986 42.2886)' fill={FRAME} />
      <rect
        x='15.228'
        y='42.2886'
        width='4.22818'
        height='23.255'
        transform='rotate(180 15.228 42.2886)'
        fill={FRAME}
      />
      {/* Dividers */}
      <rect x='46.0938' y='15.2285' width='4.22818' height='30.8657' fill={FRAME} />
      <rect x='81.1875' y='15.2285' width='4.22818' height='30.8657' fill={FRAME} />
      <rect x='116.282' y='15.2285' width='4.22818' height='30.8657' fill={FRAME} />
      <rect x='151.375' y='15.2285' width='4.22818' height='30.8657' fill={FRAME} />
      <rect x='186.892' y='15.2285' width='4.22818' height='30.8657' fill={FRAME} />
      {/* Animated segments */}
      {SEGMENTS.map((seg, idx) => (
        <g key={seg.id}>
          <rect
            ref={(el) => {
              rectsRef.current[idx] = el
            }}
            x={seg.body.x}
            y={BODY_Y}
            width={seg.body.w}
            height={BODY_H}
            fill={FILLED_BODY}
          />
          <rect
            ref={(el) => {
              shadowsRef.current[idx] = el
            }}
            x={seg.shadow.x}
            y={SHADOW_Y}
            width={seg.shadow.w}
            height={SHADOW_H}
            fill={FILLED_SHADOW}
          />
        </g>
      ))}
    </svg>
  )
}
