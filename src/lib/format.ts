import { Config, Satoshis } from './types'
import { Decimal } from 'decimal.js'

export const fromSatoshis = (num: Satoshis): number => {
  return Decimal.div(num, 100_000_000).toNumber()
}

export const toSatoshis = (num: number): Satoshis => {
  return Decimal.mul(num, 100_000_000).toNumber()
}

export const prettyAgo = (timestamp: number | string, long = false): string => {
  const unixts = typeof timestamp === 'string' ? Math.floor(new Date(timestamp).getTime() / 1000) : timestamp
  const now = Math.floor(Date.now() / 1000)
  const delta = Math.floor(now - unixts)
  if (delta === 0) return 'just now'
  if (delta > 0) return `${prettyDelta(delta, long)} ago`
  if (delta < 0) return `in ${prettyDelta(delta, long)}`
  return ''
}

export const prettyAmount = (
  amountInSats: number,
  config: Config,
  toUSD: (sats: number) => number,
  inverted = false,
): string => {
  const showFiat = inverted ? !config.showFiat : config.showFiat
  if (showFiat) {
    const amountToShow = toUSD(amountInSats)
    const amountToView = config.showBalance ? prettyNumber(amountToShow) : prettyHide(amountToShow)
    return `${amountToView} USD`
  } else {
    const [amountToShow, suffix] = prettySats(amountInSats)
    const amountToView = config.showBalance ? amountToShow : prettyHide(amountToShow)
    return `${amountToView} ${config.showBalance ? suffix : 'sats'}`
  }
}

export const prettyDelta = (seconds: number, long = true): string => {
  const delta = Math.abs(seconds)
  if (delta > 86_400) {
    const days = Math.floor(delta / 86_400)
    return `${days}${long ? ' days' : 'd'}`
  }
  if (delta > 3_600) {
    const hours = Math.floor(delta / 3_600)
    return `${hours}${long ? ' hours' : 'h'}`
  }
  if (delta > 60) {
    const minutes = Math.floor(delta / 60)
    return `${minutes}${long ? ' minutes' : 'm'}`
  }
  if (delta > 0) {
    const seconds = delta
    return `${seconds}${long ? ' seconds' : 's'}`
  }
  return ''
}

export const prettyDate = (num: number): string => {
  if (!num) return ''
  const date = new Date(num * 1000)
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    minute: '2-digit',
    hour: '2-digit',
  }).format(date)
}

export const prettyHide = (value: string | number): string => {
  if (!value) return '···'
  const str = typeof value === 'string' ? value : value.toString()
  const length = str.length * 2 > 6 ? str.length * 2 : 6
  return Array(length).fill('·').join('')
}

export const prettyLongText = (str?: string, showChars = 12): string => {
  if (!str) return ''
  if (str.length <= showChars * 2 + 4) return str
  const left = str.substring(0, showChars)
  const right = str.substring(str.length - showChars, str.length)
  return `${left}...${right}`
}

export const prettyNumber = (num?: number, maximumFractionDigits = 8): string => {
  if (!num) return '0'
  return new Intl.NumberFormat('en', { style: 'decimal', maximumFractionDigits }).format(num)
}

const prettySats = (sats: number): [string, string] => {
  const pretty = (dp = 3, divider = 1) => prettyNumber(fromSatoshis(sats / divider), dp)
  if (sats > 100_000_000_000) return [pretty(2), 'BTC']
  if (sats > 100_000_000) return [pretty(3), 'BTC']
  if (sats > 1_000_000) return [pretty(3, 1_000_000), 'M sats']
  return [prettyNumber(sats), 'sats']
}

export const prettyUnixTimestamp = (num: number): string => {
  if (!num) return ''
  const date = new Date(num * 1000)
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'full',
    timeStyle: 'long',
  }).format(date)
}

export const toUint8Array = (str: string): Uint8Array => {
  return new TextEncoder().encode(str)
}
