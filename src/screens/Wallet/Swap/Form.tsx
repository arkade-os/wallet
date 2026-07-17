import FlexCol from '@/components/FlexCol'
import { SwapAsset } from './Components'
import SwapIcon from '@/icons/Swap'
import FlexRow from '@/components/FlexRow'
import ErrorMessage from '@/components/Error'
import From from './From'
import To from './To'

export default function SwapForm({
  amount,
  fromAsset,
  toAsset,
  receiveAmount,
  onChangeAmount,
  onOpenAssetPicker,
  onSwapSides,
  onShowKeypad,
  validationMessage,
  quoteLoading,
}: {
  amount: string
  fromAsset: SwapAsset
  toAsset?: SwapAsset
  receiveAmount: string
  onChangeAmount: (amount: string) => void
  onOpenAssetPicker: () => void
  onSwapSides: () => void
  onShowKeypad: () => void
  validationMessage: string
  quoteLoading: boolean
}) {
  return (
    <FlexCol>
      <ErrorMessage error={Boolean(validationMessage)} text={validationMessage} />
      <From amount={amount} asset={fromAsset} onChange={onChangeAmount} onShowKeypad={onShowKeypad} />
      <FlexRow centered onClick={onSwapSides}>
        <SwapIcon />
      </FlexRow>
      <To
        asset={toAsset}
        quoteLoading={quoteLoading}
        amount={quoteLoading ? '—' : receiveAmount}
        openAssetSelector={onOpenAssetPicker}
      />
    </FlexCol>
  )
}
