import { useContext, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import Padded from '../../components/Padded'
import NewPassword from '../../components/NewPassword'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import Header from '../../components/Header'
import { authenticateUser, isBiometricsSupported, registerUser } from '../../lib/biometrics'
import { extractError } from '../../lib/error'
import { consoleError } from '../../lib/logs'
import { readHasPasskeyFromStorage } from '../../lib/storage'

export default function InitPassword() {
  const { navigate } = useContext(NavigationContext)
  const { initInfo, setInitInfo } = useContext(FlowContext)

  const [label, setLabel] = useState('')
  const [password, setPassword] = useState('')

  const connect = (p: string) => {
    setInitInfo({ ...initInfo, password: p })
    navigate(Pages.InitConnect)
  }

  const handleBiometric = () => {
    if (!isBiometricsSupported()) return
    const handler = readHasPasskeyFromStorage() ? authenticateUser : registerUser
    handler()
      .then(connect)
      .catch((err) => {
        consoleError(extractError(err), 'Biometric registration failed:')
      })
  }

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => connect(password)

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
        {isBiometricsSupported() ? <Button onClick={handleBiometric} label='Use biometric' secondary /> : null}
        <Button onClick={handleProceed} label={label} disabled={!password} />
        <Button onClick={handleCancel} label='Cancel' secondary />
      </ButtonsOnBottom>
    </>
  )
}
