import { motion } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'
import { walletLoadInContainer, walletLoadInChild } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function WalletStaggerContainer({ children, animate = true }: { children: ReactNode; animate?: boolean }) {
  const prefersReduced = useReducedMotion()
  const [started, setStarted] = useState(false)
  const skip = prefersReduced || !animate

  useEffect(() => {
    if (!skip) setStarted(true)
  }, [skip])

  if (skip) return <div style={{ width: '100%' }}>{children}</div>

  return (
    <motion.div animate={started ? 'animate' : 'initial'} variants={walletLoadInContainer} style={{ width: '100%' }}>
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
