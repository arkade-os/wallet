import AssetAvatar from './AssetAvatar'
import TokenLogo, { tokenLogoTickerForTicker } from './TokenLogo'
import { truncatedAssetId } from '../lib/assets'
import { hapticLight } from '../lib/haptics'
import { PrivacyAmount, maskedFiat } from './PrivacyAmount'
import { prettyBitcoinAmount, prettyBitcoinHide, prettyCurrencyAssetAmount } from '../lib/format'
import { useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { Unit } from '../lib/types'

interface AssetCardProps {
  assetId: string
  balance: bigint | number
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
  const { config } = useContext(ConfigContext)
  const assetName = name || truncatedAssetId(assetId) || 'Asset'
  const tokenTick = ticker ?? 'TKN'
  const rawBalance =
    typeof balance === 'bigint'
      ? balance
      : Number.isFinite(balance) && Number.isInteger(balance)
        ? BigInt(balance)
        : BigInt(0)
  const bitcoinUnit = config.currencyDisplay as unknown as Unit
  const isBitcoin = tokenTick.toUpperCase() === 'BTC'
  const prettyBalance = isBitcoin
    ? prettyBitcoinAmount(Number(rawBalance), bitcoinUnit)
    : prettyCurrencyAssetAmount(rawBalance, decimals ?? 8, tokenTick)
  const leftSecondary = isBitcoin ? prettyBalance : `${prettyBalance} ${tokenTick}`
  const maskedBalance = isBitcoin ? prettyBitcoinHide(Number(rawBalance), bitcoinUnit) : `•••• ${tokenTick}`
  const maskedFiatText = maskedFiatUnit(fiatText)

  const handleClick = onClick
    ? () => {
        hapticLight()
        onClick()
      }
    : undefined

  const tokenLogoTicker = tokenLogoTickerForTicker(tokenTick)
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
          <PrivacyAmount className='asset-card__balance' masked={maskedBalance}>
            {leftSecondary}
          </PrivacyAmount>
        </div>
      </div>
      {fiatText ? (
        <div className='asset-card__value'>
          <PrivacyAmount masked={maskedFiatText}>{fiatText}</PrivacyAmount>
        </div>
      ) : null}
    </>
  )

  const baseClasses = 'asset-card'

  // Non-interactive row (e.g. asset which has no detail screen)
  if (!onClick) {
    return (
      <div data-testid={assetRowTestId(tokenTick, assetId)} className={baseClasses}>
        {content}
      </div>
    )
  }

  // Interactive row with tap feedback
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        handleClick?.()
      }}
      data-testid={assetRowTestId(tokenTick, assetId)}
      className={`${baseClasses} asset-card--interactive`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {content}
    </div>
  )
}

function assetRowTestId(ticker: string, assetId: string) {
  return `asset-row-${ticker || 'btc'}-${assetId || 'btc'}`
}

function maskedFiatUnit(fiatText?: string) {
  const trimmed = fiatText?.trim()
  if (!trimmed) return '••••'

  const leadingUnit = trimmed.match(/^[^\d\s.,+-]+/)
  if (leadingUnit) return maskedFiat(leadingUnit[0])

  const trailingCode = trimmed.match(/\b[A-Z]{3}$/)
  if (trailingCode) return `•••• ${trailingCode[0]}`

  return '••••'
}
