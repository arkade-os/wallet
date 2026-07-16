import FlexRow from '@/components/FlexRow'
import { AssetWithBalance, SwapAsset } from './Components'
import FlexCol from '@/components/FlexCol'
import { TextSecondary } from '@/components/Text'
import { isMobileBrowser } from '@/lib/browser'
import { useContext } from 'react'
import { ConfigContext } from '@/providers/config'

export interface SwapFromProps {
  amount: string
  asset: SwapAsset
  onChange?: (amount: string) => void
  onShowKeypad?: () => void
}

export default function SwapFrom({ amount, asset, onChange, onShowKeypad }: SwapFromProps) {
  const { config } = useContext(ConfigContext)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return
    const value = e.target.value
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      onChange?.(value)
    }
  }

  const handleFocus = () => {
    if (isMobileBrowser && onShowKeypad) onShowKeypad()
  }

  const label = asset.assetId === 'btc' ? `Send ${config.unit}` : `Send ${asset.ticker}`

  return (
    <div className='input-shell'>
      <FlexRow between>
        <FlexCol gap='0.25rem'>
          <TextSecondary small>{label}</TextSecondary>
          <input value={amount} onChange={handleAmountChange} onFocus={handleFocus} />
        </FlexCol>
        <FlexRow end minWidth='10rem'>
          <AssetWithBalance asset={asset} />
        </FlexRow>
      </FlexRow>
    </div>
  )
}
