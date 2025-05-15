import { useContext, useEffect, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import { getPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import NeedsPassword from '../../components/NeedsPassword'
import Header from '../../components/Header'

export default function Unlock() {
  const { initWallet } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!password) return
    getPrivateKey(password)
      .then(initWallet)
      .then(() => navigate(Pages.Wallet))
      .catch((err) => {
        consoleError(err, 'error unlocking wallet')
        setError('Invalid password')
      })
  }, [password])

  return (
    <>
      <Header text='Unlock' />
      <NeedsPassword error={error} onPassword={setPassword} />
    </>
  )
}
