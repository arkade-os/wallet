import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfigContext } from '../../providers/config'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Header from './Header'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import ArrowIcon from '../../icons/Arrow'
import { SettingsOptions } from '../../lib/types'
import { OptionsContext } from '../../providers/options'
import Focusable from '../../components/Focusable'
import { supportedLanguages, SupportedLanguage } from '../../i18n'

export default function General() {
  const { t, i18n } = useTranslation()
  const { config } = useContext(ConfigContext)
  const { setOption } = useContext(OptionsContext)

  const getCurrentLanguageName = () => {
    const lang = i18n.language as SupportedLanguage
    return supportedLanguages[lang] || supportedLanguages[lang.split('-')[0] as SupportedLanguage] || 'English'
  }

  const Row = ({ option, value }: { option: SettingsOptions; value: string }) => (
    <Focusable onEnter={() => setOption(option)}>
      <FlexRow between padding='0.8rem 0' onClick={() => setOption(option)}>
        <Text capitalize thin>
          {t(option)}
        </Text>
        <FlexRow end>
          <Text small thin color='dark50'>
            {value}
          </Text>
          <ArrowIcon />
        </FlexRow>
      </FlexRow>
    </Focusable>
  )

  return (
    <>
      <Header text={t('general')} back />
      <Content>
        <Padded>
          <FlexCol gap='0'>
            <Row option={SettingsOptions.Language} value={getCurrentLanguageName()} />
            <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
            <Row option={SettingsOptions.Theme} value={config.theme} />
            <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
            <Row option={SettingsOptions.Fiat} value={config.fiat} />
            <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
            <Row option={SettingsOptions.Display} value={config.currencyDisplay} />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
