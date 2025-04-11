import { useContext, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { WalletContext } from '../../providers/wallet'
import Padded from '../../components/Padded'
import { NavigationContext, Pages } from '../../providers/navigation'
import { extractError } from '../../lib/error'
import Content from '../../components/Content'
import Error from '../../components/Error'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import CenterScreen from '../../components/CenterScreen'
import { consoleError } from '../../lib/logs'

export default function Lock() {
  const { navigate } = useContext(NavigationContext)
  const { lockWallet } = useContext(WalletContext)

  const [error, setError] = useState('')

  const handleLock = async () => {
    lockWallet()
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
          <Error error={Boolean(error)} text={error} />
          <CenterScreen>
            <Text centered>Lock your wallet</Text>
            <TextSecondary centered>After locking you'll need to re-enter your password to unlock.</TextSecondary>
          </CenterScreen>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleLock} label='Lock Wallet' />
      </ButtonsOnBottom>
    </>
  )
}
