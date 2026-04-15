import { ReactNode } from 'react'
import Text from './Text'
import AssetAvatar from './AssetAvatar'
import { centsToUnits, truncatedAssetId } from '../lib/assets'
import { prettyNumber } from '../lib/format'

interface AssetCardProps {
  assetId: string
  balance: number
  decimals?: number
  icon?: string
  /** Fully rendered avatar (e.g. a real Bitcoin SVG). Takes precedence over `icon`. */
  avatar?: ReactNode
  /** Background color for the avatar circle. Defaults to `var(--dark05)`. */
  avatarBg?: string
  /** Foreground color for the avatar content. Defaults to `var(--orange)` (used by BTC). */
  avatarColor?: string
  /** Asset name (e.g. "Bitcoin"). */
  name?: string
  /** Asset ticker (e.g. "BTC"). Used for avatar fallback; displayed after the balance on the left. */
  ticker?: string
  /** Fiat-value text shown as the primary right-side figure (e.g. "$7.29"). */
  fiatText?: string
  /** Optional secondary label override for the left column (replaces the "balance ticker" line). */
  secondary?: string
  onClick?: () => void
}

/**
 * Home-screen asset row. No gray backgrounds — a clean white card with a
 * subtle border and shadow. Left column: asset name + balance-with-ticker.
 * Right column: fiat value, primary.
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
  secondary,
  onClick,
}: AssetCardProps) {
  const assetName = name || truncatedAssetId(assetId) || 'Asset'
  const tokenTick = ticker ? ticker : 'TKN'
  const prettyBalance = prettyNumber(centsToUnits(balance, decimals ?? 8))
  const leftSecondary = secondary ?? `${prettyBalance} ${tokenTick}`

  const renderedAvatar = avatar ? (
    <div
      style={{
        width: 36,
        height: 36,
        minWidth: 36,
        minHeight: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: avatarBg ?? 'var(--dark05)',
        color: avatarColor ?? 'var(--orange)',
        fontWeight: 600,
      }}
    >
      {avatar}
    </div>
  ) : (
    <AssetAvatar icon={icon} name={name} ticker={ticker} size={36} assetId={assetId} clickable />
  )

  return (
    <button type='button' onClick={onClick} style={cardStyle} data-testid={`asset-row-${assetId || 'btc'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {renderedAvatar}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.125rem' }}>
          <Text medium>{assetName}</Text>
          <Text color='dark50' small>
            {leftSecondary}
          </Text>
        </div>
      </div>
      {fiatText ? (
        <div style={{ textAlign: 'right' }}>
          <Text heading medium large>
            {fiatText}
          </Text>
        </div>
      ) : null}
    </button>
  )
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
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
