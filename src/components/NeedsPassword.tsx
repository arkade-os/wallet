import { useContext, useState } from 'react'
import Text from './Text'
import Error from './Error'
import Button from './Button'
import Padded from './Padded'
import Content from './Content'
import FlexCol from './FlexCol'
import CenterScreen from './CenterScreen'
import { consoleError } from '../lib/logs'
import InputPassword from './InputPassword'
import ButtonsOnBottom from './ButtonsOnBottom'
import { WalletContext } from '../providers/wallet'
import { authenticateUser } from '../lib/biometrics'
import LockIcon from '../icons/Lock'

interface NeedsPasswordProps {
  error: string
  onPassword: (password: string) => void
}

export default function NeedsPassword({ error, onPassword }: NeedsPasswordProps) {
  const { wallet } = useContext(WalletContext)
  const [password, setPassword] = useState('')

  const handleBiometrics = () => {
    authenticateUser(wallet.passkeyId).then(onPassword).catch(consoleError)
  }

  const handleChange = (ev: any) => setPassword(ev.target.value)
  const handleClick = () => onPassword(password)

  return (
    <>
      <Content>
        <Padded>
          {wallet.lockedByBiometrics ? (
            <CenterScreen onClick={handleBiometrics}>
              <LockIcon big />
              <Text centered>Unlock with your passkey</Text>
            </CenterScreen>
          ) : (
            <FlexCol gap='1rem'>
              <InputPassword focus label='Insert password' onChange={handleChange} onEnter={handleClick} />
              <Error text={error} error={Boolean(error)} />
            </FlexCol>
          )}
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={wallet.lockedByBiometrics ? handleBiometrics : handleClick} label='Unlock wallet' />
      </ButtonsOnBottom>
    </>
  )
}
