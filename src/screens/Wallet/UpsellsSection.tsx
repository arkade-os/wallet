import { useContext, ReactNode } from 'react'
import CoinsIcon from '../../icons/Coins'
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
      className='home-upsell-card'
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      <div className='home-upsell-card__icon'>{icon}</div>
      <div className='home-upsell-card__copy'>
        <span className='home-upsell-card__title'>{title}</span>
        <span className='home-upsell-card__description'>{description}</span>
      </div>
    </button>
  )
}

/**
 * Homepage product upsells. These are inline entry points to buy/sell.
 */
export default function UpsellsSection() {
  const { navigate } = useContext(NavigationContext)

  const handleBuySell = () => {
    navigate(Pages.AppDfx)
  }

  return (
    <section className='home-section'>
      <div className='px-1'>
        <span className='home-section-label'>Do more with your money</span>
      </div>
      <div className='home-section__content'>
        <UpsellCard
          icon={<CoinsIcon size={20} />}
          title='Buy or sell bitcoin'
          description='Convert between bitcoin and your local currency.'
          testId='upsell-buy-sell'
          onClick={handleBuySell}
        />
      </div>
    </section>
  )
}
