import { useContext } from 'react'
import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsOptions, SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import Toggle from '../../components/Toggle'
import { ConfigContext } from '../../providers/config'
import { BackupContext } from '../../providers/backup'
import { DevModeContext } from '../../providers/devMode'
import { AspContext } from '../../providers/asp'
import { isMainnet } from '../../lib/constants'
import Padded from '../../components/Padded'
import { useTranslation } from '../../providers/language'

export default function Advanced() {
  const { config } = useContext(ConfigContext)
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { devMode } = useContext(DevModeContext)
  const { aspInfo } = useContext(AspContext)
  const { t } = useTranslation()
  const rows = options
    .filter((o) => o.section === SettingsSections.Advanced)
    .filter((o) => o.option !== SettingsOptions.Contracts || devMode)
    .filter((o) => o.option !== SettingsOptions.Server || !isMainnet(aspInfo.network))

  return (
    <>
      <Header text={t('settings.advanced')} back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.advanced')}</p>
              <Menu rows={rows} styled />
              <Toggle
                checked={config.autoClaimFreeTaxi !== false}
                onClick={() =>
                  backupAndUpdateConfig({ ...config, autoClaimFreeTaxi: config.autoClaimFreeTaxi === false })
                }
                text={t('settings.autoClaimFreeTaxi')}
                subtext={t('settings.autoClaimFreeTaxiSubtext')}
                testId='toggle-auto-claim-free-taxi'
              />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
