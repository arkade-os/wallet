import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import Padded from '../../components/Padded'
import Header from './Header'
import Content from '../../components/Content'
import Toggle from '../../components/Toggle'
import { useRuntime } from '../../runtime/RuntimeContext'

export default function Notifications() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)
  const runtime = useRuntime()
  const notificationsSupported = runtime.capabilities.notificationsSupported

  const handleChange = async () => {
    if (!notificationsSupported) return
    if (!config.notifications) {
      runtime.notifications.requestPermission().then(async (notifications) => {
        const newConfig = { ...config, notifications }
        if (config.nostrBackup) await backupConfig(newConfig)
        if (notifications) await runtime.notifications.send('Test notification', 'If you read this, everything is ok')
        updateConfig(newConfig)
      })
    } else {
      const newConfig = { ...config, notifications: false }
      if (config.nostrBackup) await backupConfig(newConfig)
      updateConfig(newConfig)
    }
  }

  const subText = notificationsSupported
    ? "Get notified when an update is available or a payment is received. You'll need to grant permission if asked."
    : runtime.kind === 'native-capacitor'
      ? 'Notifications are not available on this device.'
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
