import { useContext } from 'react'
import AssetCard from '../../components/AssetCard'
import PlusIcon from '../../icons/Plus'
import ArrowIcon from '../../icons/Arrow'
import BitcoinIcon from '../../icons/Bitcoin'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { NavigationContext, Pages } from '../../providers/navigation'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { FlowContext } from '../../providers/flow'
import { hapticLight } from '../../lib/haptics'
import { prettyNumber } from '../../lib/format'

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
    hapticLight()
    navigate(Pages.AppAssets)
  }

  const handleCreate = () => {
    hapticLight()
    onCreateClick()
  }

  const handleRowClick = (assetId: string) => () => {
    // BTC row is non-interactive (no detail screen)
    if (assetId === 'btc') return
    // Haptic is fired by AssetCard, no need to duplicate here
    setAssetInfo({ assetId, supply: 0 })
    navigate(Pages.AppAssetDetail)
  }

  const fiatLabel = (amount: number) => `${prettyNumber(amount, fiatDecimals(), true, fiatDecimals())} ${config.fiat}`

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full items-center justify-between px-1">
        <span className="text-sm text-neutral-500">Assets</span>
        <div className="inline-flex items-center gap-4">
          <LinkButton
            onClick={handleCreate}
            label="Create"
            testId="assets-create"
            ariaLabel="Create asset"
            leadingIcon={<PlusIcon />}
          />
          <LinkButton
            onClick={handleViewAll}
            label="View all"
            testId="assets-view-all"
            ariaLabel="View all assets"
            trailingIcon={<ArrowIcon small />}
          />
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        {rows.map((row) => {
          const isBtc = row.assetId === 'btc'
          return (
            <AssetCard
              key={row.assetId}
              assetId={isBtc ? '' : row.assetId}
              name={row.name}
              ticker={row.ticker}
              icon={row.icon}
              avatar={isBtc ? <BitcoinIcon size={20} /> : undefined}
              avatarBg={isBtc ? 'var(--orange-100)' : undefined}
              avatarColor={isBtc ? 'var(--orange)' : undefined}
              decimals={row.decimals}
              balance={row.balance}
              fiatText={row.hasFiatPrice ? fiatLabel(row.fiatAmount) : undefined}
              onClick={isBtc ? undefined : handleRowClick(row.assetId)}
            />
          )
        })}
      </div>
    </div>
  )
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
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      className="inline-flex cursor-pointer items-center border-none bg-transparent p-0 text-inherit"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="inline-flex items-center gap-1 text-sm font-medium leading-none text-purple-700">
        {leadingIcon}
        {label}
        {trailingIcon}
      </span>
    </button>
  )
}
