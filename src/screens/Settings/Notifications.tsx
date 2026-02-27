import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import Padded from '../../components/Padded'
import { notificationApiSupport, requestPermission, sendTestNotification } from '../../lib/notifications'
import Header from './Header'
import Content from '../../components/Content'
import Toggle from '../../components/Toggle'

export default function Notifications() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const handleChange = async () => {
    if (!notificationApiSupport) return
    if (!config.notifications) {
      requestPermission().then(async (notifications) => {
        const newConfig = { ...config, notifications }
        if (config.nostrBackup) await backupConfig(newConfig)
        if (notifications) sendTestNotification()
        updateConfig(newConfig)
      })
    } else {
      const newConfig = { ...config, notifications: false }
      if (config.nostrBackup) await backupConfig(newConfig)
      updateConfig(newConfig)
    }
  }

  const subText = notificationApiSupport
    ? "Get notified when an update is available or a payment is received. You'll need to grant permission if asked."
    : "Your browser does not support the Notifications API. If on iOS you'll need to 'Add to homescreen' and be running iOS 16.4 or higher."

  return (
    <>
      <Header text='Notifications' back />
      <Content>
        <Padded>
          <Toggle
            subtext={subText}
            onClick={handleChange}
            text='Allow notifications'
            testId='toggle-notifications'
            checked={config.notifications}
          />
        </Padded>
      </Content>
    </>
  )
}
