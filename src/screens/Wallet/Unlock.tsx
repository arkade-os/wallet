import { useContext, useEffect, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import { getPrivateKey } from '../../lib/privateKey'
import { NavigationContext, Pages } from '../../providers/navigation'
import NeedsPassword from '../../components/NeedsPassword'
import Header from '../../components/Header'
import { defaultPassword } from '../../lib/constants'
import Loading from '../../components/Loading'

export default function Unlock() {
  const { initWallet, dataReady } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [tried, setTried] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    const pass = password ? password : defaultPassword
    getPrivateKey(pass)
      .then(initWallet)
      .then(() => setUnlocked(true))
      .catch((err) => {
        setTried(true)
        if (password) {
          consoleError(err, 'error unlocking wallet')
          setError('Invalid password')
        }
      })
  }, [password])

  useEffect(() => {
    if (unlocked && dataReady) navigate(Pages.Wallet)
  }, [unlocked, dataReady])

  return tried ? (
    <>
      <Header text='Unlock' />
      <NeedsPassword error={error} onPassword={setPassword} />
    </>
  ) : (
    <Loading />
  )
}
