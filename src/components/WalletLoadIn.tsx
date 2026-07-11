import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { walletLoadInContainer, walletLoadInChild } from '../lib/animations'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function WalletStaggerContainer({
  children,
  animate = true,
  className,
  hold = false,
}: {
  children: ReactNode
  animate?: boolean
  className?: string
  hold?: boolean
}) {
  const prefersReduced = useReducedMotion()
  const skip = prefersReduced || !animate

  if (skip)
    return (
      <div className={className} style={{ width: '100%' }}>
        {children}
      </div>
    )

  return (
    <motion.div
      className={className}
      initial='initial'
      animate={hold ? 'initial' : 'animate'}
      variants={walletLoadInContainer}
      style={{ contain: 'layout style', width: '100%' }}
    >
      {children}
    </motion.div>
  )
}

export function WalletStaggerChild({
  children,
  animate = true,
  className,
}: {
  children: ReactNode
  animate?: boolean
  className?: string
}) {
  const prefersReduced = useReducedMotion()
  const skip = prefersReduced || !animate

  if (skip)
    return (
      <div className={className} style={{ width: '100%' }}>
        {children}
      </div>
    )

  return (
    <motion.div
      className={className}
      variants={walletLoadInChild}
      style={{
        contain: 'layout style',
        width: '100%',
      }}
    >
      {children}
    </motion.div>
  )
}
