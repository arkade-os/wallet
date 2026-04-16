import { prettyDate } from '../lib/format'
import {
  CalendarEvent,
  generateAppleCalendarUrl,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from '../lib/calendar'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from './ui/drawer'

interface ReminderProps {
  callback: () => void
  duration: number
  isOpen: boolean
  name: string
  startTime: number
}

export default function Reminder({ callback, duration, name, isOpen, startTime }: ReminderProps) {
  const calendarEvent: CalendarEvent = {
    name,
    startTime,
    duration,
  }

  const handleApple = () => {
    const url = generateAppleCalendarUrl(calendarEvent)
    window.open(url, '_blank')
    callback()
  }

  const handleGoogle = () => {
    const url = generateGoogleCalendarUrl(calendarEvent)
    window.open(url, '_blank')
    callback()
  }

  const handleOutlook = () => {
    const url = generateOutlookCalendarUrl(calendarEvent)
    window.open(url, '_blank')
    callback()
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--neutral-500)',
    borderRadius: '0.25rem',
    background: 'var(--neutral-50)',
    color: 'inherit',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center',
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && callback()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{name}</DrawerTitle>
          <DrawerDescription>{prettyDate(startTime)}</DrawerDescription>
        </DrawerHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1rem', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
          <button type='button' style={buttonStyle} onClick={handleGoogle}>
            Google Calendar
          </button>
          <button type='button' style={buttonStyle} onClick={handleApple}>
            Apple Calendar
          </button>
          <button type='button' style={buttonStyle} onClick={handleOutlook}>
            Outlook
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
