import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import Error from '../../components/Error'
import { extractError } from '../../lib/error'
import InputPassword from '../../components/InputPassword'
import Header from '../../components/Header'
import { consoleError } from '../../lib/logs'
import FlexCol from '../../components/FlexCol'
import { authenticateUser } from '../../lib/biometrics'
import FingerprintIcon from '../../icons/Fingerprint'
import CenterScreen from '../../components/CenterScreen'
import Text from '../../components/Text'

export default function Unlock() {
  const { reloadWallet, unlockWallet, wallet, walletUnlocked } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  const getPasswordFromBiometrics = () => {
    authenticateUser()
      .then(setPassword)
      .catch(() => {})
  }

  useEffect(() => {
    if (!password) return
    unlockWallet(password)
      .then(reloadWallet)
      .catch(() => {})
  }, [password])

  useEffect(() => {
    if (!wallet.lockedByBiometrics || walletUnlocked) return
    getPasswordFromBiometrics()
  }, [wallet.lockedByBiometrics])

  const handleChange = (ev: any) => setPassword(ev.target.value)

  const handleUnlock = async () => {
    if (wallet.lockedByBiometrics) return getPasswordFromBiometrics()
    if (!password) return
    unlockWallet(password)
      .then(reloadWallet)
      .catch((err) => {
        consoleError(err, 'error unlocking wallet')
        setError(extractError(err))
      })
  }

  return (
    <>
      <Header text='Unlock' />
      <Content>
        <Padded>
          {wallet.lockedByBiometrics ? (
            <CenterScreen onClick={getPasswordFromBiometrics}>
              <FingerprintIcon />
              <Text centered small wrap>
                Unlock with biometrics
              </Text>
            </CenterScreen>
          ) : (
            <FlexCol gap='1rem'>
              <InputPassword focus label='Insert password' onChange={handleChange} onEnter={handleUnlock} />
              <Error error={Boolean(error)} text={error} />
            </FlexCol>
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleUnlock} label='Unlock' />
      </ButtonsOnBottom>
    </>
  )
}
