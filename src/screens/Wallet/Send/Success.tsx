import { useContext, useEffect } from 'react'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Success from '../../../components/Success'
import { prettyAmount } from '../../../lib/format'
import { IframeContext } from '../../../providers/iframe'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'

export default function SendSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { sendInfo } = useContext(FlowContext)
  const { iframeUrl, sendMessage } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)

  // Show payment sent notification
  useEffect(() => {
    if (sendInfo.total) notifyPaymentSent(sendInfo.total)
  }, [sendInfo.total])

  useEffect(() => {
    if (iframeUrl) {
      sendMessage(
        JSON.stringify({
          action: 'paid',
          arkAddress: sendInfo.arkAddress,
          satoshis: sendInfo.total,
          txid: sendInfo.txid,
        }),
      )
      navigate(Pages.Wallet)
    }
  }, [iframeUrl, sendInfo, sendMessage, navigate])

  if (iframeUrl) {
    return <></>
  }

  const displayAmount = useFiat ? prettyAmount(toFiat(sendInfo.total), config.fiat) : prettyAmount(sendInfo.total ?? 0)

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success headline='Transaction completed!' text={`Payment of ${displayAmount} sent successfully`} />
      </Content>
    </>
  )
}
