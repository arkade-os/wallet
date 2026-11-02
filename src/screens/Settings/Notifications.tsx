import { useContext, useEffect, useRef, useState } from 'react'
import { ConfigContext } from '../../providers/config'
import { BackupContext } from '../../providers/backup'
import Padded from '../../components/Padded'
import { notificationApiSupport, requestPermission, sendTestNotification } from '../../lib/notifications'
import Header from './Header'
import Content from '../../components/Content'
import Toggle from '../../components/Toggle'
import { useToast } from '../../components/Toast'
import { useTranslation } from '../../providers/language'
import { isNativeAndroid, isNativeIOS } from '../../lib/nativePlatform'
import { isNativeHost } from '../../lib/nativeBridge'
import { configureNativeBackground, getNativeBackgroundStatus, type BackgroundStatus } from '../../lib/nativeBackground'
import { WalletContext } from '../../providers/wallet'

export default function Notifications() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)
  const { wallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const { toast } = useToast()
  const [background, setBackground] = useState<BackgroundStatus>()
  const changing = useRef(false)
  const permissionCheck = useRef(0)
  const native = isNativeAndroid()
  const enabled = config.notifications && (!native || background?.permissionGranted !== false)

  useEffect(() => {
    if (!native) return
    let active = true
    const refresh = () => {
      if (changing.current) return
      const check = ++permissionCheck.current
      void getNativeBackgroundStatus()
        .then((status) => {
          if (active && !changing.current && check === permissionCheck.current) setBackground(status)
        })
        .catch(() => undefined)
    }
    refresh()
    window.addEventListener('arkade-native-resumed', refresh)
    return () => {
      active = false
      window.removeEventListener('arkade-native-resumed', refresh)
    }
  }, [native])

  const handleChange = async () => {
    if (changing.current) return
    changing.current = true
    permissionCheck.current++
    try {
      if (enabled) {
        const status = await configureNativeBackground(false, 0)
        if (native) setBackground(status)
        backupAndUpdateConfig({ ...config, notifications: false })
        return
      }
      if (!notificationApiSupport) {
        toast(t('notifications.apiNotSupported'))
        return
      }
      const permission = await requestPermission()
      const status = await configureNativeBackground(permission, wallet.nextRollover)
      if (native) setBackground(status)
      const notifications = permission && (!native || status?.permissionGranted === true)
      if (notifications) sendTestNotification()
      else if (permission && native) toast('Enable Wallet reminders in Android notification settings.')
      else toast(t('notifications.permissionDenied'))
      backupAndUpdateConfig({ ...config, notifications })
    } catch {
      toast(t('notifications.permissionDenied'))
    } finally {
      changing.current = false
    }
  }

  const subText = native
    ? 'Get wallet activity updates and reminders before known coin expiry. Android may delay reminders; open Arkade to renew.'
    : isNativeIOS()
      ? 'Get wallet activity notifications while Arkade is open. Background expiry reminders are not available on iPhone yet.'
      : isNativeHost()
        ? 'Get wallet activity notifications while Arkade is open. Background expiry reminders are not available on desktop.'
        : notificationApiSupport
          ? t('settings.notificationsIntro')
          : t('settings.notificationsUnsupported')

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
            checked={enabled}
          />
          {native && background?.permissionGranted === false ? (
            <p role='status' className='mt-3 text-sm text-neutral-600'>
              Allow Arkade notifications and Wallet reminders in Android Settings → Apps → Arkade → Notifications.
            </p>
          ) : null}
        </Padded>
      </Content>
    </>
  )
}
