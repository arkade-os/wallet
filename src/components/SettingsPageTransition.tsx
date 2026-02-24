import { AnimatePresence, motion } from 'framer-motion'
import { ReactNode } from 'react'
import { SettingsDirection } from '../providers/options'
import { pageTransitionVariants } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface SettingsPageTransitionProps {
  children: ReactNode
  direction: SettingsDirection
  optionKey: string
}

export default function SettingsPageTransition({ children, direction, optionKey }: SettingsPageTransitionProps) {
  const prefersReduced = useReducedMotion()
  const effectiveDirection = prefersReduced ? 'none' : direction

  return (
    <AnimatePresence mode='sync' initial={false} custom={effectiveDirection}>
      <motion.div
        key={optionKey}
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
    </AnimatePresence>
  )
}
