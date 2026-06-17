import { prettyDate } from '../lib/format'
import {
  CalendarEvent,
  generateAppleCalendarUrl,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from '../lib/calendar'
import SheetModal from './SheetModal'
import FlexCol from './FlexCol'
import Button from './Button'
import Text from './Text'
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

  return (
    <SheetModal isOpen={isOpen} onClose={callback}>
      <FlexCol gap='2rem'>
        <FlexCol centered gap='0.5rem'>
          <Text bold>{name}</Text>
          <Text small>{prettyDate(startTime)}</Text>
        </FlexCol>
        <FlexCol>
          <Button outline onClick={handleGoogle}>
            Google Calendar
          </Button>
          <Button outline onClick={handleApple}>
            Apple Calendar
          </Button>
          <Button outline onClick={handleOutlook}>
            Outlook
          </Button>
        </FlexCol>
      </FlexCol>
    </SheetModal>
  )
}
