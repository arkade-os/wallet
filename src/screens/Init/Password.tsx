import { useContext, useEffect, useState } from 'react'
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
import FingerprintIcon from '../../icons/Fingerprint'
import Text from '../../components/Text'
import Error from '../../components/Error'

export default function InitPassword() {
  const { navigate } = useContext(NavigationContext)
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { updateWallet, wallet } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [label, setLabel] = useState('')
  const [password, setPassword] = useState('')
  const [useBiometrics, setUseBiometrics] = useState(isBiometricsSupported())

  const connect = (p: string) => {
    setInitInfo({ ...initInfo, password: p })
    navigate(Pages.InitConnect)
  }

  useEffect(() => {
    setError('')
    if (!useBiometrics) return
    registerUser()
      .then((password) => {
        updateWallet({ ...wallet, lockedByBiometrics: true })
        connect(password)
      })
      .catch(() => setError('Biometric registration failed'))
  }, [useBiometrics])

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => connect(password)

  return (
    <>
      <Header text='Define password' back={handleCancel} />
      <Content>
        <Padded>
          <Error error={Boolean(error)} text={error} />
          {useBiometrics ? (
            <CenterScreen>
              <FingerprintIcon />
              <Text centered small wrap>
                Use biometrics
              </Text>
            </CenterScreen>
          ) : (
            <NewPassword handleProceed={handleProceed} onNewPassword={setPassword} setLabel={setLabel} />
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {useBiometrics ? (
          <Button onClick={() => setUseBiometrics(false)} label='Use password' secondary />
        ) : (
          <>
            <Button onClick={handleProceed} label={label} disabled={!password} />
            {isBiometricsSupported() ? (
              <Button onClick={() => setUseBiometrics(true)} label='Use biometrics' secondary />
            ) : null}
          </>
        )}
      </ButtonsOnBottom>
    </>
  )
}
