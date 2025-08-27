import Header from './Header'
import ErrorMessage from '../../components/Error'
import { consoleLog } from '../../lib/logs'
import Button from '../../components/Button'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import Success from '../../components/Success'
import { defaultPassword } from '../../lib/constants'
import { WalletContext } from '../../providers/wallet'
import NewPassword from '../../components/NewPassword'
import { useContext, useEffect, useState } from 'react'
import NeedsPassword from '../../components/NeedsPassword'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { isBiometricsSupported, registerUser } from '../../lib/biometrics'
import { getPrivateKey, isValidPassword, noUserDefinedPassword, setPrivateKey } from '../../lib/privateKey'

export default function Password() {
  const { updateWallet, wallet } = useContext(WalletContext)

  const [authenticated, setAuthenticated] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [successText, setSuccessText] = useState('')
  const [error, setError] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    noUserDefinedPassword().then((noPassword) => {
      if (noPassword) setOldPassword(defaultPassword)
    })
  }, [])

  useEffect(() => {
    if (!oldPassword) return
    isValidPassword(oldPassword).then((isValid) => {
      setError(isValid ? '' : 'Invalid password')
      setAuthenticated(isValid)
    })
  }, [oldPassword])

  const saveNewPassword = async (nextPassword: string | null, biometrics: boolean) => {
    if (!oldPassword || nextPassword === null || !authenticated) return
    const finalPassword = nextPassword === '' ? defaultPassword : nextPassword
    const privateKey = await getPrivateKey(oldPassword) // per flow, this should succeed post-auth
    try {
      setSaving(true)
      await setPrivateKey(privateKey, finalPassword)
      setSuccessText(
        biometrics
          ? 'Password changed to biometrics'
          : finalPassword === defaultPassword
          ? 'Password removed'
          : 'Password changed',
      )
    } catch {
      setError('Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const registerUserBiometrics = () => {
    registerUser()
      .then(({ password, passkeyId }) => {
        updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
        saveNewPassword(password, true)
      })
      .catch(consoleLog)
  }

  const handleContinue = async () => {
    await saveNewPassword(newPassword, false)
    updateWallet({ ...wallet, lockedByBiometrics: false })
  }

  if (!authenticated && !successText) return <NeedsPassword error={error} onPassword={setOldPassword} />

  return (
    <>
      <Header text='Change password' back />
      <Content>
        {successText ? (
          <Success headline='Success' text={successText} />
        ) : (
          <Padded>
            <ErrorMessage text={error} error={Boolean(error)} />
            <NewPassword onNewPassword={setNewPassword} setLabel={setLabel} />
          </Padded>
        )}
      </Content>
      {successText ? null : (
        <ButtonsOnBottom>
          <Button onClick={handleContinue} label={label} disabled={newPassword === null || saving} loading={saving} />
          {wallet.lockedByBiometrics || !isBiometricsSupported() ? null : (
            <Button onClick={registerUserBiometrics} label='Use biometrics' secondary />
          )}
        </ButtonsOnBottom>
      )}
    </>
  )
}
