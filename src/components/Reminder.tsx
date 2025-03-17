import { prettyDate } from '../lib/format'
import { IonActionSheet } from '@ionic/react'
import {
  CalendarEvent,
  generateAppleCalendarUrl,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from '../lib/calendar'
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
    <IonActionSheet
      onDidDismiss={callback}
      cssClass='my-ion-action-sheet'
      header={name}
      subHeader={prettyDate(startTime)}
      isOpen={isOpen}
      buttons={[
        {
          cssClass: 'reminder-button',
          text: 'Google Calendar',
          handler: handleGoogle,
        },
        {
          cssClass: 'reminder-button',
          text: 'Apple Calendar',
          handler: handleApple,
        },
        {
          cssClass: 'reminder-button',
          text: 'Outlook',
          handler: handleOutlook,
        },
      ]}
    />
  )
}
