import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { walletLoadInContainer, walletLoadInChild } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function WalletStaggerContainer({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) return <>{children}</>

  return (
    <motion.div initial='initial' animate='animate' variants={walletLoadInContainer} style={{ width: '100%' }}>
      {children}
    </motion.div>
  )
}

export function WalletStaggerChild({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) return <>{children}</>

  return (
    <motion.div variants={walletLoadInChild} style={{ width: '100%', willChange: 'transform, opacity' }}>
      {children}
    </motion.div>
  )
}
