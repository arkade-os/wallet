export interface CalendarEvent {
  name: string
  startTime: number
  duration: number
}

const DEFAULT_EVENT_MESSAGE =
  'Open your application at https://Arkade.Money to renew your virtual coins for optimal fees during market hours. This ensures lower transaction costs and better efficiency.'

export const formatTime = (time: number, format = 'yyyymmddThhmmss'): string => {
  // Ensure we're working with milliseconds
  const timeInMs = time * 1000

  // Create date in local timezone
  const date = new Date(timeInMs)

  // Format for iCal requires UTC format with specific formatting
  if (format === 'yyyymmddThhmmss') {
    // Format as YYYYMMDDTHHMMSSZ (UTC)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
      date.getUTCHours(),
    )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  }

  // For other formats, use ISO string and clean it up
  return date.toISOString().replace(/[.-]/g, '').replace(/:/g, '').slice(0, format.length)
}

export const stringify = (input: Record<string, any>): string => {
  const params = new URLSearchParams()
  Object.keys(input).forEach((key) => {
    const value = input[key]
    if (value != null) params.append(key, value)
  })
  return params.toString().replace(/\+/g, '%20')
}

export const generateAppleCalendarUrl = (event: CalendarEvent): string => {
  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.href}
DTSTART:${formatTime(event.startTime)}
DTEND:${formatTime(event.startTime + event.duration)}
SUMMARY:${event.name}
END:VEVENT
END:VCALENDAR`
  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}`
}

export const generateGoogleCalendarUrl = (event: CalendarEvent): string => {
  const details = {
    text: event.name,
    details: DEFAULT_EVENT_MESSAGE,
    dates: formatTime(event.startTime) + '/' + formatTime(event.startTime + event.duration),
  }
  return `https://www.google.com/calendar/render?action=TEMPLATE&${stringify(details)}`
}

export const generateOutlookCalendarUrl = (event: CalendarEvent): string => {
  const details = {
    path: '/calendar/action/compose',
    rru: 'addevent',
    startdt: formatTime(event.startTime, 'yyyy-mm-ddThh:mm:ss'),
    enddt: formatTime(event.startTime + event.duration, 'yyyy-mm-ddThh:mm:ss'),
    subject: event.name,
    body: DEFAULT_EVENT_MESSAGE,
    allday: false,
  }
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints
  const action = isMobile ? 'deeplink' : 'compose'
  return `https://outlook.live.com/calendar/0/action/${action}?${stringify(details)}`
}
