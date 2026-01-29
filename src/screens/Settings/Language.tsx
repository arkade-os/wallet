import { useTranslation } from 'react-i18next'
import Header from './Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import FlexCol from '../../components/FlexCol'
import Text from '../../components/Text'
import FlexRow from '../../components/FlexRow'
import CheckMarkIcon from '../../icons/CheckMark'
import Focusable from '../../components/Focusable'
import { supportedLanguages, SupportedLanguage } from '../../i18n'

export default function Language() {
  const { t, i18n } = useTranslation()

  const handleLanguageChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang)
  }

  const Row = ({ lang, name }: { lang: SupportedLanguage; name: string }) => {
    const isSelected = i18n.language === lang || (i18n.language.startsWith(lang) && !supportedLanguages[i18n.language as SupportedLanguage])
    return (
      <Focusable onEnter={() => handleLanguageChange(lang)}>
        <FlexRow between padding='0.8rem 0' onClick={() => handleLanguageChange(lang)}>
          <Text thin>{name}</Text>
          {isSelected ? <CheckMarkIcon small /> : null}
        </FlexRow>
      </Focusable>
    )
  }

  return (
    <>
      <Header text={t('language')} back />
      <Content>
        <Padded>
          <FlexCol gap='0'>
            {Object.entries(supportedLanguages).map(([lang, name]) => (
              <div key={lang}>
                <Row lang={lang as SupportedLanguage} name={name} />
                <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
              </div>
            ))}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
