import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Header from './Header'
import FlexCol from '../../components/FlexCol'
import ArrowIcon from '../../icons/Arrow'
import { SettingsOptions, Themes } from '../../lib/types'
import { OptionsContext } from '../../providers/options'
import { hapticSubtle } from '../../lib/haptics'
import { getSettingsOptionLabel, useLanguage, useTranslation } from '../../providers/language'

export default function Display() {
  const { config, systemTheme } = useContext(ConfigContext)
  const { setOption } = useContext(OptionsContext)
  const { language } = useLanguage()
  const { t } = useTranslation()

  const Row = ({ option, value }: { option: SettingsOptions; value: string }) => (
    <button
      type='button'
      className='settings-row settings-row--value'
      onClick={() => {
        hapticSubtle()
        setOption(option)
      }}
    >
      <span className='settings-row__label'>{getSettingsOptionLabel(language, option)}</span>
      <span className='settings-row__side'>
        <span>{value}</span>
        <span className='settings-row__chevron' aria-hidden='true'>
          <ArrowIcon />
        </span>
      </span>
    </button>
  )

  return (
    <>
      <Header text={t('settings.display')} back />
      <Content>
        <Padded>
          <FlexCol gap='1rem' className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>{t('settings.preferences')}</p>
              <div className='settings-row-group'>
                <Row option={SettingsOptions.BitcoinUnit} value={config.unit} />
                <Row option={SettingsOptions.Haptics} value={config.haptics ? t('common.on') : t('common.off')} />
                <Row
                  option={SettingsOptions.Theme}
                  value={config.theme === Themes.Auto ? `${t('settings.auto')} (${systemTheme})` : config.theme}
                />
              </div>
            </section>
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
