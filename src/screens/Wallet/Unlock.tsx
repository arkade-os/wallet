import { useContext, useEffect, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import { getPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import NeedsPassword from '../../components/NeedsPassword'
import Header from '../../components/Header'
import { defaultPassword } from '../../lib/constants'
import Loading from '../../components/Loading'
import { readWalletFromStorage } from '../../lib/storage'
import { hexToBytes } from '@noble/hashes/utils.js'

export default function Unlock() {
  const { initWallet, initReadonlyWallet } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const pass = password ? password : defaultPassword
    const walletFromStorage = readWalletFromStorage()
    if (walletFromStorage?.isReadonly && walletFromStorage.pubkey) {
      initReadonlyWallet(hexToBytes(walletFromStorage.pubkey))
        .then(() => navigate(Pages.Wallet))
        .catch((err) => {
          setTried(true)
          consoleError(err, 'error initializing readonly:wq wallet')
          setError('There was an error loading your readonly wallet')
        })
    } else {
      getPrivateKey(pass)
        .then(initWallet)
        .then(() => navigate(Pages.Wallet))
        .catch((err) => {
          setTried(true)
          if (password) {
            consoleError(err, 'error unlocking wallet')
            setError('Invalid password')
          }
        })
    }
  }, [password])

  return tried ? (
    <>
      <Header text='Unlock' />
      <NeedsPassword error={error} onPassword={setPassword} />
    </>
  ) : (
    <Loading />
  )
}
