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

  useEffect(() => {
    if (!password) return
    unlockWallet(password)
      .then(reloadWallet)
      .catch(() => {})
  }, [password])

  useEffect(() => {
    if (!wallet.lockedByBiometrics || walletUnlocked) return
    authenticateUser()
      .then(setPassword)
      .catch(() => {})
  }, [wallet.lockedByBiometrics])

  const handleChange = (ev: Event) => {
    setPassword((ev.target as HTMLInputElement).value)
  }

  const handleUnlock = async () => {
    if (!password) return
    unlockWallet(password)
      .then(reloadWallet)
      .catch((err) => {
        consoleError(err, 'error unlocking wallet')
        setError(extractError(err))
      })
  }

  if (wallet.lockedByBiometrics)
    return (
      <>
        <Header text='Unlock' />
        <CenterScreen>
          <FingerprintIcon />
          <Text centered small wrap>
            Unlocking with biometrics
          </Text>
        </CenterScreen>
      </>
    )

  return (
    <>
      <Header text='Unlock' />
      <Content>
        <Padded>
          <form>
            <FlexCol gap='1rem'>
              <InputPassword focus label='Insert password' onChange={handleChange} />
              <Error error={Boolean(error)} text={error} />
            </FlexCol>
          </form>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleUnlock} label='Unlock' />
      </ButtonsOnBottom>
    </>
  )
}
