import { ReactNode } from 'react'
import AssetAvatar from './AssetAvatar'
import { centsToUnits, truncatedAssetId } from '../lib/assets'
import { prettyNumber } from '../lib/format'
import { hapticLight } from '../lib/haptics'

interface AssetCardProps {
  assetId: string
  balance: number
  decimals?: number
  icon?: string
  /** Fully rendered avatar (e.g. a real Bitcoin SVG). Takes precedence over `icon`. */
  avatar?: ReactNode
  /** Background color for the avatar circle. */
  avatarBg?: string
  /** Foreground color for the avatar content. */
  avatarColor?: string
  /** Asset name (e.g. "Bitcoin"). */
  name?: string
  /** Asset ticker (e.g. "BTC"). */
  ticker?: string
  /** Fiat-value text shown on the right (e.g. "$7.29 USD"). */
  fiatText?: string
  onClick?: () => void
}

/**
 * Home-screen asset row. Clean card with subtle border and shadow.
 * Left column: avatar + name + balance. Right column: fiat value.
 */
export default function AssetCard({
  assetId,
  balance,
  decimals,
  icon,
  avatar,
  avatarBg,
  avatarColor,
  name,
  ticker,
  fiatText,
  onClick,
}: AssetCardProps) {
  const assetName = name || truncatedAssetId(assetId) || 'Asset'
  const tokenTick = ticker ?? 'TKN'
  const prettyBalance = prettyNumber(centsToUnits(balance, decimals ?? 8))
  const leftSecondary = `${prettyBalance} ${tokenTick}`

  const handleClick = onClick
    ? () => {
        hapticLight()
        onClick()
      }
    : undefined

  const renderedAvatar = avatar ? (
    <div
      className="flex size-9 min-h-9 min-w-9 items-center justify-center rounded-full font-semibold"
      style={{
        background: avatarBg ?? 'var(--neutral-100)',
        color: avatarColor ?? 'var(--orange)',
      }}
    >
      {avatar}
    </div>
  ) : (
    <AssetAvatar icon={icon} name={name} ticker={ticker} size={36} assetId={assetId} />
  )

  const content = (
    <>
      <div className="flex items-center gap-3">
        {renderedAvatar}
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-medium">{assetName}</span>
          <span className="text-sm text-[var(--neutral-500)]">{leftSecondary}</span>
        </div>
      </div>
      {fiatText ? (
        <div className="text-right">
          <span className="font-heading text-lg font-medium">{fiatText}</span>
        </div>
      ) : null}
    </>
  )

  const baseClasses =
    'flex w-full items-center justify-between rounded-xl border border-[var(--neutral-100)] bg-[var(--bg)] px-4 py-3.5 text-left text-inherit shadow-sm'

  // Non-interactive row (e.g. BTC which has no detail screen)
  if (!onClick) {
    return (
      <div data-testid={`asset-row-${assetId || 'btc'}`} className={baseClasses}>
        {content}
      </div>
    )
  }

  // Interactive row with tap feedback
  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={`asset-row-${assetId || 'btc'}`}
      className={`${baseClasses} cursor-pointer transition-transform active:scale-[0.98]`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {content}
    </button>
  )
}
