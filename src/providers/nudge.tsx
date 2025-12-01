import { ReactNode, createContext, useState } from 'react'
import { Pages, Tabs } from './navigation'
import { SettingsOptions } from '../lib/types'
import { minSatsToNudge } from '../lib/constants'

export type Nudge = {
  options: SettingsOptions[]
  pages: Pages[]
  tabs: Tabs[]
  texts: string[]
}

export const NudgeContext = createContext<{
  nudges: Record<string, Nudge[]>
  addNudge: (nudge: Nudge) => void
  addPasswordNudge: () => void
  removeNudge: (nudge: Nudge) => void
}>({
  nudges: {},
  addNudge: () => null,
  addPasswordNudge: () => null,
  removeNudge: () => null,
})

export const NudgeProvider = ({ children }: { children: ReactNode }) => {
  const [repo, setRepo] = useState<Nudge[]>([])
  const [nudges, setNudges] = useState<Record<string, Nudge[]>>({})

  const flat = (nudge: Nudge) => JSON.stringify(nudge)

  const updateNudges = (repo: Nudge[]) => {
    const map: Record<string, Nudge[]> = {}
    repo.forEach((nudge) => {
      nudge.options.forEach((option) => (map[option] = [...(map[option] || []), nudge]))
      nudge.pages.forEach((page) => (map[page] = [...(map[page] || []), nudge]))
      nudge.tabs.forEach((tab) => (map[tab] = [...(map[tab] || []), nudge]))
    })
    setNudges(map)
  }

  const addNudge = (nudge: Nudge) => {
    if (repo.find((n) => flat(n) === flat(nudge))) return // already exists
    updateNudges([...repo, nudge])
    setRepo([...repo, nudge])
  }

  const addPasswordNudge = () => {
    const passwordNudge: Nudge = {
      options: [SettingsOptions.Advanced, SettingsOptions.Password],
      texts: [`Your wallet has more than ${minSatsToNudge} sats.`, `You should set a password for your wallet.`],
      pages: [Pages.Settings],
      tabs: [Tabs.Settings],
    }
    addNudge(passwordNudge)
  }

  const removeNudge = (nudge: Nudge) => {
    if (!repo.find((n) => flat(n) === flat(nudge))) return // not found
    const filtered = repo.filter((n) => flat(n) !== flat(nudge))
    updateNudges(filtered)
    setRepo(filtered)
  }

  return (
    <NudgeContext.Provider value={{ addNudge, addPasswordNudge, nudges, removeNudge }}>
      {children}
    </NudgeContext.Provider>
  )
}
