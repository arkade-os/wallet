type TranslateFn = (key: string, params?: Record<string, string | number>) => string

export const prettyDelta = (seconds: number, long = true): string => {
  const delta = Math.abs(seconds)
  if (delta >= 86_400) {
    const days = Math.floor(delta / 86_400)
    return `${days}${long ? (days === 1 ? ' day' : ' days') : 'd'}`
  }
  if (delta >= 3_600) {
    const hours = Math.floor(delta / 3_600)
    return `${hours}${long ? (hours === 1 ? ' hour' : ' hours') : 'h'}`
  }
  if (delta >= 60) {
    const minutes = Math.floor(delta / 60)
    return `${minutes}${long ? (minutes === 1 ? ' minute' : ' minutes') : 'm'}`
  }
  if (delta > 0) {
    const secs = delta
    return `${secs}${long ? (secs === 1 ? ' second' : ' seconds') : 's'}`
  }
  return ''
}

const toUnixSeconds = (timestamp: number | string): number => {
  if (typeof timestamp === 'string') return Math.floor(new Date(timestamp).getTime() / 1000)
  return timestamp > 200_000_000_000 ? Math.floor(timestamp / 1000) : timestamp
}

// Locale-aware duration label, e.g. "3 days". Plural forms come from the
// dictionary so they work without a pluralization library.
export const localizedDelta = (seconds: number, t: TranslateFn): string => {
  const delta = Math.abs(seconds)
  const render = (count: number, one: string, many: string) =>
    t('formatting.unit', { count: String(count), unit: t(count === 1 ? one : many) })
  if (delta >= 86_400) return render(Math.floor(delta / 86_400), 'formatting.day', 'formatting.days')
  if (delta >= 3_600) return render(Math.floor(delta / 3_600), 'formatting.hour', 'formatting.hours')
  if (delta >= 60) return render(Math.floor(delta / 60), 'formatting.minute', 'formatting.minutes')
  if (delta > 0) return render(delta, 'formatting.second', 'formatting.seconds')
  return ''
}

// Locale-aware relative time, e.g. "3 days ago" / "hace 3 días".
export const localizedAgo = (timestamp: number | string, t: TranslateFn): string => {
  if (!timestamp) return ''
  const delta = Math.floor(Date.now() / 1000) - toUnixSeconds(timestamp)
  if (delta === 0 || delta === 1) return t('formatting.justNow')
  const value = localizedDelta(delta, t)
  return delta > 1 ? t('formatting.ago', { value }) : t('formatting.ahead', { value })
}
