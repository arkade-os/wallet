import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { WalletContext } from '../../providers/wallet'
import Padded from '../../components/Padded'
import { NavigationContext, Pages } from '../../providers/navigation'
import { extractError } from '../../lib/error'
import Content from '../../components/Content'
import ErrorMessage from '../../components/Error'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import CenterScreen from '../../components/CenterScreen'
import { consoleError } from '../../lib/logs'
import LockIcon from '../../icons/Lock'
import { noUserDefinedPassword } from '../../lib/privateKey'
import { OptionsContext } from '../../providers/options'
import { SettingsOptions } from '../../lib/types'
import { useTranslation } from '../../providers/language'

export default function Lock() {
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)
  const { lockWallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const [error, setError] = useState('')
  const [noPassword, setNoPassword] = useState(true)

  useEffect(() => {
    noUserDefinedPassword().then(setNoPassword)
  }, [])

  const handleSetPassword = () => {
    setOption(SettingsOptions.Password)
  }

  const handleLock = async () => {
    lockWallet()
      .then(() => navigate(Pages.Unlock))
      .catch((err) => {
        consoleError(err, 'error locking wallet')
        setError(extractError(err))
      })
  }

  return (
    <>
      <Header text={t('settings.lock')} back />
      <Content>
        <Padded>
          <ErrorMessage error={Boolean(error)} text={error} />
          <CenterScreen>
            <LockIcon big />
            <Text centered>{noPassword ? t('settings.noPasswordDefined') : t('settings.lockYourWallet')}</Text>
            <TextSecondary centered>
              {noPassword ? t('settings.setPasswordToLock') : t('settings.lockExplanation')}
            </TextSecondary>
          </CenterScreen>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {noPassword ? (
          <Button onClick={handleSetPassword} label={t('settings.setPassword')} />
        ) : (
          <Button onClick={handleLock} label={t('settings.lockWallet')} />
        )}
      </ButtonsOnBottom>
    </>
  )
}
