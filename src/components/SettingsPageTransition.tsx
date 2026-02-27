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

const style = {
  position: 'absolute' as const,
  inset: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  willChange: 'transform, opacity',
}

export default function SettingsPageTransition({ children, direction, optionKey }: SettingsPageTransitionProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div style={style}>{children}</div>
  }

  return (
    <AnimatePresence mode='sync' initial={false} custom={direction}>
      <motion.div
        key={optionKey}
        custom={direction}
        variants={pageTransitionVariants}
        initial='initial'
        animate='animate'
        exit='exit'
        style={style}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
