import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import { BackupContext } from '../../providers/backup'
import Padded from '../../components/Padded'
import { notificationApiSupport, requestPermission, sendTestNotification } from '../../lib/notifications'
import Header from './Header'
import Content from '../../components/Content'
import Toggle from '../../components/Toggle'
import { useToast } from '../../components/Toast'

export default function Notifications() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)

  const { toast } = useToast()

  const handleChange = async () => {
    if (config.notifications) {
      backupAndUpdateConfig({ ...config, notifications: false })
      return
    }

    if (!notificationApiSupport) {
      toast('Notifications API not supported')
      return
    }

    requestPermission().then((notifications) => {
      if (notifications) sendTestNotification()
      else toast('Notifications permission denied')
      backupAndUpdateConfig({ ...config, notifications })
    })
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
