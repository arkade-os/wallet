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
import { extractError } from '../../lib/error'
import { consoleError } from '../../lib/logs'
import { WalletContext } from '../../providers/wallet'
import CenterScreen from '../../components/CenterScreen'
import FingerprintIcon from '../../icons/Fingerprint'
import Text from '../../components/Text'

export default function InitPassword() {
  const { navigate } = useContext(NavigationContext)
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { updateWallet, wallet } = useContext(WalletContext)

  const [label, setLabel] = useState('')
  const [password, setPassword] = useState('')
  const [useBiometrics, setUseBiometrics] = useState(isBiometricsSupported())

  const connect = (p: string) => {
    setInitInfo({ ...initInfo, password: p })
    navigate(Pages.InitConnect)
  }

  useEffect(() => {
    if (!useBiometrics) return
    registerUser()
      .then((password) => {
        updateWallet({ ...wallet, lockedByBiometrics: true })
        connect(password)
      })
      .catch((err) => {
        consoleError(extractError(err), 'Biometric registration failed:')
        setUseBiometrics(false)
      })
  }, [useBiometrics])

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => connect(password)

  if (useBiometrics) {
    return (
      <>
        <Header text='Define password' back={handleCancel} />
        <CenterScreen>
          <FingerprintIcon />
          <Text centered small wrap>
            Use biometrics
          </Text>
        </CenterScreen>
        <ButtonsOnBottom>
          <Button onClick={() => setUseBiometrics(false)} label='Use password' secondary />
        </ButtonsOnBottom>
      </>
    )
  }

  return (
    <>
      <Header text='Define password' back={handleCancel} />
      <Content>
        <Padded>
          <form>
            <NewPassword handleProceed={handleProceed} onNewPassword={setPassword} setLabel={setLabel} />
          </form>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleProceed} label={label} disabled={!password} />
        {isBiometricsSupported() ? (
          <Button onClick={() => setUseBiometrics(true)} label='Use biometrics' secondary />
        ) : null}
      </ButtonsOnBottom>
    </>
  )
}
