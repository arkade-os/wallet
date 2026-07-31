import { motion } from 'framer-motion'
import { EASE_IN_OUT_QUINT_TUPLE } from '../lib/animations'
import { hapticSubtle } from '../lib/haptics'
import { useReducedMotion } from '../hooks/useReducedMotion'

export type ActivityFilterValue = 'all' | 'swaps'

export default function ActivityFilter({
  value,
  onChange,
}: {
  value: ActivityFilterValue
  onChange: (value: ActivityFilterValue) => void
}) {
  const prefersReduced = useReducedMotion()

  const selectFilter = (next: ActivityFilterValue) => {
    if (next === value) return
    hapticSubtle()
    onChange(next)
  }

  return (
    <div className='activity-filter' role='group' aria-label='Filter activity'>
      {(['all', 'swaps'] as const).map((option) => (
        <button
          key={option}
          type='button'
          className='activity-filter__option'
          aria-pressed={value === option}
          onClick={() => selectFilter(option)}
        >
          {value === option ? (
            <motion.span
              layoutId='activity-filter-selection'
              className='activity-filter__selection'
              transition={prefersReduced ? { duration: 0 } : { duration: 0.18, ease: EASE_IN_OUT_QUINT_TUPLE }}
            />
          ) : null}
          <span className='activity-filter__label'>{option === 'all' ? 'All' : 'Swaps'}</span>
        </button>
      ))}
    </div>
  )
}
