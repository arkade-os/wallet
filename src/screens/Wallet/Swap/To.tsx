import FlexRow from '@/components/FlexRow'
import { AssetWithBalance, SwapAsset } from './Components'
import FlexCol from '@/components/FlexCol'
import Text, { TextSecondary } from '@/components/Text'
import SpinnerIcon from '@/icons/Spinner'
import Button from '@/components/Button'

export interface SwapInputProps {
  amount: string
  asset: SwapAsset | undefined
  openAssetSelector?: () => void
  quoteLoading?: boolean
}

export default function SwapAmount({ amount, asset, openAssetSelector, quoteLoading }: SwapInputProps) {
  return (
    <div className='input-shell'>
      <FlexRow between>
        <FlexCol gap='0.25rem'>
          <TextSecondary small>Receive</TextSecondary>
          {quoteLoading ? <SpinnerIcon small /> : <Text>{amount}</Text>}
        </FlexCol>
        {asset ? (
          <FlexRow end minWidth='10rem' onClick={openAssetSelector}>
            <AssetWithBalance asset={asset} />
          </FlexRow>
        ) : (
          <FlexRow end minWidth='10rem'>
            <Button outline onClick={() => openAssetSelector?.()}>
              <Text>Select asset</Text>
            </Button>
          </FlexRow>
        )}
      </FlexRow>
    </div>
  )
}
