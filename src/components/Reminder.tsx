import { prettyDate } from '../lib/format'
import {
  CalendarEvent,
  generateAppleCalendarUrl,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from '../lib/calendar'
import SheetModal from './SheetModal'
import FlexCol from './FlexCol'
interface ReminderProps {
  callback: () => void
  duration: number
  isOpen: boolean
  name: string
  startTime: number
}

export default function Reminder({ callback, duration, name, isOpen, startTime }: ReminderProps) {
  // Create CalendarEvent object to pass to helper functions
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

  const headerStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 700,
  }

  const subHeaderStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    fontWeight: 400,
    color: 'var(--dark50)',
  }

  return (
    <SheetModal isOpen={isOpen} onClose={callback}>
      <FlexCol gap='2rem'>
        <FlexCol centered>
          <p style={headerStyle}>{name}</p>
          <p style={subHeaderStyle}>{prettyDate(startTime)}</p>
        </FlexCol>
        <FlexCol>
          <button className='reminder-button' onClick={handleGoogle}>
            Google Calendar
          </button>
          <button className='reminder-button' onClick={handleApple}>
            Apple Calendar
          </button>
          <button className='reminder-button' onClick={handleOutlook}>
            Outlook
          </button>
        </FlexCol>
      </FlexCol>
    </SheetModal>
  )
}
