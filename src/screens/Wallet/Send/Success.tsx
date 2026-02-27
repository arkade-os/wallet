import { useContext, useEffect } from 'react'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Success from '../../../components/Success'
import { prettyAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'

export default function SendSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { sendInfo } = useContext(FlowContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)

  // Show payment sent notification
  useEffect(() => {
    if (sendInfo.total) notifyPaymentSent(sendInfo.total)
  }, [sendInfo.total])

  const totalSats = sendInfo.total ?? 0
  const displayAmount = useFiat
    ? prettyAmount(toFiat(totalSats), undefined, config.fiat)
    : prettyAmount(totalSats, config)

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success headline='Payment sent!' text={`${displayAmount} sent successfully`} />
      </Content>
    </>
  )
}
