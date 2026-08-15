import Header from './Header'
import { useContext } from 'react'
import Padded from '../../components/Padded'
import Toggle from '../../components/Toggle'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../providers/language'

export default function Haptics() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)
  const { t } = useTranslation()

  const handleChange = async () => {
    backupAndUpdateConfig({ ...config, haptics: !config.haptics })
  }

  return (
    <>
      <Header text={t('settings.hapticFeedback')} back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.feedback')}</p>
              <Toggle
                checked={config.haptics}
                onClick={handleChange}
                text={t('settings.hapticFeedback')}
                subtext={t('settings.hapticSubtext')}
              />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
