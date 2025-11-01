import { useContext, useState } from 'react'
import { ConfigContext } from '../../providers/config'
import { NotificationsContext } from '../../providers/notifications'
import { WalletContext } from '../../providers/wallet'
import Padded from '../../components/Padded'
import { notificationApiSupport, requestPermission, sendTestNotification } from '../../lib/notifications'
import Header from './Header'
import Content from '../../components/Content'
import { TextSecondary } from '../../components/Text'
import Toggle from '../../components/Toggle'
import FlexCol from '../../components/FlexCol'

export default function Notifications() {
  const { config, updateConfig } = useContext(ConfigContext)
  const { pushSupported, pushSubscribed, subscribeToPush, unsubscribeFromPush } = useContext(NotificationsContext)
  const { svcWallet } = useContext(WalletContext)
  const [isPushLoading, setIsPushLoading] = useState(false)

  const handleChange = () => {
    if (!notificationApiSupport) return
    if (!config.notifications) {
      requestPermission().then((notifications) => {
        updateConfig({ ...config, notifications })
        if (notifications) sendTestNotification()
      })
    } else {
      updateConfig({ ...config, notifications: false })
    }
  }

  const handlePushToggle = async () => {
    if (!pushSupported || !svcWallet || isPushLoading) return

    setIsPushLoading(true)
    try {
      // Get wallet address - using the Ark address as identifier
      const walletAddress = await svcWallet.getAddress()

      if (pushSubscribed) {
        await unsubscribeFromPush(walletAddress)
      } else {
        // Request notification permission first if not granted
        if (Notification.permission !== 'granted') {
          const granted = await requestPermission()
          if (!granted) {
            setIsPushLoading(false)
            return
          }
        }
        await subscribeToPush(walletAddress)
      }
    } catch (error) {
      console.error('Failed to toggle push notifications:', error)
    }
    setIsPushLoading(false)
  }

  return (
    <>
      <Header text='Notifications' back />
      <Content>
        <Padded>
          <Toggle checked={config.notifications} onClick={handleChange} text='Allow notifications' />
          <FlexCol gap='0.5rem' margin='2rem 0 0 0'>
            {notificationApiSupport ? (
              <TextSecondary>
                Get notified when an update is available or a payment is received. You'll need to grant permission if
                asked.
              </TextSecondary>
            ) : (
              <>
                <TextSecondary>
                  Your browser does not support the Notifications API. If on iOS you'll need to 'Add to homescreen' and
                  be running iOS 16.4 or higher.
                </TextSecondary>
              </>
            )}
          </FlexCol>

          {/* Push Notifications Section */}
          {pushSupported && config.notifications && svcWallet ? (
            <>
              <FlexCol gap='0.5rem' margin='2rem 0 1rem 0'>
                <Toggle checked={pushSubscribed} onClick={handlePushToggle} text='Enable Push Notifications' />
              </FlexCol>
              <FlexCol gap='0.5rem' margin='0 0 1rem 0'>
                <TextSecondary>
                  Push notifications allow you to receive alerts even when the wallet is closed. You'll be notified when
                  Lightning payments are received.
                </TextSecondary>
                {pushSubscribed ? <TextSecondary>✓ Push notifications are active</TextSecondary> : null}
              </FlexCol>
            </>
          ) : null}
        </Padded>
      </Content>
    </>
  )
}
