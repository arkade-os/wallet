import { ReactNode, createContext, useState } from 'react'
import { SettingsOptions } from '../lib/types'
import { Pages, Tabs } from './navigation'

export type Nudge = {
  tabs: Tabs[]
  pages: Pages[]
  texts: string[]
  options: SettingsOptions[]
}

export const NudgeContext = createContext<{
  addNudge: (nudge: Nudge) => void
  removeNudge: (nudge: Nudge) => void
  tabHasNudge: (tab: Tabs) => Nudge | undefined
  pageHasNudge: (page: Pages) => Nudge | undefined
  optionHasNudge: (option: SettingsOptions) => Nudge | undefined
  addPasswordNudge: () => void
}>({
  addNudge: () => {},
  removeNudge: () => {},
  tabHasNudge: () => undefined,
  pageHasNudge: () => undefined,
  optionHasNudge: () => undefined,
  addPasswordNudge: () => {},
})

export const NudgeProvider = ({ children }: { children: ReactNode }) => {
  const [nudges, setNudges] = useState<Nudge[]>([])

  const flat = (nudge: Nudge) => JSON.stringify(nudge)

  const addNudge = (nudge: Nudge) => {
    setNudges((prev) => [...prev.filter((n) => flat(n) !== flat(nudge)), nudge])
  }

  const removeNudge = (nudge: Nudge) => {
    setNudges((prev) => prev.filter((n) => flat(n) !== flat(nudge)))
  }

  const tabHasNudge = (tab: Tabs) => nudges.find((n) => n.tabs.includes(tab))

  const pageHasNudge = (page: Pages) => nudges.find((n) => n.pages.includes(page))

  const optionHasNudge = (option: SettingsOptions) => nudges.find((n) => n.options.includes(option))

  const addPasswordNudge = () => {
    addNudge({
      options: [SettingsOptions.Advanced, SettingsOptions.Password],
      texts: [`Your wallet has more than 100,000 sats.`, `You should set a password for your wallet.`],
      pages: [Pages.Settings],
      tabs: [Tabs.Settings],
    })
  }

  return (
    <NudgeContext.Provider
      value={{ addPasswordNudge, addNudge, removeNudge, tabHasNudge, pageHasNudge, optionHasNudge }}
    >
      {children}
    </NudgeContext.Provider>
  )
}
