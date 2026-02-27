import { useContext, useEffect } from 'react'
import Content from '../../../components/Content'
import { NotificationsContext } from '../../../providers/notifications'
import { FlowContext } from '../../../providers/flow'
import { prettyAmount } from '../../../lib/format'
import Header from '../../../components/Header'
import Success from '../../../components/Success'
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

  const displayAmount = useFiat
    ? prettyAmount(toFiat(noteInfo.satoshis), undefined, config.fiat)
    : prettyAmount(noteInfo.satoshis, config)

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success headline='Note redeemed!' text={`${displayAmount} redeemed successfully`} />
      </Content>
    </>
  )
}
