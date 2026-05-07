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
      <section className='home-section'>
        <div className='flex w-full items-center justify-between px-1'>
          <span className='home-section-label'>Recent activity</span>
        </div>
        <div className='home-section__content'>
          <EmptyTxList />
        </div>
      </section>
    )
  }

  return (
    <section className='home-section'>
      <div className='flex w-full items-center justify-between px-1'>
        <span className='home-section-label'>Recent activity</span>
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
      <div className='home-section__content'>
        <TransactionsList title='' mode='static' limit={3} />
      </div>
    </section>
  )
}
