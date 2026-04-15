import { useContext, ReactNode } from 'react'
import Text, { TextSecondary } from '../../components/Text'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hapticSubtle } from '../../lib/haptics'
import { Coins, Landmark } from 'lucide-react'

interface UpsellCardProps {
  icon: ReactNode
  title: string
  description: string
  testId: string
  onClick: () => void
}

function UpsellCard({ icon, title, description, testId, onClick }: UpsellCardProps) {
  return (
    <button type='button' onClick={onClick} data-testid={testId} style={cardStyle}>
      <div
        style={{
          width: 40,
          height: 40,
          minWidth: 40,
          borderRadius: '50%',
          background: 'var(--dark05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--purple)',
        }}
      >
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.125rem' }}>
        <Text medium>{title}</Text>
        <TextSecondary>{description}</TextSecondary>
      </div>
    </button>
  )
}

/**
 * Homepage product upsells. These are inline entry points to what used to be
 * "apps" (LendaSat loans, DFX buy/sell). Apps are retired as a navigation concept —
 * the long-term plan is to integrate these natively into send/receive/asset flows.
 */
export default function UpsellsSection() {
  const { navigate } = useContext(NavigationContext)

  const handleLoans = () => {
    hapticSubtle()
    navigate(Pages.AppLendasat)
  }

  const handleBuySell = () => {
    hapticSubtle()
    navigate(Pages.AppDfx)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      <div style={{ padding: '0 0.25rem' }}>
        <Text color='dark50' small>
          Do more with bitcoin
        </Text>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
        <UpsellCard
          icon={<Landmark size={20} strokeWidth={1.75} />}
          title='Borrow against your bitcoin'
          description='Get a loan without selling. Self-custodial, no paperwork.'
          testId='upsell-loans'
          onClick={handleLoans}
        />
        <UpsellCard
          icon={<Coins size={20} strokeWidth={1.75} />}
          title='Buy or sell bitcoin'
          description='Convert between bitcoin and your local currency.'
          testId='upsell-buy-sell'
          onClick={handleBuySell}
        />
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.875rem',
  width: '100%',
  padding: '0.875rem 1rem',
  background: 'var(--ion-background-color)',
  border: '1px solid var(--dark10)',
  borderRadius: '0.75rem',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
  cursor: 'pointer',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
}
