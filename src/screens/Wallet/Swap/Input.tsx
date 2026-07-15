import FlexRow from '@/components/FlexRow'
import { SwapAsset } from './Components'
import FlexCol from '@/components/FlexCol'
import Text, { TextSecondary } from '@/components/Text'
import TokenLogo, { tokenLogoTickerForTicker } from '@/components/TokenLogo'
import AssetAvatar from '@/components/AssetAvatar'
import { prettyCurrencyAssetAmount } from '@/lib/format'
import { isMobileBrowser } from '@/lib/browser'
import { useState } from 'react'
import Keyboard from '@/components/Keyboard'
import SpinnerIcon from '@/icons/Spinner'

function formatAssetBalance(asset: SwapAsset): string {
  return `${prettyCurrencyAssetAmount(asset.balance, asset.decimals, asset.ticker)} ${asset.ticker}`
}

function TokenAvatar({ asset, size }: { asset: SwapAsset; size: number }) {
  const tokenLogoTicker = tokenLogoTickerForTicker(asset.assetId === 'btc' ? 'BTC' : asset.ticker)
  return (
    <span className='swap-token-avatar' style={{ width: size, height: size }}>
      {tokenLogoTicker ? (
        <TokenLogo ticker={tokenLogoTicker} />
      ) : (
        <AssetAvatar icon={asset.icon} name={asset.name} ticker={asset.ticker} size={size} />
      )}
    </span>
  )
}

export interface SwapInputProps {
  amount: string
  asset: SwapAsset | undefined
  readOnly?: boolean
  side: 'from' | 'to'
  onChange?: (amount: string) => void
  openAssetSelector?: () => void
  quoteLoading?: boolean
}

export default function SwapInput({
  amount,
  asset,
  readOnly,
  side,
  onChange,
  openAssetSelector,
  quoteLoading,
}: SwapInputProps) {
  const [showKeys, setShowKeys] = useState(false)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || !onChange) return
    const value = e.target.value
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      onChange?.(value)
    }
  }

  const handleFocus = () => {
    if (isMobileBrowser) setShowKeys(true)
  }

  const Keys = () => <Keyboard asset={asset} back={() => setShowKeys(false)} onSave={(value) => onChange?.(value)} />

  const isFrom = side === 'from'

  return showKeys && !readOnly ? (
    <Keys />
  ) : (
    <div className='input-shell'>
      <FlexRow between>
        <FlexCol gap='0.25rem'>
          <TextSecondary small>{isFrom ? 'Send' : 'Receive'}</TextSecondary>
          {isFrom ? (
            <input value={amount} onChange={handleAmountChange} onFocus={handleFocus} readOnly={readOnly} />
          ) : quoteLoading ? (
            <SpinnerIcon />
          ) : (
            <Text>{amount}</Text>
          )}
        </FlexCol>
        <div style={{ width: '10rem' }} onClick={openAssetSelector}>
          {asset ? (
            <FlexRow end minWidth='10rem'>
              <TokenAvatar asset={asset} size={36} />
              <FlexCol gap='0'>
                <Text>{asset.name}</Text>
                <TextSecondary small>{formatAssetBalance(asset)}</TextSecondary>
              </FlexCol>
            </FlexRow>
          ) : (
            <Text>Select asset</Text>
          )}
        </div>
      </FlexRow>
    </div>
  )
}
