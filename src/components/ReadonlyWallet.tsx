import WarningBox from './Warning'
import FlexCol from './FlexCol'

export default function ReadonlyWallet() {
  return (
    <FlexCol gap='0' margin='0.75rem 0'>
      <WarningBox text='This wallet is read-only. You can only receive funds and access the transaction history' />{' '}
    </FlexCol>
  )
}
