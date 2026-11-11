import { useContext, useState } from 'react'
import Text from './Text'
import ErrorMessage from './Error'
import Button from './Button'
import Padded from './Padded'
import Content from './Content'
import FlexCol from './FlexCol'
import CenterScreen from './CenterScreen'
import { consoleError } from '../lib/logs'
import InputPassword from './InputPassword'
import ButtonsOnBottom from './ButtonsOnBottom'
import { WalletContext } from '../providers/wallet'
import { authenticateUser } from '../lib/biometrics'
import LockIcon from '../icons/Lock'
import { useTranslation } from '../providers/language'

interface NeedsPasswordProps {
  error: string
  onPassword: (password: string) => void | Promise<void>
  /** Opens a wallet whose words come from its passkey; such a wallet has no password. */
  onPasskey?: () => void | Promise<void>
}

export default function NeedsPassword({ error, onPassword, onPasskey }: NeedsPasswordProps) {
  const { wallet } = useContext(WalletContext)
  const { t } = useTranslation()
  const [password, setPassword] = useState('')

  const usesPasskey = wallet.lockedByBiometrics || (wallet.passkeyPrf && onPasskey)
  const handleBiometrics = () =>
    wallet.passkeyPrf && onPasskey
      ? Promise.resolve(onPasskey()).catch(consoleError)
      : authenticateUser(wallet.passkeyId, wallet.passkeyRpId).then(onPassword).catch(consoleError)
  const handleChange = (ev: any) => setPassword(ev.target.value)
  const handleClick = () => onPassword(password)

  return (
    <>
      <Content>
        <Padded>
          {usesPasskey ? (
            <CenterScreen onClick={handleBiometrics}>
              <LockIcon big />
              <Text centered>{t('unlock.unlockWithPasskey')}</Text>
              <ErrorMessage text={error} error={Boolean(error)} />
            </CenterScreen>
          ) : (
            <FlexCol gap='1rem' testId='password'>
              <InputPassword
                focus
                label={t('unlock.insertPassword')}
                onChange={handleChange}
                onEnter={handleClick}
                placeholder={t('unlock.passwordPlaceholder')}
              />
              <ErrorMessage text={error} error={Boolean(error)} />
            </FlexCol>
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={usesPasskey ? handleBiometrics : handleClick} label={t('unlock.unlockWallet')} />
      </ButtonsOnBottom>
    </>
  )
}
