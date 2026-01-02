import { ConfigContext } from './config'
import { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  BoltzAnnouncement,
  LendaSatAnnouncement,
  LendaSwapAnnouncement,
  NostrBackupsAnnouncement,
} from '../components/Announcement'

interface AnnouncementItem {
  id: string
  component: React.FC<{ close: () => void }>
  inactive?: boolean
}

const announcements: AnnouncementItem[] = [
  { id: 'boltz', component: BoltzAnnouncement, inactive: true },
  { id: 'nostr backups', component: NostrBackupsAnnouncement },
  { id: 'lendaswap', component: LendaSwapAnnouncement },
  { id: 'lendasat', component: LendaSatAnnouncement },
]

interface AnnouncementContextProps {
  announcement: React.ReactNode | null
}

export const AnnouncementContext = createContext<AnnouncementContextProps>({
  announcement: null,
})

export const AnnouncementProvider = ({ children }: { children: ReactNode }) => {
  const { config, updateConfig } = useContext(ConfigContext)

  const [announcement, setAnnouncement] = useState<React.ReactNode | null>(null)

  const seen = useRef(false)

  useEffect(() => {
    if (!config || !config.pubkey || seen.current) return
    const announcementsIds = announcements.filter((a) => !a.inactive).map((a) => a.id)
    for (const id of announcementsIds) {
      if (!config.announcementsSeen?.includes(id)) {
        const announcementComp = announcements.find((a) => a.id === id)
        if (announcementComp) {
          const handleClose = (id: string) => {
            const announcementsSeen = [...config.announcementsSeen, id]
            updateConfig({ ...config, announcementsSeen })
            setAnnouncement(null)
            seen.current = true
          }
          const Component = announcementComp.component
          setAnnouncement(<Component close={() => handleClose(id)} />)
          return
        }
      }
    }
  }, [config, updateConfig])

  return <AnnouncementContext.Provider value={{ announcement }}>{children}</AnnouncementContext.Provider>
}
