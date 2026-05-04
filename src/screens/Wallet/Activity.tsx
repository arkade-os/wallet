import { useContext } from 'react'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import TransactionsList from '../../components/TransactionsList'
import { EmptyTxList } from '../../components/Empty'
import { WalletContext } from '../../providers/wallet'
import { NavigationContext, Pages } from '../../providers/navigation'
import BackIcon from '../../icons/Back'
import { hapticLight } from '../../lib/haptics'

/**
 * Full transaction history page. Accessed from the home screen header
 * activity icon or the "View all" link in RecentActivitySection.
 */
export default function Activity() {
  const { txs } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const handleBack = () => {
    hapticLight()
    navigate(Pages.Wallet)
  }

  return (
    <Content>
      <Padded>
        <div className='flex items-center gap-3 pb-4 pt-2'>
          <button
            type='button'
            onClick={handleBack}
            aria-label='Go back'
            className='inline-flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-2 text-inherit active:scale-95'
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <BackIcon />
          </button>
          <span className='font-heading text-xl font-medium'>Activity</span>
        </div>
        {!txs || txs.length === 0 ? <EmptyTxList /> : <TransactionsList title='' />}
      </Padded>
    </Content>
  )
}
