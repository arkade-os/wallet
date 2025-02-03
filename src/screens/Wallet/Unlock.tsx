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
import { authenticateUser, isBiometricsSupported } from '../../lib/biometrics'

export default function Unlock() {
  const { reloadWallet, unlockWallet } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!password) return
    unlockWallet(password)
      .then(reloadWallet)
      .catch(() => {})
  }, [password])

  const handleBiometric = async () => {
    setPassword(await authenticateUser())
  }

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
        {isBiometricsSupported() ? <Button onClick={handleBiometric} label='Use biometric' secondary /> : null}
        <Button onClick={handleUnlock} label='Unlock' />
      </ButtonsOnBottom>
    </>
  )
}
