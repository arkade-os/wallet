import Button from './Button'
import SheetModal from './SheetModal'
import SwapIcon from '../icons/Swap'

export default function SwapComingSoonSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <SheetModal isOpen={isOpen} onClose={onClose}>
      <div className='swap-coming-soon' data-testid='swap-coming-soon-sheet'>
        <div className='swap-coming-soon__icon' aria-hidden='true'>
          <SwapIcon />
        </div>
        <div className='swap-coming-soon__copy'>
          <h2 className='swap-coming-soon__title'>Swaps are coming soon</h2>
          <p className='swap-coming-soon__description'>
            We are polishing the swap experience before turning it on here.
          </p>
        </div>
        <Button label='Got it' onClick={onClose} />
      </div>
    </SheetModal>
  )
}
