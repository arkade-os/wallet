import { ConfigContext } from './config'
import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import {
  BoltzAnnouncement,
  LendaSatAnnouncement,
  LendaSwapAnnouncement,
  NostrBackupsAnnouncement,
} from '../components/Announcement'

const announcements = [
  { id: 'boltz', component: BoltzAnnouncement },
  { id: 'lendasat', component: LendaSatAnnouncement },
  { id: 'lendaswap', component: LendaSwapAnnouncement },
  { id: 'nostr backups', component: NostrBackupsAnnouncement },
]

interface AnnouncementContextProps {
  announcement: React.ReactNode | null
}

export const AnnouncementContext = createContext<AnnouncementContextProps>({
  announcement: null,
})

export const AnnouncementProvider = ({ children }: { children: ReactNode }) => {
  const { config, configLoaded, updateConfig } = useContext(ConfigContext)

  const [announcement, setAnnouncement] = useState<React.ReactNode | null>(null)

  const handleClose = (id: string) => {
    const announcementsSeen = [...config.announcementsSeen, id]
    updateConfig({ ...config, announcementsSeen })
    setAnnouncement(null)
  }

  useEffect(() => {
    if (!configLoaded) return
    const announcedIds = announcements.map((a) => a.id)
    for (const id of announcedIds) {
      if (!config.announcementsSeen.includes(id)) {
        const announcementComp = announcements.find((a) => a.id === id)
        if (announcementComp) {
          setAnnouncement(announcementComp.component({ close: () => handleClose(id) }))
          return
        }
      }
    }
  }, [configLoaded])

  return <AnnouncementContext.Provider value={{ announcement }}>{children}</AnnouncementContext.Provider>
}
