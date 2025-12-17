import { useContext, useEffect, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import { getPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import NeedsPassword from '../../components/NeedsPassword'
import Header from '../../components/Header'
import { defaultPassword } from '../../lib/constants'
import Loading from '../../components/Loading'
import { clearStorage, readWalletFromStorage } from '../../lib/storage'
import { hexToBytes } from '@noble/hashes/utils.js'
import WarningBox from '../../components/Warning'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import CenterScreen from '../../components/CenterScreen'
import Button from '../../components/Button'

export default function Unlock() {
  const { initWallet, initReadonlyWallet } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [stage, setStage] = useState<'inital' | 'failed-publickey' | 'failed-privatekey'>('inital')

  useEffect(() => {
    const pass = password ? password : defaultPassword
    const walletFromStorage = readWalletFromStorage()
    if (walletFromStorage?.isReadonly && walletFromStorage.pubkey) {
      initReadonlyWallet(hexToBytes(walletFromStorage.pubkey))
        .then(() => navigate(Pages.Wallet))
        .catch((err) => {
          consoleError(err, 'error initializing readonly:wq wallet')
          setStage('failed-publickey')
        })
    } else {
      getPrivateKey(pass)
        .then(initWallet)
        .then(() => navigate(Pages.Wallet))
        .catch((err) => {
          setStage('failed-privatekey')
          if (password) {
            consoleError(err, 'error unlocking wallet')
            setError('Invalid password')
          }
        })
    }
  }, [password])

  const handleReset = () => {
    clearStorage().then(() => window.location.reload())
  }

  switch (stage) {
    case 'inital':
      return <Loading />
    case 'failed-privatekey':
      return (
        <>
          <Header text='Unlock' />
          <NeedsPassword error={error} onPassword={setPassword} />
        </>
      )
    case 'failed-publickey':
      return (
        <>
          <Header text='Unlock' />
          <Content>
            <Padded>
              <CenterScreen>
                <WarningBox red text='There was an error loading your readonly wallet.' />
                <Button label='Reset wallet' onClick={handleReset} />
              </CenterScreen>
            </Padded>
          </Content>
        </>
      )
  }
}
