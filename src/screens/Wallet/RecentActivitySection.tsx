import { useContext } from 'react'
import { ChevronRight } from 'lucide-react'
import Text from '../../components/Text'
import TransactionsList from '../../components/TransactionsList'
import { EmptyTxList } from '../../components/Empty'
import { WalletContext } from '../../providers/wallet'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hapticSubtle } from '../../lib/haptics'

/**
 * Compact "Recent activity" module for the home screen.
 * Full-width — no card wrapper. Shows the most recent transactions with a
 * View all link to the full Activity page.
 */
export default function RecentActivitySection() {
  const { txs } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const handleViewAll = () => {
    hapticSubtle()
    navigate(Pages.Activity)
  }

  if (!txs || txs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
        <div style={headerStyle}>
          <Text color='dark50' small>
            Recent activity
          </Text>
        </div>
        <EmptyTxList />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div style={headerStyle}>
        <Text color='dark50' small>
          Recent activity
        </Text>
        <button
          type='button'
          onClick={handleViewAll}
          aria-label='View all activity'
          data-testid='activity-view-all'
          style={buttonStyle}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: 'var(--purple)',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            View all
            <ChevronRight size={14} strokeWidth={2} />
          </span>
        </button>
      </div>
      <TransactionsList title='' mode='static' limit={3} />
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  padding: '0 0.25rem',
}

const buttonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  color: 'inherit',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
}
