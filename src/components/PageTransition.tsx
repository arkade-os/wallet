import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { NavigationDirection } from '../providers/navigation'
import { pageTransitionVariants } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface PageTransitionProps {
  children: ReactNode
  direction: NavigationDirection
  pageKey: string
}

export default function PageTransition({ children, direction, pageKey }: PageTransitionProps) {
  const prefersReduced = useReducedMotion()
  const effectiveDirection = prefersReduced ? 'none' : direction

  return (
    <motion.div
      key={pageKey}
      custom={effectiveDirection}
      variants={pageTransitionVariants}
      initial='initial'
      animate='animate'
      exit='exit'
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  )
}
