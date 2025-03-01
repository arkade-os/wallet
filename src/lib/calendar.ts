export interface CalendarEvent {
  name: string;
  startTime: number;
  duration: number;
}

const DEFAULT_EVENT_MESSAGE = 'Open your application at https://Arkade.Money to renew your virtual coins for optimal fees during market hours. This ensures lower transaction costs and better efficiency.'

export const formatTime = (time: number, format = 'yyyymmddThhmmss'): string => {
  // Ensure we're working with milliseconds
  const timeInMs = time * 1000;
  
  // Create date in local timezone
  const date = new Date(timeInMs);
  
  // Format for iCal requires UTC format with specific formatting
  if (format === 'yyyymmddThhmmss') {
    // Format as YYYYMMDDTHHMMSSZ (UTC)
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  }
  
  // For other formats, use ISO string and clean it up
  return date.toISOString().replace(/[.-]/g, '').replace(/:/g, '').slice(0, format.length);
}

export const formatGoogleDate = (timestamp: number): string => {
  // Always treat input as seconds and convert to milliseconds
  const timeInMs = timestamp * 1000;
  const date = new Date(timeInMs);
  
  // Format as YYYYMMDDTHHMMSSZ
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
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

/**
 * Generate an ICS file content for a calendar event
 * @param title - Event title
 * @param description - Event description
 * @param date - Event date (ISO string)
 * @returns ICS file content as string
 */
export function generateICSContent(title: string, description: string, date: string): string {
  const startTime = Math.floor(new Date(date).getTime() / 1000);
  const duration = 60; // 1 minute duration
  
  const startDate = formatTime(startTime);
  const endDate = formatTime(startTime + duration);
  const now = formatTime(Math.floor(Date.now() / 1000));
  const eventId = generateId();

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Arkade//Virtual Coins Renewal//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${eventId}
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${title}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;
}

function generateId(): string {
  // Get current timestamp in milliseconds and convert to hex
  const timestamp = Date.now().toString(16);
  
  // Generate 4 random bytes for uniqueness
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return `arkade-${timestamp}-${random}`;
} 