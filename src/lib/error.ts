import { localizedDelta } from './format'
import { translate } from '../providers/language'
import { getActiveLanguage } from './language'

const t = (key: string, params?: Record<string, string | number>): string => translate(getActiveLanguage(), key, params)

export const mapKnownErrors = (message: string): string => {
  // "vtxo script can be used for intent registration in N seconds"
  const secondsMatch = message.match(/vtxo script can be used for intent registration in (\d+) seconds/i)
  if (secondsMatch) {
    const seconds = parseInt(secondsMatch[1], 10)
    const delta = localizedDelta(seconds, t)
    const when = delta ? t('formatting.ahead', { value: delta }) : t('common.shortly')
    return t('errors.recentlySettledRetry', { when })
  }

  // "already unrolled" or "unrolled vtxo"
  if (/already unrolled|unrolled vtxo/i.test(message)) {
    return t('errors.recentlySettledHours')
  }

  return message
}

export const extractError = (error: any): string => {
  if (typeof error === 'string') return mapKnownErrors(error)
  if (typeof error?.response?.data?.error === 'string') return mapKnownErrors(error.response.data.error)
  if (error.message) {
    const match = error.message.match(/"message":"([^"]*)"/)
    const extractedMessage = match?.[1]
    if (typeof extractedMessage === 'string' && extractedMessage.length > 0) return mapKnownErrors(extractedMessage)
    return mapKnownErrors(error.message)
  }
  return JSON.stringify(error)
}
