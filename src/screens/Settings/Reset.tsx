import { useContext, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { WalletContext } from '../../providers/wallet'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import ErrorMessage from '../../components/Error'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import Checkbox from '../../components/Checkbox'
import { consoleError } from '../../lib/logs'
import { WalletAlternativeIcon } from '../../icons/Wallet'
import CenterScreen from '../../components/CenterScreen'
import FlexCol from '../../components/FlexCol'
import { useTranslation } from '../../providers/language'

export default function Reset() {
  const { resetWallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const [disabled, setDisabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheck = () => {
    setDisabled(!disabled)
  }

  const handleReset = async () => {
    setError('')
    setLoading(true)
    try {
      await resetWallet()
      location.reload()
    } catch (err) {
      consoleError(err, 'error resetting wallet')
      // A fixed message: the underlying error can name stored payment data.
      setError(t('settings.resetFailed'))
      setLoading(false)
    }
  }

  return (
    <>
      <Header text={t('settings.resetWallet')} back />
      <Content>
        <Padded>
          <ErrorMessage error={Boolean(error)} text={error} />
          <CenterScreen>
            <WalletAlternativeIcon />
            <Text>{t('settings.didYouBackup')}</Text>
            <TextSecondary>{t('settings.cannotUndo')}</TextSecondary>
          </CenterScreen>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <FlexCol gap='0.5rem'>
          <Checkbox onChange={handleCheck} text={t('settings.iHaveBackedUp')} />
          <Button
            disabled={disabled || loading}
            label={t('settings.resetWallet')}
            onClick={handleReset}
            red
            loading={loading}
          />
        </FlexCol>
      </ButtonsOnBottom>
    </>
  )
}
