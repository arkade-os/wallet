import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'

interface Particle {
  id: string
  x: number
  y: number
  size: number
}

interface Burst {
  id: number
  particles: Particle[]
}

function generateBurst(burstId: number): Burst {
  const count = 20 + Math.floor(Math.random() * 8)
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    // Bias angles downward/outward: -60° to 240° (mostly below)
    const angle = (-60 + Math.random() * 300) * (Math.PI / 180)
    const velocity = 25 + Math.random() * 80
    particles.push({
      id: `${burstId}-${i}`,
      x: Math.cos(angle) * velocity,
      y: Math.sin(angle) * velocity,
      size: 2.5 + Math.random() * 4,
    })
  }
  return { id: burstId, particles }
}

interface PixelSplashProps {
  bounceCount: number
  reducedMotion: boolean
}

export default function PixelSplash({ bounceCount, reducedMotion }: PixelSplashProps) {
  const [bursts, setBursts] = useState<Burst[]>([])
  const prevCount = useRef(0)

  useEffect(() => {
    if (reducedMotion || bounceCount === 0 || bounceCount === prevCount.current) return
    prevCount.current = bounceCount
    const burst = generateBurst(bounceCount)
    setBursts((prev) => [...prev, burst])

    // Clean up burst after animation
    const timer = setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burst.id))
    }, 700)
    return () => clearTimeout(timer)
  }, [bounceCount, reducedMotion])

  if (reducedMotion) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      {bursts.flatMap((burst) =>
        burst.particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
            transition={{
              duration: 0.6,
              ease: EASE_OUT_QUINT_TUPLE,
            }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: 1,
              background: 'var(--liz)',
            }}
          />
        )),
      )}
    </div>
  )
}
