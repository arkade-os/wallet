import { useContext, useEffect, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import { NavigationContext, Pages } from '../../providers/navigation'
import NeedsPassword from '../../components/NeedsPassword'
import Header from '../../components/Header'
import Loading from '../../components/Loading'

export default function Unlock() {
  const { dataReady, unlockWallet } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const handleUnlock = async (password: string) => {
    setError('')
    setUnlocking(true)
    try {
      await unlockWallet(password)
      setUnlocked(true)
    } catch (err) {
      if (err instanceof Error && err.message === 'Invalid password') {
        setUnlocking(false)
        setError('Invalid password')
        return
      }
      consoleError(err, 'error unlocking wallet')
    }
  }

  useEffect(() => {
    if (unlocked && dataReady) navigate(Pages.Wallet)
  }, [unlocked, dataReady, navigate])

  return unlocking ? (
    <Loading />
  ) : (
    <>
      <Header text='Unlock' />
      <NeedsPassword error={error} onPassword={handleUnlock} />
    </>
  )
}
