import { useContext } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import AssetCard from '../../components/AssetCard'
import Text from '../../components/Text'
import BitcoinIcon from '../../icons/Bitcoin'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { NavigationContext, Pages } from '../../providers/navigation'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { FlowContext } from '../../providers/flow'
import { hapticSubtle } from '../../lib/haptics'
import { prettyNumber } from '../../lib/format'
import { mockAvatarFor } from '../../lib/mockPortfolio'

interface AssetsSectionProps {
  onCreateClick: () => void
}

export default function AssetsSection({ onCreateClick }: AssetsSectionProps) {
  const { navigate } = useContext(NavigationContext)
  const { config } = useContext(ConfigContext)
  const { fiatDecimals } = useContext(FiatContext)
  const { setAssetInfo } = useContext(FlowContext)
  const { rows } = usePortfolioFiat()

  const handleViewAll = () => {
    hapticSubtle()
    navigate(Pages.AppAssets)
  }

  const handleCreate = () => {
    hapticSubtle()
    onCreateClick()
  }

  const handleRowClick = (assetId: string) => () => {
    hapticSubtle()
    if (assetId === 'btc') return
    setAssetInfo({ assetId, supply: 0 })
    navigate(Pages.AppAssetDetail)
  }

  const fiatLabel = (amount: number) => `${prettyNumber(amount, fiatDecimals(), true, fiatDecimals())} ${config.fiat}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      <div style={sectionHeaderStyle}>
        <Text color='dark50' small>
          Assets
        </Text>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem' }}>
          <LinkButton
            onClick={handleCreate}
            label='Create'
            testId='assets-create'
            ariaLabel='Create asset'
            leadingIcon={<Plus size={14} strokeWidth={2} />}
          />
          <LinkButton
            onClick={handleViewAll}
            label='View all'
            testId='assets-view-all'
            ariaLabel='View all assets'
            trailingIcon={<ChevronRight size={14} strokeWidth={2} />}
          />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
        {rows.map((row) => {
          const mockAvatar = mockAvatarFor(row.assetId)
          const avatar = row.assetId === 'btc' ? <BitcoinIcon size={20} /> : mockAvatar ? mockAvatar.symbol : undefined
          const avatarBg = row.assetId === 'btc' ? undefined : mockAvatar?.bg
          const avatarColor = row.assetId === 'btc' ? undefined : mockAvatar?.color
          return (
            <AssetCard
              key={row.assetId}
              assetId={row.assetId === 'btc' ? '' : row.assetId}
              name={row.name}
              ticker={row.ticker}
              icon={row.icon}
              avatar={avatar}
              avatarBg={avatarBg}
              avatarColor={avatarColor}
              decimals={row.decimals}
              balance={row.balance}
              fiatText={fiatLabel(row.fiatAmount)}
              onClick={handleRowClick(row.assetId)}
            />
          )
        })}
      </div>
    </div>
  )
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  padding: '0 0.25rem',
}

function LinkButton({
  onClick,
  label,
  testId,
  ariaLabel,
  leadingIcon,
  trailingIcon,
}: {
  onClick: () => void
  label: string
  testId: string
  ariaLabel: string
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
}) {
  return (
    <button type='button' onClick={onClick} aria-label={ariaLabel} data-testid={testId} style={buttonStyle}>
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
        {leadingIcon}
        {label}
        {trailingIcon}
      </span>
    </button>
  )
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
