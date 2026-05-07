import AssetAvatar from './AssetAvatar'
import TokenLogo, { type TokenLogoTicker } from './TokenLogo'
import { centsToUnits, truncatedAssetId } from '../lib/assets'
import { prettyNumber } from '../lib/format'
import { hapticLight } from '../lib/haptics'

interface AssetCardProps {
  assetId: string
  balance: number
  decimals?: number
  icon?: string
  /** Asset name (e.g. "Bitcoin"). */
  name?: string
  /** Asset ticker (e.g. "BTC"). */
  ticker?: string
  /** Fiat-value text shown on the right (e.g. "$7.29"). */
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

  const tokenLogoTicker = getTokenLogoTicker(tokenTick)
  const renderedAvatar = tokenLogoTicker ? (
    <span className='asset-card__logo' aria-hidden='true'>
      <TokenLogo ticker={tokenLogoTicker} />
    </span>
  ) : (
    <AssetAvatar icon={icon} name={name} ticker={ticker} size={36} assetId={assetId} />
  )

  const content = (
    <>
      <div className='asset-card__identity'>
        {renderedAvatar}
        <div className='asset-card__copy'>
          <span className='asset-card__name'>{assetName}</span>
          <span className='asset-card__balance'>{leftSecondary}</span>
        </div>
      </div>
      {fiatText ? (
        <div className='asset-card__value'>
          <span>{fiatText}</span>
        </div>
      ) : null}
    </>
  )

  const baseClasses = 'asset-card'

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
      type='button'
      onClick={handleClick}
      data-testid={`asset-row-${assetId || 'btc'}`}
      className={`${baseClasses} asset-card--interactive`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {content}
    </button>
  )
}

function getTokenLogoTicker(ticker: string): TokenLogoTicker | undefined {
  const normalized = ticker.trim().toUpperCase()
  if (normalized === 'BTC' || normalized === 'USDT' || normalized === 'USDC') return normalized
}
