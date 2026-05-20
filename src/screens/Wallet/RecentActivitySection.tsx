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
  const bitcoinTxs = txs.filter((tx) => !tx.assets?.length && tx.amount !== 0)

  const handleViewAll = () => {
    hapticLight()
    navigate(Pages.Activity)
  }

  if (bitcoinTxs.length === 0) {
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
          className='home-section-action'
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          View all
          <ArrowIcon small />
        </button>
      </div>
      <div className='home-section__content'>
        <TransactionsList title='' assetIdFilter='btc' mode='static' limit={3} />
      </div>
    </section>
  )
}
