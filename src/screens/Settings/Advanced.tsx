import { useContext } from 'react'
import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsOptions, SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import { DevModeContext } from '../../providers/devMode'
import { AspContext } from '../../providers/asp'
import { isMainnet } from '../../lib/constants'
import { configuredLnurlServer } from '../../lib/receive/lnurlRail'
import Padded from '../../components/Padded'
import { useTranslation } from '../../providers/language'
import { WalletContext } from '../../providers/wallet'
import { isNativeWallet, supportsServerLnurl } from '../../lib/nativeWallet'
import NativePayments from '../../components/NativePayments'

export default function Advanced() {
  const { devMode } = useContext(DevModeContext)
  const { aspInfo } = useContext(AspContext)
  const { wallet } = useContext(WalletContext)
  const { t } = useTranslation()
  const rows = options
    .filter((o) => o.section === SettingsSections.Advanced)
    .filter((o) => o.option !== SettingsOptions.Contracts || devMode)
    .filter((o) => o.option !== SettingsOptions.Server || !isMainnet(aspInfo.network))
    .filter(
      (o) => o.option !== SettingsOptions.Lnurl || (Boolean(configuredLnurlServer()) && supportsServerLnurl(wallet)),
    )
    .filter((o) => o.option !== SettingsOptions.Password || !isNativeWallet(wallet))

  return (
    <>
      <Header text={t('settings.advanced')} back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.advanced')}</p>
              <Menu rows={rows} styled />
            </section>
            <NativePayments />
          </div>
        </Padded>
      </Content>
    </>
  )
}
