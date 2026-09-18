import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import { BackupContext } from '../../providers/backup'
import Padded from '../../components/Padded'
import { notificationApiSupport, requestPermission, sendTestNotification } from '../../lib/notifications'
import Header from './Header'
import Content from '../../components/Content'
import Toggle from '../../components/Toggle'
import { useToast } from '../../components/Toast'
import { useTranslation } from '../../providers/language'

export default function Notifications() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)
  const { t } = useTranslation()

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

  const subText = notificationApiSupport ? t('settings.notificationsIntro') : t('settings.notificationsUnsupported')

  return (
    <>
      <Header text={t('settings.notifications')} back />
      <Content>
        <Padded>
          <Toggle
            subtext={subText}
            onClick={handleChange}
            text={t('settings.allowNotifications')}
            testId='toggle-notifications'
            checked={config.notifications}
          />
        </Padded>
      </Content>
    </>
  )
}
