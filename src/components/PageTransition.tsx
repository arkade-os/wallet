import { motion } from 'framer-motion'
import { ReactNode, useState } from 'react'
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
  const [animating, setAnimating] = useState(true)

  return (
    <motion.div
      key={pageKey}
      custom={effectiveDirection}
      variants={pageTransitionVariants}
      initial='initial'
      animate='animate'
      exit='exit'
      onAnimationComplete={() => setAnimating(false)}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        willChange: animating ? 'transform, opacity' : 'auto',
        contain: 'content',
      }}
    >
      {children}
    </motion.div>
  )
}
