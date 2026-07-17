import FlexRow from '@/components/FlexRow'
import { AssetWithBalance, SwapAsset } from './Components'
import FlexCol from '@/components/FlexCol'
import { TextSecondary } from '@/components/Text'
import { isMobileBrowser } from '@/lib/browser'
import { BTC_ASSET_ID } from '@/lib/swap/markets'
import { useContext } from 'react'
import { ConfigContext } from '@/providers/config'

interface SwapFromProps {
  amount: string
  asset: SwapAsset
  onChange: (amount: string) => void
  onShowKeypad: () => void
}

export default function SwapFrom({ amount, asset, onChange, onShowKeypad }: SwapFromProps) {
  const { config } = useContext(ConfigContext)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // clamp to the asset's precision as typed: whole units only at 0 decimals
    // (sats), at most `decimals` fraction digits otherwise — anything looser
    // gets reinterpreted downstream (the quote strips what the asset can't hold)
    const pattern = asset.decimals === 0 ? /^[0-9]*$/ : new RegExp(`^[0-9]*\\.?[0-9]{0,${asset.decimals}}$`)
    if (value === '' || pattern.test(value)) {
      onChange(value)
    }
  }

  const handleFocus = () => {
    if (isMobileBrowser) onShowKeypad()
  }

  const label = asset.assetId === BTC_ASSET_ID ? `Send ${config.unit}` : `Send ${asset.ticker}`

  return (
    <div className='input-shell'>
      <FlexRow between>
        <FlexCol gap='0.25rem'>
          <TextSecondary small>{label}</TextSecondary>
          {/* the custom keypad drives entry on mobile; keep the native keyboard away */}
          <input
            value={amount}
            aria-label={label}
            onChange={handleAmountChange}
            onFocus={handleFocus}
            inputMode={isMobileBrowser ? 'none' : undefined}
          />
        </FlexCol>
        <FlexRow end minWidth='10rem'>
          <AssetWithBalance asset={asset} />
        </FlexRow>
      </FlexRow>
    </div>
  )
}
