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
import Text from '../../components/Text'
import { consoleLog } from '../../lib/logs'
import PasskeyIcon from '../../icons/Passkey'
import SheetModal from '../../components/SheetModal'
import FlexCol from '../../components/FlexCol'
import SuccessIcon from '../../icons/Success'

export default function InitPassword() {
  const { navigate } = useContext(NavigationContext)
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { updateWallet, wallet } = useContext(WalletContext)

  const [label, setLabel] = useState('')
  const [password, setPassword] = useState('')
  const [showSheet, setShowSheet] = useState(false)

  const registerUserBiometrics = () => {
    registerUser()
      .then(({ password, passkeyId }) => {
        updateWallet({ ...wallet, lockedByBiometrics: true, passkeyId })
        setInitInfo({ ...initInfo, password })
        setShowSheet(true)
      })
      .catch(consoleLog)
  }

  useEffect(() => {
    if (isBiometricsSupported()) registerUserBiometrics()
  }, [isBiometricsSupported()])

  const handleCancel = () => navigate(Pages.Init)

  const handleContinue = () => {
    setInitInfo({ ...initInfo, password })
    setShowSheet(true)
  }

  const usingBiometrics = isBiometricsSupported()

  return (
    <>
      <Header text='Define password' back={handleCancel} />
      <Content>
        <Padded>
          {usingBiometrics ? (
            <CenterScreen onClick={registerUserBiometrics}>
              <PasskeyIcon />
              <Text big centered>
                Create passkey
              </Text>
              <Text centered color='dark50' small wrap>
                This will allow you to log in easily through biometrics without a need to remember username or password.
              </Text>
            </CenterScreen>
          ) : (
            <NewPassword onNewPassword={setPassword} setLabel={setLabel} />
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {usingBiometrics ? (
          <Button onClick={registerUserBiometrics} label='Create passkey' />
        ) : (
          <Button onClick={handleContinue} label={label} disabled={!password} />
        )}
      </ButtonsOnBottom>
      <SheetModal isOpen={showSheet} onClose={() => setShowSheet(false)}>
        <FlexCol centered>
          <SuccessIcon small />
          <FlexCol gap='0.5rem' centered>
            <Text bold>Wallet created</Text>
            <Text small>Your wallet is ready for use!</Text>
            <Text color='dark50' small>
              {usingBiometrics
                ? 'Use your biometrics saved as a passkey for easy login.'
                : "You'll need your password to login."}
            </Text>
          </FlexCol>
          <div style={{ width: '100%' }}>
            <Button onClick={() => navigate(Pages.InitConnect)} label='Continue' />
          </div>
        </FlexCol>
      </SheetModal>
    </>
  )
}
