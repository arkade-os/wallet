import { useContext, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import NeedsPassword from '../../components/NeedsPassword'
import Header from '../../components/Header'
import { NavigationContext, Pages } from '../../providers/navigation'

export default function Unlock() {
  const { navigate } = useContext(NavigationContext)
  const { unlockWallet } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const handleUnlock = async (password: string) => {
    setError('')
    setUnlocking(true)
    try {
      await unlockWallet(password)
      navigate(Pages.Wallet)
    } catch (err) {
      setUnlocking(false)
      if (err instanceof Error && err.message === 'Invalid password') {
        return setError('Invalid password')
      }
      consoleError(err, 'error unlocking wallet')
      setError('Connection failed. Please try again.')
    }
  }

  // While unlocking, render nothing — the boot animation from App.tsx
  // covers this loading state visually.
  if (unlocking) return null

  return (
    <>
      <Header text='Unlock' />
      <NeedsPassword error={error} onPassword={handleUnlock} />
    </>
  )
}
