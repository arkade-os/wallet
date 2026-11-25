import { useContext } from 'react'
import ArrowIcon from '../../icons/Arrow'
import TransactionsList from '../../components/TransactionsList'
import { EmptyTxList } from '../../components/Empty'
import { WalletContext } from '../../providers/wallet'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hapticLight } from '../../lib/haptics'
import { useTranslation } from '../../providers/language'

export default function RecentActivitySection() {
  const { booting, dataReady, txs } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)
  const { t } = useTranslation()

  const homeBusy = Boolean(booting) && !dataReady

  const handleViewAll = () => {
    if (homeBusy) return
    hapticLight()
    navigate(Pages.Activity)
  }

  const empty = !txs || txs.length === 0

  return (
    <section className='home-section home-section--ruled'>
      <div className='home-section__header'>
        <h2 className='home-section-label'>{t('wallet.recentActivity')}</h2>
        {homeBusy ? null : (
          <button
            type='button'
            onClick={handleViewAll}
            aria-label={t('wallet.viewAllActivity')}
            data-testid='activity-view-all'
            className='home-section-action home-section-action--quiet'
          >
            {t('wallet.viewAll')}
            <ArrowIcon small />
          </button>
        )}
      </div>
      {homeBusy ? null : (
        <div className='home-section__content'>
          {empty ? <EmptyTxList /> : <TransactionsList mode='static' limit={3} />}
        </div>
      )}
    </section>
  )
}
