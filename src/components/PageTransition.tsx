import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { NavigationDirection } from '../providers/navigation'
import { pageSlideForward, pageSlideBack, noAnimation } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface PageTransitionProps {
  children: ReactNode
  direction: NavigationDirection
  pageKey: string
}

export default function PageTransition({ children, direction, pageKey }: PageTransitionProps) {
  const prefersReduced = useReducedMotion()

  const variants =
    prefersReduced || direction === 'none' ? noAnimation : direction === 'forward' ? pageSlideForward : pageSlideBack

  return (
    <motion.div
      key={pageKey}
      initial='initial'
      animate='animate'
      exit='exit'
      variants={variants}
      style={{
        height: '100%',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  )
}
