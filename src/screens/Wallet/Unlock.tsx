import { useContext, useState } from 'react'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'
import NeedsPassword from '../../components/NeedsPassword'
import Header from '../../components/Header'
import { NavigationContext, Pages } from '../../providers/navigation'
import { useTranslation } from '../../providers/language'
import { isNativeWallet } from '../../lib/nativeWallet'
import { isNativeHost } from '../../lib/nativeBridge'
import Button from '../../components/Button'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Text from '../../components/Text'
import ErrorMessage from '../../components/Error'

export default function Unlock() {
  const { navigate } = useContext(NavigationContext)
  const { unlockWallet, wallet } = useContext(WalletContext)
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
      if (isNativeWallet(wallet)) {
        setError(err instanceof Error ? err.message : 'Unable to open your wallet.')
        return
      }
      consoleError(err, 'error unlocking wallet')
      setError(t('unlock.connectionFailed'))
    }
  }

  // While unlocking, render nothing — the boot animation from App.tsx
  // covers this loading state visually.
  if (isNativeWallet(wallet))
    return (
      <>
        <Header text='Open your wallet' />
        <Content>
          <Padded>
            <Text wrap>View your balances, history and receive addresses without connecting the card.</Text>
            <Text color='neutral-600' wrap>
              {isNativeHost()
                ? 'Your Satochip and its PIN are only needed when you want to sign.'
                : 'Open this wallet in the Arkade native app to view your wallet.'}
            </Text>
            <ErrorMessage error={Boolean(error)} text={error} />
            <Button
              disabled={unlocking || !isNativeHost()}
              loading={unlocking}
              label={unlocking ? 'Opening wallet…' : 'Open wallet'}
              onClick={() => handleUnlock('')}
            />
          </Padded>
        </Content>
      </>
    )

  if (unlocking) return null

  return (
    <>
      <Header text={t('unlock.title')} />
      <NeedsPassword error={error} onPassword={handleUnlock} />
    </>
  )
}
