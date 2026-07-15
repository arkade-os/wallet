import FlexCol from '@/components/FlexCol'
import Input from './Input'
import { SwapAsset } from './Components'
import SwapIcon from '@/icons/Swap'
import FlexRow from '@/components/FlexRow'
import ErrorMessage from '@/components/Error'

export default function SwapForm({
  amount,
  fromAsset,
  toAsset,
  receiveAmount,
  onChangeAmount,
  onOpenDrawer,
  onSwapSides,
  validationMessage,
  quoteLoading,
}: {
  amount: string
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  receiveAmount: string
  onChangeAmount: (amount: string) => void
  onOpenDrawer: (state: 'from' | 'to') => void
  onSwapSides: () => void
  validationMessage: string
  quoteLoading: boolean
}) {
  return (
    <FlexCol>
      <ErrorMessage error={Boolean(validationMessage)} text={validationMessage} />
      <Input
        side='from'
        amount={amount}
        asset={fromAsset}
        onChange={onChangeAmount}
        openAssetSelector={() => onOpenDrawer('from')}
      />
      <FlexRow centered onClick={onSwapSides}>
        <SwapIcon />
      </FlexRow>
      <Input
        readOnly
        side='to'
        asset={toAsset}
        quoteLoading={quoteLoading}
        amount={quoteLoading ? '—' : receiveAmount}
        openAssetSelector={() => onOpenDrawer('to')}
      />
    </FlexCol>
  )
}
