import { prettyDelta } from './format'

export const mapKnownErrors = (message: string): string => {
  // "vtxo script can be used for intent registration in N seconds"
  const secondsMatch = message.match(/vtxo script can be used for intent registration in (\d+) seconds/i)
  if (secondsMatch) {
    const seconds = parseInt(secondsMatch[1], 10)
    return `Your funds were recently settled onchain — please try again in ${prettyDelta(seconds)}`
  }

  // "already unrolled" or "unrolled vtxo"
  if (/already unrolled|unrolled vtxo/i.test(message)) {
    return 'Your funds were recently settled onchain — please try again in a few hours'
  }

  return message
}

export const extractError = (error: any): string => {
  if (typeof error === 'string') return mapKnownErrors(error)
  if (error?.response?.data?.error) return mapKnownErrors(error.response.data.error)
  if (error.message) {
    const match = error.message.match(/"message":"(.+)?"/)
    if (match && match.length > 1) return mapKnownErrors(match[1])
    return mapKnownErrors(error.message)
  }
  return JSON.stringify(error)
}
