import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import FlexCol from '../../components/FlexCol'
import Padded from '../../components/Padded'
import { NavigationContext, Pages } from '@/providers/navigation'
import { useContext } from 'react'
import { useTranslation } from '../../providers/language'

export default function SettingsMenu() {
  const { navigate } = useContext(NavigationContext)
  const { t } = useTranslation()

  const displayRows = options.filter((o) => o.section === SettingsSections.General)
  const securityRows = options.filter((o) => o.section === SettingsSections.Security)

  return (
    <>
      <Header text={t('settings.title')} backFunc={() => navigate(Pages.Wallet)} />
      <Content>
        <Padded>
          <FlexCol gap='1.25rem' className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.general')}</p>
              <Menu rows={displayRows} styled />
            </section>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.security')}</p>
              <Menu rows={securityRows} styled />
            </section>
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
