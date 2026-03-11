import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { WalletContext } from './wallet'
import { noUserDefinedPassword } from '../lib/privateKey'
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

export const NudgeProvider = ({ children }: { children: ReactNode }) => {
  const { balance, wallet } = useContext(WalletContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)

  const [dismissed, setDismissed] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)
  const [checkComplete, setCheckComplete] = useState(false)

  const navigateToSettings = () => {
    setOption(SettingsOptions.Password)
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
    let cancelled = false
    setCheckComplete(false)
    noUserDefinedPassword()
      .then((noPassword) => {
        if (!cancelled) {
          setShouldShow(noPassword && balance > minSatsToNudge)
        }
      })
      .catch(() => {
        if (!cancelled) setShouldShow(false)
      })
      .finally(() => {
        if (!cancelled) setCheckComplete(true)
      })
    return () => {
      cancelled = true
    }
  }, [wallet, balance, dismissed])

  const nudgeVisible = Boolean(shouldShow && !dismissed)

  const nudge = (
    <DismissibleBanner
      id='password-nudge'
      icon={<LogoIconAnimated />}
      title='Protect your wallet with a password'
      action={{ label: 'Set password', onClick: navigateToSettings }}
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
