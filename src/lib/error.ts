const TIMEOUT_PATTERN = /timed out after \d+ms/i

export const extractError = (error: any): string => {
  if (typeof error === 'string') return error
  if (error?.response?.data?.error) return error.response.data.error
  if (error.message) {
    const match = error.message.match(/"message":"(.+)?"/)
    if (match && match.length > 1) return match[1]
    return error.message
  }
  return JSON.stringify(error)
}

export const isTimeoutError = (error: unknown): boolean => {
  const msg = error instanceof Error ? error.message : String(error)
  return TIMEOUT_PATTERN.test(msg)
}

export const friendlyError = (error: unknown, operation?: string): string => {
  const raw = extractError(error)
  if (TIMEOUT_PATTERN.test(raw)) {
    const op = operation ?? 'Operation'
    return `${op} is taking longer than expected. It may still complete in the background — check back in a moment.`
  }
  return raw
}
