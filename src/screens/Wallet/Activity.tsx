import { useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Content from '../../components/Content'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import TransactionsList from '../../components/TransactionsList'
import { WalletContext } from '../../providers/wallet'
import { EmptyTxList } from '../../components/Empty'
import { EASE_OUT_QUINT_TUPLE } from '../../lib/animations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import ActivityFilter, { type ActivityFilterValue } from '../../components/ActivityFilter'

export default function Activity() {
  const { txs } = useContext(WalletContext)
  const [filter, setFilter] = useState<ActivityFilterValue>('all')
  const prefersReduced = useReducedMotion()
  const hasSwaps = txs.some((tx) => tx.type === 'swap')

  return (
    <>
      <Header text='Activity' back />
      <Content>
        <Padded>
          {txs.length === 0 ? (
            <EmptyTxList />
          ) : (
            <>
              {hasSwaps ? <ActivityFilter value={filter} onChange={setFilter} /> : null}
              <AnimatePresence mode='wait' initial={false}>
                <motion.div
                  key={filter}
                  initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReduced ? undefined : { opacity: 0, y: 2 }}
                  transition={prefersReduced ? { duration: 0 } : { duration: 0.16, ease: EASE_OUT_QUINT_TUPLE }}
                >
                  <TransactionsList typeFilter={filter === 'swaps' ? 'swap' : undefined} />
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </Padded>
      </Content>
    </>
  )
}
