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
import { OnboardStaggerContainer, OnboardStaggerChild } from '../../components/OnboardLoadIn'
import { useTranslation } from '../../providers/language'

enum Method {
  Password = 'password',
  Biometrics = 'biometrics',
}

export default function InitPassword() {
  const { navigate } = useContext(NavigationContext)
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { updateWallet, wallet } = useContext(WalletContext)
  const { t } = useTranslation()

  const [label, setLabel] = useState('')
  const [method, setMethod] = useState<Method>(Method.Password)
  const [password, setPassword] = useState<string | null>(null)

  const registerUserBiometrics = () => {
    registerUser()
      .then(({ password, passkeyId }) => {
        updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
        setInitInfo({ ...initInfo, password, restoring: false })
        navigate(Pages.InitConnect)
      })
      .catch(consoleLog)
  }

  const handleContinue = () => {
    const pass = password ? password : defaultPassword
    setInitInfo({ ...initInfo, password: pass, restoring: false })
    navigate(Pages.InitConnect)
  }

  return (
    <>
      <Header text={t('init.createNewWallet')} back />
      <Content>
        <Padded>
          {method === Method.Biometrics ? (
            <CenterScreen onClick={registerUserBiometrics}>
              <OnboardStaggerContainer centered>
                <OnboardStaggerChild>
                  <LockIcon big />
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <Text big centered heading>
                    {t('init.createPasskey')}
                  </Text>
                </OnboardStaggerChild>
                <OnboardStaggerChild>
                  <Text centered color='neutral-500' small wrap>
                    {t('init.biometricsDescription')}
                  </Text>
                </OnboardStaggerChild>
              </OnboardStaggerContainer>
            </CenterScreen>
          ) : (
            <OnboardStaggerContainer>
              <OnboardStaggerChild>
                <NewPassword onNewPassword={setPassword} setLabel={setLabel} />
              </OnboardStaggerChild>
            </OnboardStaggerContainer>
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {method === Method.Password ? (
          <>
            <Button onClick={handleContinue} label={label} />
            {isBiometricsSupported() ? (
              <Button onClick={() => setMethod(Method.Biometrics)} label={t('init.useBiometrics')} secondary />
            ) : null}
          </>
        ) : (
          <Button onClick={() => setMethod(Method.Password)} label={t('init.usePassword')} secondary />
        )}
      </ButtonsOnBottom>
    </>
  )
}
