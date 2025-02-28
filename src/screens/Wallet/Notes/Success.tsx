import { useContext, useEffect } from 'react'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import { prettyNumber } from '../../../lib/format'
import Header from '../../../components/Header'
import Success from '../../../components/Success'
import BackToWalletButton from '../../../components/BackToWalletButton'

export default function NotesSuccess() {
  const { noteInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)

  useEffect(() => {
    notifyPaymentReceived(noteInfo.satoshis)
  }, [])

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success text={`${prettyNumber(noteInfo.satoshis)} sats redeemed successfully`} />
      </Content>
      <ButtonsOnBottom>
        <BackToWalletButton />
      </ButtonsOnBottom>
    </>
  )
}
