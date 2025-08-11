import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { WalletContext } from './wallet'
import { CreatePasswordWarning } from '../components/AlertBox'
import { noUserDefinedPassword } from '../lib/privateKey'
import { minSatsToNudge } from '../lib/constants'
import { NavigationContext, Pages } from './navigation'
import { OptionsContext } from './options'
import { SettingsOptions } from '../lib/types'

type NudgeContextProps = {
  close: () => void
  nudge: ReactNode
}

export const NudgeContext = createContext<NudgeContextProps>({
  close: () => {},
  nudge: null,
})

export const NudgeProvider = ({ children }: { children: ReactNode }) => {
  const { balance, wallet } = useContext(WalletContext)
  const { setOption } = useContext(OptionsContext)
  const { navigate } = useContext(NavigationContext)

  const [nudge, setNudge] = useState<ReactNode>(null)

  const navigateToSettings = () => {
    setOption(SettingsOptions.Password)
    navigate(Pages.Settings)
    close()
  }

  useEffect(() => {
    if (!wallet || !balance) return
    noUserDefinedPassword().then((noPassword) => {
      if (noPassword && balance > minSatsToNudge) {
        setNudge(<CreatePasswordWarning onClick={navigateToSettings} />)
      }
    })
  }, [wallet, balance])

  const close = () => {
    setNudge(null)
  }

  return <NudgeContext.Provider value={{ close, nudge }}>{children}</NudgeContext.Provider>
}
