import { AnimatePresence, motion } from 'framer-motion'
import { ReactNode } from 'react'
import { SettingsDirection } from '../providers/options'
import { pageSlideForward, pageSlideBack, noAnimation } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface SettingsPageTransitionProps {
  children: ReactNode
  direction: SettingsDirection
  optionKey: string
}

export default function SettingsPageTransition({ children, direction, optionKey }: SettingsPageTransitionProps) {
  const prefersReduced = useReducedMotion()

  const variants = prefersReduced ? noAnimation : direction === 'forward' ? pageSlideForward : pageSlideBack

  return (
    <AnimatePresence mode='popLayout' initial={false}>
      <motion.div
        key={optionKey}
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
    </AnimatePresence>
  )
}
