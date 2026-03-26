import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { walletLoadInContainer, walletLoadInChild } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function WalletStaggerContainer({
  children,
  animate = true,
  hold = false,
}: {
  children: ReactNode
  animate?: boolean
  hold?: boolean
}) {
  const prefersReduced = useReducedMotion()
  const skip = prefersReduced || !animate

  if (skip) return <div style={{ width: '100%' }}>{children}</div>

  return (
    <motion.div initial='initial' animate={hold ? 'initial' : 'animate'} variants={walletLoadInContainer} style={{ width: '100%' }}>
      {children}
    </motion.div>
  )
}

export function WalletStaggerChild({ children, animate = true }: { children: ReactNode; animate?: boolean }) {
  const prefersReduced = useReducedMotion()
  const skip = prefersReduced || !animate

  if (skip) return <div style={{ width: '100%' }}>{children}</div>

  return (
    <motion.div variants={walletLoadInChild} style={{ width: '100%', willChange: 'transform, opacity' }}>
      {children}
    </motion.div>
  )
}
