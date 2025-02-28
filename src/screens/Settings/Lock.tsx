import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { WalletContext } from '../../providers/wallet'
import Padded from '../../components/Padded'
import { NavigationContext, Pages } from '../../providers/navigation'
import { extractError } from '../../lib/error'
import Content from '../../components/Content'
import Error from '../../components/Error'
import InputPassword from '../../components/InputPassword'
import Header from './Header'
import FlexCol from '../../components/FlexCol'
import Text, { TextSecondary } from '../../components/Text'
import { authenticateUser } from '../../lib/biometrics'
import CenterScreen from '../../components/CenterScreen'
import FingerprintIcon from '../../icons/Fingerprint'
import { consoleError } from '../../lib/logs'

export default function Lock() {
  const { navigate } = useContext(NavigationContext)
  const { lockWallet, walletUnlocked, wallet } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  const getPasswordFromBiometrics = () => {
    authenticateUser()
      .then(setPassword)
      .catch(() => {})
  }

  useEffect(() => {
    if (!wallet.lockedByBiometrics || !walletUnlocked) return
    getPasswordFromBiometrics()
  }, [wallet.lockedByBiometrics])

  useEffect(() => {
    if (!password) return
    lockWallet(password)
      .then(() => navigate(Pages.Unlock))
      .catch(() => {})
  }, [password])

  const handleChange = (ev: any) => setPassword(ev.target.value)

  const handleLock = async () => {
    if (wallet.lockedByBiometrics) return getPasswordFromBiometrics()
    if (!password) return
    lockWallet(password)
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
          {wallet.lockedByBiometrics ? (
            <CenterScreen onClick={getPasswordFromBiometrics}>
              <FingerprintIcon />
              <Text centered small wrap>
                Lock with biometrics
              </Text>
            </CenterScreen>
          ) : (
            <FlexCol>
              <Error error={Boolean(error)} text={error} />
              <InputPassword label='Insert password' onChange={handleChange} />
              <TextSecondary>After locking you'll need to re-enter your password to unlock.</TextSecondary>
            </FlexCol>
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleLock} label='Lock Wallet' />
      </ButtonsOnBottom>
    </>
  )
}
