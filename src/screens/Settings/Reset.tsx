import { useContext, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { WalletContext } from '../../providers/wallet'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
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

  const handleCheck = () => {
    setDisabled(!disabled)
  }

  const handleReset = async () => {
    setLoading(true)
    try {
      await resetWallet()
      location.reload()
    } catch (err) {
      consoleError(err)
      setLoading(false)
    }
  }

  return (
    <>
      <Header text={t('settings.resetWallet')} back />
      <Content>
        <Padded>
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
