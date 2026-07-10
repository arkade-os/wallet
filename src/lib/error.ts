export const extractError = (error: any): string => {
  if (typeof error === 'string') return error
  if (error?.response?.data?.error) return error.response.data.error
  if (error?.message) {
    const match = error.message.match(/"message":"(.+)?"/)
    if (match && match.length > 1) return match[1]
    return error.message
  }
  // DOMExceptions (e.g. WebAuthn NotAllowedError, AES-GCM OperationError) have
  // no enumerable fields and often an empty message, so JSON.stringify yields
  // an unhelpful '{}'. Surface the name instead so logs are actionable.
  if (error?.name) return error.name
  return JSON.stringify(error)
}
