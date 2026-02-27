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

const style = {
  position: 'absolute' as const,
  inset: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  willChange: 'transform, opacity',
}

export default function PageTransition({ children, direction, pageKey }: PageTransitionProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div style={style}>{children}</div>
  }

  return (
    <motion.div
      key={pageKey}
      custom={direction}
      variants={pageTransitionVariants}
      initial='initial'
      animate='animate'
      exit='exit'
      style={style}
    >
      {children}
    </motion.div>
  )
}
