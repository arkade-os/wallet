import FlexRow from '@/components/FlexRow'
import { AssetWithBalance, SwapAsset } from './Components'
import FlexCol from '@/components/FlexCol'
import Text, { TextSecondary } from '@/components/Text'
import SpinnerIcon from '@/icons/Spinner'
import Button from '@/components/Button'

interface SwapToProps {
  amount: string
  asset: SwapAsset | undefined
  openAssetSelector: () => void
  quoteLoading?: boolean
}

export default function SwapTo({ amount, asset, openAssetSelector, quoteLoading }: SwapToProps) {
  return (
    <div className='input-shell'>
      <FlexRow between>
        <FlexCol gap='0.25rem'>
          <TextSecondary small>Receive</TextSecondary>
          {quoteLoading ? <SpinnerIcon small /> : <Text>{amount}</Text>}
        </FlexCol>
        <FlexRow end minWidth='10rem' onClick={asset ? openAssetSelector : undefined}>
          {asset ? (
            <AssetWithBalance asset={asset} />
          ) : (
            <Button outline onClick={openAssetSelector}>
              <Text>Select asset</Text>
            </Button>
          )}
        </FlexRow>
      </FlexRow>
    </div>
  )
}
