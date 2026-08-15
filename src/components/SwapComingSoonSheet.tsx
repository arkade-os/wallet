import Button from './Button'
import SheetModal from './SheetModal'
import SwapIcon from '../icons/Swap'
import { useTranslation } from '../providers/language'

export default function SwapComingSoonSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <SheetModal isOpen={isOpen} onClose={onClose}>
      <div className='swap-coming-soon' data-testid='swap-coming-soon-sheet'>
        <div className='swap-coming-soon__icon' aria-hidden='true'>
          <SwapIcon />
        </div>
        <div className='swap-coming-soon__copy'>
          <h2 className='swap-coming-soon__title'>{t('swap.comingSoon')}</h2>
          <p className='swap-coming-soon__description'>{t('swap.comingSoonText')}</p>
        </div>
        <Button label={t('common.gotIt')} onClick={onClose} />
      </div>
    </SheetModal>
  )
}
