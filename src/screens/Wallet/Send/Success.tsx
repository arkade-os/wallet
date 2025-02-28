import { useContext, useEffect } from 'react'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Success from '../../../components/Success'
import BackToWalletButton from '../../../components/BackToWalletButton'
import { prettyNumber } from '../../../lib/format'
import { IframeContext } from '../../../providers/iframe'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'

export default function SendSuccess() {
  const { sendInfo } = useContext(FlowContext)
  const { iframeUrl, sendMessage } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)
  const { reloadWallet } = useContext(WalletContext)

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
      reloadWallet()
      navigate(Pages.Wallet)
    }
  }, [iframeUrl, sendInfo, sendMessage, navigate])

  if (iframeUrl) {
    return <></>
  }

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success text={`Payment of ${prettyNumber(sendInfo.total)} sats sent successfully`} />
      </Content>
      <ButtonsOnBottom>
        <BackToWalletButton />
      </ButtonsOnBottom>
    </>
  )
}
