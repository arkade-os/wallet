import { useContext } from 'react'
import ArrowIcon from '../../icons/Arrow'
import TransactionsList from '../../components/TransactionsList'
import { EmptyTxList } from '../../components/Empty'
import { WalletContext } from '../../providers/wallet'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hapticLight } from '../../lib/haptics'

/**
 * Compact "Recent activity" module for the home screen.
 * Shows the most recent transactions with a View all link.
 */
export default function RecentActivitySection() {
  const { txs } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const handleViewAll = () => {
    hapticLight()
    navigate(Pages.Activity)
  }

  if (!txs || txs.length === 0) {
    return (
      <div className='flex w-full flex-col gap-2'>
        <div className='flex w-full items-center justify-between px-1'>
          <span className='text-sm text-neutral-500'>Recent activity</span>
        </div>
        <EmptyTxList />
      </div>
    )
  }

  return (
    <div className='flex w-full flex-col gap-2'>
      <div className='flex w-full items-center justify-between px-1'>
        <span className='text-sm text-neutral-500'>Recent activity</span>
        <button
          type='button'
          onClick={handleViewAll}
          aria-label='View all activity'
          data-testid='activity-view-all'
          className='inline-flex cursor-pointer items-center border-none bg-transparent p-0 text-inherit'
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <span className='inline-flex items-center gap-1 text-sm font-medium leading-none text-purple-700'>
            View all
            <ArrowIcon small />
          </span>
        </button>
      </div>
      <TransactionsList title='' mode='static' limit={3} />
    </div>
  )
}
