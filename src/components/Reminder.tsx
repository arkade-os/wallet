import { prettyDate } from '../lib/format'
import { IonActionSheet } from '@ionic/react'
import { generateAppleCalendarUrl, generateGoogleCalendarUrl, generateOutlookCalendarUrl, type CalendarEvent } from '../lib/calendar'

interface ReminderProps {
  callback: () => void
  duration: number
  isOpen: boolean
  name: string
  startTime: number
}

export default function Reminder({ callback, duration, name, isOpen, startTime }: ReminderProps) {
  const event: CalendarEvent = {
    name,
    startTime,
    duration
  }

  const handleApple = () => {
    const url = generateAppleCalendarUrl(event)
    if (url.startsWith('webcal://')) {
      window.location.href = url
    } else {
      const link = document.createElement('a')
      link.href = url
      link.download = `${name.toLowerCase().replace(/\s+/g, '-')}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    callback()
  }

  const handleGoogle = () => {
    const url = generateGoogleCalendarUrl(event)
    window.open(url, '_blank')
    callback()
  }

  const handleOutlook = () => {
    const url = generateOutlookCalendarUrl(event)
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
