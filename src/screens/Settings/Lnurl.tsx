import Header from './Header'
import { useContext } from 'react'
import Padded from '../../components/Padded'
import Toggle from '../../components/Toggle'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../providers/language'

export default function Lnurl() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)
  const { t } = useTranslation()

  const handleChange = async () => {
    backupAndUpdateConfig({ ...config, receiveViaLnurl: !config.receiveViaLnurl })
  }

  return (
    <>
      <Header text={t('settings.lightningAddress')} back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.receive')}</p>
              <Toggle
                checked={config.receiveViaLnurl}
                onClick={handleChange}
                text={t('settings.receiveViaLnurl')}
                subtext={t('settings.receiveViaLnurlSubtext')}
              />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
