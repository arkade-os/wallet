import { useContext } from 'react'
import { Language } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'
import { BackupContext } from '@/providers/backup'
import { useTranslation } from '../../providers/language'

export default function LanguageSettings() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)
  const { t } = useTranslation()

  const handleChange = async (language: string) => {
    backupAndUpdateConfig({ ...config, language: language as Language })
  }

  return (
    <>
      <Header text={t('settings.language')} back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.language')}</p>
              <Select
                onChange={handleChange}
                options={[Language.English, Language.Spanish]}
                labels={[t('settings.english'), t('settings.spanish')]}
                selected={config.language ?? Language.English}
              />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
