import { useContext, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import NeedsPassword from '../../components/NeedsPassword'
import NeedsPasskey from '../../components/NeedsPasskey'
import Header from '../../components/Header'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hasPasskeyWallet } from '../../lib/passkeyVault'
import { hasMnemonic } from '../../lib/mnemonic'
import { hasPrivateKey } from '../../lib/privateKey'
import { clearStorage } from '../../lib/storage'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import CenterScreen from '../../components/CenterScreen'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Button from '../../components/Button'
import Text, { TextSecondary } from '../../components/Text'
import LockIcon from '../../icons/Lock'

export default function Unlock() {
  const { navigate } = useContext(NavigationContext)
  const { unlockWallet, unlockWalletWithPasskey } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const usesPasskey = hasPasskeyWallet()
  // A stored wallet whose secret is in none of the known stores can't be
  // unlocked here (e.g. created by an older build, or storage partially wiped).
  // Show an honest recovery path instead of an impossible password prompt.
  const hasUsableSecret = usesPasskey || hasMnemonic() || hasPrivateKey()

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

  const handleUnlockWithPasskey = async () => {
    await unlockWalletWithPasskey()
    navigate(Pages.Wallet)
  }

  const resetOrphanedWallet = async () => {
    // clear localStorage (keeps app config) and IndexedDB so the next boot starts
    // clean at onboarding — create fresh or restore with the 12 words. Without the
    // IndexedDB wipe a new wallet could inherit the orphaned wallet's VTXO state.
    try {
      await clearStorage()
      if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
        const dbs = await indexedDB.databases()
        await Promise.all(dbs.map((db) => (db.name ? indexedDB.deleteDatabase(db.name) : undefined)))
      }
    } catch (err) {
      consoleError(err, 'error resetting orphaned wallet')
    } finally {
      window.location.reload()
    }
  }

  // While unlocking, render nothing — the boot animation from App.tsx
  // covers this loading state visually.
  if (unlocking) return null

  if (!hasUsableSecret) {
    return (
      <>
        <Header text='Unlock' />
        <Content>
          <Padded>
            <CenterScreen>
              <LockIcon big />
              <Text centered>This wallet can't be unlocked here</Text>
              <TextSecondary centered wrap>
                Its keys aren't stored in this browser — it may have been created on another device or an older version.
                If you saved your 12-word recovery phrase, reset and restore it. Otherwise reset to start a new wallet.
              </TextSecondary>
            </CenterScreen>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button onClick={resetOrphanedWallet} label='Reset and start over' />
        </ButtonsOnBottom>
      </>
    )
  }

  return (
    <>
      <Header text='Unlock' />
      {usesPasskey ? (
        <NeedsPasskey onUnlock={handleUnlockWithPasskey} />
      ) : (
        <NeedsPassword error={error} onPassword={handleUnlock} />
      )}
    </>
  )
}
