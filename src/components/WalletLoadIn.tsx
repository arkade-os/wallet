import { motion } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'
import { walletLoadInContainer, walletLoadInChild } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function WalletStaggerContainer({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion()
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!prefersReduced) setStarted(true)
  }, [prefersReduced])

  if (prefersReduced) return <>{children}</>

  return (
    <motion.div animate={started ? 'animate' : 'initial'} variants={walletLoadInContainer} style={{ width: '100%' }}>
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
