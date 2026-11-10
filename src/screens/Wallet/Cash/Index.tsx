import { useContext, useEffect, useState } from 'react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import FlexCol from '../../../components/FlexCol'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { TextSecondary } from '../../../components/Text'
import CashIcon from '../../../icons/Notes'
import ArrowIcon from '../../../icons/Arrow'
import SegmentedControl from '../../../components/SegmentedControl'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { CashContext } from '../../../providers/cash'
import { cashStatusLabel } from '../../../lib/arkadeCashTransfer'

export default function Cash() {
  const { cashRecords = [], refreshCash } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)
  const { setVoucher } = useContext(CashContext)
  const [view, setView] = useState<'issued' | 'claimed'>('issued')
  useEffect(() => {
    void refreshCash?.()
  }, [])
  const records = cashRecords.filter((record) => record.action === view)
  return (
    <>
      <Header text='Arkade Cash' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <SegmentedControl
              options={['issued', 'claimed']}
              selected={view}
              onChange={(value) => setView(value as 'issued' | 'claimed')}
              getLabel={(value) => (value === 'issued' ? 'Issued' : 'Claimed')}
            />
            {records.map((record) => (
              <button
                key={record.id}
                className='settings-row'
                onClick={() => {
                  setVoucher(record.id)
                  navigate(Pages.CashDetail)
                }}
              >
                <span className='settings-row__main'>
                  <CashIcon />
                  <span>
                    <strong>{cashStatusLabel(record.status, record.action)}</strong>
                    <br />
                    <small>{record.amount.toLocaleString()} sats</small>
                  </span>
                </span>
                <ArrowIcon />
              </button>
            ))}
            {records.length === 0 && (
              <FlexCol centered gap='0.75rem'>
                <CashIcon />
                <TextSecondary centered>
                  {view === 'issued' ? 'No issued vouchers yet.' : 'No claimed vouchers yet.'}
                </TextSecondary>
              </FlexCol>
            )}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label='Issue voucher' onClick={() => navigate(Pages.CashIssue)} />
        <Button secondary label='Claim voucher' onClick={() => navigate(Pages.CashClaim)} />
      </ButtonsOnBottom>
    </>
  )
}
