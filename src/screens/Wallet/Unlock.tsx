import { useContext, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import NeedsPassword from '../../components/NeedsPassword'
import Header from '../../components/Header'
import { NavigationContext, Pages } from '../../providers/navigation'
import { useTranslation } from '../../providers/language'

export default function Unlock() {
  const { navigate } = useContext(NavigationContext)
  const { unlockWallet } = useContext(WalletContext)
  const { t } = useTranslation()

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
        return setError(t('unlock.invalidPassword'))
      }
      consoleError(err, 'error unlocking wallet')
      setError(t('unlock.connectionFailed'))
    }
  }

  // While unlocking, render nothing — the boot animation from App.tsx
  // covers this loading state visually.
  if (unlocking) return null

  return (
    <>
      <Header text={t('unlock.title')} />
      <NeedsPassword error={error} onPassword={handleUnlock} />
    </>
  )
}
