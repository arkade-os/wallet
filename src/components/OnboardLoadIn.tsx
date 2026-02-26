import { motion } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'
import { onboardStaggerContainer, onboardStaggerChild } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface OnboardStaggerContainerProps {
  children: ReactNode
  centered?: boolean
}

export function OnboardStaggerContainer({ children, centered }: OnboardStaggerContainerProps) {
  const prefersReduced = useReducedMotion()
  const [started, setStarted] = useState(false)

  useEffect(() => {
    setStarted(!prefersReduced)
  }, [prefersReduced])

  if (prefersReduced) return <>{children}</>

  const style = centered
    ? { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, gap: '1rem' }
    : { width: '100%' }

  return (
    <motion.div animate={started ? 'animate' : 'initial'} variants={onboardStaggerContainer} style={style}>
      {children}
    </motion.div>
  )
}

export function OnboardStaggerChild({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) return <>{children}</>

  return (
    <motion.div variants={onboardStaggerChild} style={{ willChange: 'transform, opacity' }}>
      {children}
    </motion.div>
  )
}
