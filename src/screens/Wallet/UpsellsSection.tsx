import { useContext, ReactNode } from 'react'
import CoinsIcon from '../../icons/Coins'
import LandmarkIcon from '../../icons/Landmark'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hapticLight } from '../../lib/haptics'

interface UpsellCardProps {
  icon: ReactNode
  title: string
  description: string
  testId: string
  onClick: () => void
}

function UpsellCard({ icon, title, description, testId, onClick }: UpsellCardProps) {
  const handleClick = () => {
    hapticLight()
    onClick()
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      data-testid={testId}
      className='flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-neutral-100 bg-[var(--bg)] px-4 py-3.5 text-left text-inherit shadow-sm transition-transform active:scale-[0.98]'
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      <div className='flex size-10 min-w-10 items-center justify-center rounded-full bg-neutral-100 text-purple-700'>
        {icon}
      </div>
      <div className='flex flex-col items-start gap-0.5'>
        <span className='font-medium'>{title}</span>
        <span className='text-sm text-neutral-500'>{description}</span>
      </div>
    </button>
  )
}

/**
 * Homepage product upsells. These are inline entry points to LendaSat loans
 * and DFX buy/sell.
 */
export default function UpsellsSection() {
  const { navigate } = useContext(NavigationContext)

  const handleLoans = () => {
    navigate(Pages.AppLendasat)
  }

  const handleBuySell = () => {
    navigate(Pages.AppDfx)
  }

  return (
    <div className='flex w-full flex-col gap-3'>
      <div className='px-1'>
        <span className='text-sm text-neutral-500'>Do more with bitcoin</span>
      </div>
      <div className='flex w-full flex-col gap-2'>
        <UpsellCard
          icon={<LandmarkIcon size={20} />}
          title='Borrow against your bitcoin'
          description='Get a loan without selling. Self-custodial, no paperwork.'
          testId='upsell-loans'
          onClick={handleLoans}
        />
        <UpsellCard
          icon={<CoinsIcon size={20} />}
          title='Buy or sell bitcoin'
          description='Convert between bitcoin and your local currency.'
          testId='upsell-buy-sell'
          onClick={handleBuySell}
        />
      </div>
    </div>
  )
}
