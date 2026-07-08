import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { WalletContext } from './wallet'
import { hasMnemonic } from '../lib/mnemonic'
import { hasPrfMnemonic } from '../lib/passkeyVault'
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

// Nudges the user to write down their recovery phrase once the balance is
// worth protecting. Cleared by the explicit "I've written it down"
// confirmation on the Backup screen (wallet.walletBackedUp).
export const NudgeProvider = ({ children }: { children: ReactNode }) => {
  const { balance, wallet } = useContext(WalletContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)

  const [dismissed, setDismissed] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)
  const [checkComplete, setCheckComplete] = useState(false)

  const isMnemonicWallet = hasMnemonic() || hasPrfMnemonic()

  const navigateToBackup = () => {
    setOption(SettingsOptions.Backup)
    navigate(Pages.Settings)
    setDismissed(true)
  }

  const dismissNudge = () => {
    setDismissed(true)
  }

  useEffect(() => {
    if (!wallet || !balance || dismissed || wallet.walletBackedUp) {
      setShouldShow(false)
      setCheckComplete(true)
      return
    }
    setShouldShow(balance > minSatsToNudge)
    setCheckComplete(true)
  }, [wallet, balance, dismissed])

  const nudgeVisible = Boolean(shouldShow && !dismissed)

  const nudge = (
    <DismissibleBanner
      id='backup-nudge'
      icon={<LogoIconAnimated />}
      title={isMnemonicWallet ? 'Back up your recovery phrase' : 'Back up your private key'}
      action={{ label: 'Back up now', onClick: navigateToBackup }}
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
