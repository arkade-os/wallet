import { useContext, useState } from 'react'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import FlexCol from '../../../components/FlexCol'
import InputAmount from '../../../components/InputAmount'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import ErrorMessage from '../../../components/Error'
import WarningBox from '../../../components/Warning'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { CashContext } from '../../../providers/cash'
import { ConfigContext } from '../../../providers/config'
import { Unit } from '../../../lib/types'
import { toSatoshis } from '../../../lib/format'
import { extractError } from '../../../lib/error'
import { FiatContext } from '../../../providers/fiat'

export default function IssueCash() {
  const { issueCash } = useContext(WalletContext)
  const { setVoucher } = useContext(CashContext)
  const { navigate } = useContext(NavigationContext)
  const { config } = useContext(ConfigContext)
  const { useFiat } = useContext(ConfigContext)
  const { fromFiat } = useContext(FiatContext)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const amount = Number(value)
  const sats = useFiat ? fromFiat(amount) : config.unit === Unit.BTC ? toSatoshis(amount) : Math.floor(amount)
  const issue = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (!Number.isSafeInteger(sats) || sats <= 0) throw new Error('Enter a positive whole number of sats')
      if (!issueCash) throw new Error('Unlock the wallet first')
      const result = await issueCash(sats)
      setVoucher(result.id)
      navigate(Pages.CashDetail)
    } catch (err) {
      setError(extractError(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Header text='Issue Cash' back={() => navigate(Pages.Cash)} />
      <Content>
        <Padded>
          <FlexCol gap='1.5rem'>
            <WarningBox
              green
              text='A voucher is a claimable secret. Share only with the intended recipient; anyone who gets it can claim it once.'
            />
            <InputAmount focus label='Amount' value={value} onChange={setValue} onEnter={issue} />
            <ErrorMessage error={!!error} text={error} />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label={busy ? 'Issuing…' : 'Issue voucher'} disabled={!Number(value) || busy} onClick={issue} />
      </ButtonsOnBottom>
    </>
  )
}
