import { useContext, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import NewPassword from '../../components/NewPassword'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import Header from '../../components/Header'
import { isBiometricsSupported, registerUser } from '../../lib/biometrics'
import { WalletContext } from '../../providers/wallet'
import CenterScreen from '../../components/CenterScreen'
import Text from '../../components/Text'
import { consoleLog } from '../../lib/logs'
import { defaultPassword } from '../../lib/constants'
import LockIcon from '../../icons/Lock'

enum Method {
  Password = 'password',
  Biometrics = 'biometrics',
}

export default function InitPassword() {
  const { navigate } = useContext(NavigationContext)
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { updateWallet, wallet } = useContext(WalletContext)

  const [label, setLabel] = useState('')
  const [method, setMethod] = useState<Method>(Method.Password)
  const [password, setPassword] = useState<string | null>(null)

  const registerUserBiometrics = () => {
    registerUser()
      .then(({ password, passkeyId }) => {
        updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
        setInitInfo({ ...initInfo, password })
        navigate(Pages.InitSuccess)
      })
      .catch(consoleLog)
  }

  const handleCancel = () => navigate(Pages.Init)

  const handleContinue = () => {
    const pass = password ? password : defaultPassword
    setInitInfo({ ...initInfo, password: pass })
    navigate(Pages.InitSuccess)
  }

  return (
    <>
      <Header text='Create new wallet' back={handleCancel} />
      <Content>
        <Padded>
          {method === Method.Biometrics ? (
            <CenterScreen onClick={registerUserBiometrics}>
              <LockIcon big />
              <Text big centered heading>
                Create passkey
              </Text>
              <Text centered color='dark50' small wrap>
                This will allow you to log in easily through biometrics without a need to remember the password.
              </Text>
            </CenterScreen>
          ) : (
            <NewPassword onNewPassword={setPassword} setLabel={setLabel} />
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {method === Method.Password ? (
          <>
            <Button onClick={handleContinue} label={label} />
            {isBiometricsSupported() ? (
              <Button onClick={() => setMethod(Method.Biometrics)} label='Use biometrics' secondary />
            ) : null}
          </>
        ) : (
          <Button onClick={() => setMethod(Method.Password)} label='Use password' secondary />
        )}
      </ButtonsOnBottom>
    </>
  )
}
