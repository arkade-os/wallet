import { useContext, useEffect } from 'react'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import Header from '../../../components/Header'
import Success from '../../../components/Success'
import { prettyNumber } from '../../../lib/format'
import BackToWalletButton from '../../../components/BackToWalletButton'

export default function ReceiveSuccess() {
  const { recvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)

  useEffect(() => {
    notifyPaymentReceived(recvInfo.satoshis)
  }, [])

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success text={`${prettyNumber(recvInfo.satoshis)} sats received successfully`} />
      </Content>
      <ButtonsOnBottom>
        <BackToWalletButton />
      </ButtonsOnBottom>
    </>
  )
}
