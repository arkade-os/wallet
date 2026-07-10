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
import { hasPasskeyWallet } from '../../lib/passkeyVault'
import { OptionsContext } from '../../providers/options'
import { SettingsOptions } from '../../lib/types'

export default function Lock() {
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)
  const { lockWallet } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [noPassword, setNoPassword] = useState(true)

  const usesPasskey = hasPasskeyWallet()

  useEffect(() => {
    if (usesPasskey) return setNoPassword(false) // passkey wallets can always lock
    noUserDefinedPassword().then(setNoPassword)
  }, [])

  const handleSetPassword = () => {
    setOption(SettingsOptions.Password)
  }

  const handleUsePasskey = () => {
    setOption(SettingsOptions.Passkey)
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
      <Header text='Lock' back />
      <Content>
        <Padded>
          <ErrorMessage error={Boolean(error)} text={error} />
          <CenterScreen>
            <LockIcon big />
            <Text centered>{noPassword ? 'Wallet not protected' : 'Lock your wallet'}</Text>
            <TextSecondary centered>
              {noPassword
                ? 'Secure your wallet with a passkey (recommended) or a password to be able to lock it.'
                : usesPasskey
                  ? "After locking you'll need your passkey to unlock."
                  : "After locking you'll need to re-enter your password to unlock."}
            </TextSecondary>
          </CenterScreen>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {noPassword ? (
          <>
            <Button onClick={handleUsePasskey} label='Use a passkey' />
            <Button onClick={handleSetPassword} label='Set Password' secondary />
          </>
        ) : (
          <Button onClick={handleLock} label='Lock Wallet' />
        )}
      </ButtonsOnBottom>
    </>
  )
}
