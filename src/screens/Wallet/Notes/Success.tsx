import { useContext, useEffect } from 'react'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import { prettyAmount } from '../../../lib/format'
import Header from '../../../components/Header'
import Success from '../../../components/Success'
import BackToWalletButton from '../../../components/BackToWalletButton'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'

export default function NotesSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { noteInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)

  useEffect(() => {
    notifyPaymentReceived(noteInfo.satoshis)
  }, [])

  const displayAmount = useFiat ? prettyAmount(toFiat(noteInfo.satoshis), config.fiat) : prettyAmount(noteInfo.satoshis)

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success text={`${displayAmount} redeemed successfully`} />
      </Content>
      <ButtonsOnBottom>
        <BackToWalletButton />
      </ButtonsOnBottom>
    </>
  )
}
