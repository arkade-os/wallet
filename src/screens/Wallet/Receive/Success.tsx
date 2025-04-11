import { useContext, useEffect } from 'react'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Content from '../../../components/Content'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import Header from '../../../components/Header'
import Success from '../../../components/Success'
import { prettyAmount } from '../../../lib/format'
import BackToWalletButton from '../../../components/BackToWalletButton'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'

export default function ReceiveSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { recvInfo } = useContext(FlowContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)

  useEffect(() => {
    notifyPaymentReceived(recvInfo.satoshis)
  }, [])

  const displayAmount = useFiat ? prettyAmount(toFiat(recvInfo.satoshis), config.fiat) : prettyAmount(recvInfo.satoshis)

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success text={`${displayAmount} received successfully`} />
      </Content>
      <ButtonsOnBottom>
        <BackToWalletButton />
      </ButtonsOnBottom>
    </>
  )
}
