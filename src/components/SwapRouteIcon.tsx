import TokenLogo, { accountTickerForAssetTicker, tokenLogoTickerForTicker } from './TokenLogo'

interface SwapRouteAsset {
  assetId?: string
  icon?: string
  ticker?: string
}

interface SwapRouteIconProps {
  from: SwapRouteAsset
  size?: 'compact' | 'hero'
  to: SwapRouteAsset
}

export default function SwapRouteIcon({ from, size = 'compact', to }: SwapRouteIconProps) {
  return (
    <span className={`swap-route-icon swap-route-icon--${size}`} aria-hidden='true'>
      <SwapRouteAssetLogo asset={from} />
      <SwapRouteAssetLogo asset={to} />
    </span>
  )
}

function SwapRouteAssetLogo({ asset }: { asset: SwapRouteAsset }) {
  // asset.ticker on the BTC leg is the wallet's bitcoin display unit
  // ('sats'/'₿'), not a real ticker — resolve the logo from the asset id
  const accountTicker = accountTickerForAssetTicker(asset.ticker)
  const tokenLogoTicker = asset.assetId === 'btc' ? 'BTC' : tokenLogoTickerForTicker(accountTicker ?? asset.ticker)

  return (
    <span className='swap-route-icon__asset'>
      {tokenLogoTicker ? (
        <TokenLogo ticker={tokenLogoTicker} />
      ) : asset.icon ? (
        <img alt='' src={asset.icon} />
      ) : (
        <span className='swap-route-icon__fallback'>{asset.ticker?.trim().charAt(0).toUpperCase() || 'A'}</span>
      )}
    </span>
  )
}
