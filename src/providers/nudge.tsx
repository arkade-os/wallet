import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { WalletContext } from './wallet'
import { hasMnemonic } from '../lib/mnemonic'
import { hasPasskeyWallet } from '../lib/passkeyVault'
import { minSatsToNudge } from '../lib/constants'
import { NavigationContext, Pages } from './navigation'
import { OptionsContext } from './options'
import { SettingsOptions } from '../lib/types'
import DismissibleBanner from '../components/DismissibleBanner'
import { LogoIconAnimated } from '../icons/Logo'

type NudgeContextProps = {
  nudge: ReactNode
  nudgeVisible: boolean
  nudgeCheckComplete: boolean
}

export const NudgeContext = createContext<NudgeContextProps>({
  nudge: null,
  nudgeVisible: false,
  nudgeCheckComplete: false,
})

// Two nudges, by priority:
// 1. Migrate: a wallet restored from seed is a recovery vehicle — move funds
//    to a fresh passkey wallet (any balance).
// 2. Backup: write down the recovery phrase once the balance is worth
//    protecting; passkey wallets nudge at any balance (no password fallback),
//    others above minSatsToNudge. Cleared by the explicit "I've written it
//    down" confirmation on the Backup screen (wallet.walletBackedUp).
export const NudgeProvider = ({ children }: { children: ReactNode }) => {
  const { balance, wallet } = useContext(WalletContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)

  const [dismissed, setDismissed] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)
  const [checkComplete, setCheckComplete] = useState(false)

  const isMnemonicWallet = hasMnemonic() || hasPasskeyWallet()
  const needsMigration = Boolean(wallet.restoredFromSeed) && !hasPasskeyWallet()

  const navigateToSettings = (option: SettingsOptions) => {
    setOption(option)
    navigate(Pages.Settings)
    setDismissed(true)
  }

  const dismissNudge = () => {
    setDismissed(true)
  }

  useEffect(() => {
    if (!wallet || !balance || dismissed) {
      setShouldShow(false)
      setCheckComplete(true)
      return
    }
    if (needsMigration) {
      setShouldShow(balance > 0)
      setCheckComplete(true)
      return
    }
    if (wallet.walletBackedUp) {
      setShouldShow(false)
      setCheckComplete(true)
      return
    }
    // Passkey wallets have no password fallback: if the passkey is lost, the
    // 12 words are the only way back, so prompt as soon as there are any funds.
    const threshold = hasPasskeyWallet() ? 0 : minSatsToNudge
    setShouldShow(balance > threshold)
    setCheckComplete(true)
  }, [wallet, balance, dismissed, needsMigration])

  const nudgeVisible = Boolean(shouldShow && !dismissed)

  const nudge = needsMigration ? (
    <DismissibleBanner
      id='migrate-nudge'
      icon={<LogoIconAnimated />}
      title='Move your funds to a passkey wallet'
      description='This wallet was restored from a seed. Create a fresh passkey wallet and move your funds to it.'
      action={{ label: 'Move now', onClick: () => navigateToSettings(SettingsOptions.Passkey) }}
      onDismiss={dismissNudge}
      visible={nudgeVisible}
    />
  ) : (
    <DismissibleBanner
      id='backup-nudge'
      icon={<LogoIconAnimated />}
      title={isMnemonicWallet ? 'Back up your recovery phrase' : 'Back up your private key'}
      action={{ label: 'Back up now', onClick: () => navigateToSettings(SettingsOptions.Backup) }}
      onDismiss={dismissNudge}
      visible={nudgeVisible}
    />
  )

  return (
    <NudgeContext.Provider value={{ nudge, nudgeVisible, nudgeCheckComplete: checkComplete }}>
      {children}
    </NudgeContext.Provider>
  )
}
