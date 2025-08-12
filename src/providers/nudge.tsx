import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { WalletContext } from './wallet'
import { CreatePasswordWarning } from '../components/AlertBox'
import { noUserDefinedPassword } from '../lib/privateKey'
import { minSatsToNudge } from '../lib/constants'
import { NavigationContext, Pages } from './navigation'
import { OptionsContext } from './options'
import { SettingsOptions } from '../lib/types'

type NudgeContextProps = {
  nudge: ReactNode
}

export const NudgeContext = createContext<NudgeContextProps>({
  nudge: null,
})

export const NudgeProvider = ({ children }: { children: ReactNode }) => {
  const { balance, wallet } = useContext(WalletContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)

  const [dismissed, setDismissed] = useState(false)
  const [nudge, setNudge] = useState<ReactNode>(null)

  // navigate to pages settings / advanced / change password
  const navigateToSettings = () => {
    setOption(SettingsOptions.Password)
    navigate(Pages.Settings)
    dismissNudge()
  }

  // close nudge
  const dismissNudge = () => {
    setDismissed(true)
    setNudge(null)
  }

  // nudge user when balance changes unless user already dismissed it
  useEffect(() => {
    if (!wallet || !balance || dismissed) return
    noUserDefinedPassword().then((noPassword) => {
      if (noPassword && balance > minSatsToNudge) {
        setNudge(<CreatePasswordWarning onClick={navigateToSettings} onDismiss={dismissNudge} />)
      }
    })
  }, [wallet, balance, dismissed])

  return <NudgeContext.Provider value={{ nudge }}>{children}</NudgeContext.Provider>
}
