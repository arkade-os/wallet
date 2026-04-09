import { useContext, useEffect } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import { prettyAmount } from '../../../lib/format'
import Header from '../../../components/Header'
import Success from '../../../components/Success'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'

export default function NotesSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat, fiatDecimals } = useContext(FiatContext)
  const { noteInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)
  const { navigate } = useContext(NavigationContext)

  useEffect(() => {
    notifyPaymentReceived(noteInfo.satoshis)
  }, [])

  const displayAmount = useFiat
    ? prettyAmount(toFiat(noteInfo.satoshis), config.fiat, fiatDecimals())
    : prettyAmount(noteInfo.satoshis)

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success headline='Note redeemed!' text={`${displayAmount} redeemed successfully`} />
      </Content>
      <ButtonsOnBottom>
        <Button label='Sounds good' onClick={() => navigate(Pages.Wallet)} />
      </ButtonsOnBottom>
    </>
  )
}
