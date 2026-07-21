import { useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Content from '../../components/Content'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import TransactionsList from '../../components/TransactionsList'
import { WalletContext } from '../../providers/wallet'
import { EmptyTxList } from '../../components/Empty'
import { EASE_IN_OUT_QUINT_TUPLE, EASE_OUT_QUINT_TUPLE } from '../../lib/animations'
import { hapticSubtle } from '../../lib/haptics'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type ActivityFilter = 'all' | 'swaps'

export default function Activity() {
  const { txs } = useContext(WalletContext)
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const prefersReduced = useReducedMotion()
  const hasSwaps = txs.some((tx) => tx.type === 'swap')

  const selectFilter = (next: ActivityFilter) => {
    if (next === filter) return
    hapticSubtle()
    setFilter(next)
  }

  return (
    <>
      <Header text='Activity' back />
      <Content>
        <Padded>
          {txs.length === 0 ? (
            <EmptyTxList />
          ) : (
            <>
              {hasSwaps ? (
                <div className='activity-filter' role='group' aria-label='Filter activity'>
                  {(['all', 'swaps'] as const).map((option) => (
                    <button
                      key={option}
                      type='button'
                      className='activity-filter__option'
                      aria-pressed={filter === option}
                      onClick={() => selectFilter(option)}
                    >
                      {filter === option ? (
                        <motion.span
                          layoutId='activity-filter-selection'
                          className='activity-filter__selection'
                          transition={
                            prefersReduced ? { duration: 0 } : { duration: 0.18, ease: EASE_IN_OUT_QUINT_TUPLE }
                          }
                        />
                      ) : null}
                      <span className='activity-filter__label'>{option === 'all' ? 'All' : 'Swaps'}</span>
                    </button>
                  ))}
                </div>
              ) : null}
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
