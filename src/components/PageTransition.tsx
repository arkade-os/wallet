import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { pageTransitionVariants } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface PageTransitionProps {
  children: ReactNode
  /** `forward`, `back` or `none`, with `:cover` appended for cover pages. */
  direction: string
  pageKey: string
}

const style = {
  position: 'absolute' as const,
  inset: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  background: 'var(--bg)',
  // permanent transform: removing it when the animation lands re-rasters the
  // promoted sticky home header at a stale scale (one-frame giant-header flash)
  transform: 'translateZ(0)',
}

export function PageTransition({ children, direction, pageKey }: PageTransitionProps) {
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
