import { Config, DenominationFormat, DisplayMode, Satoshis } from './types'
import { Decimal } from 'decimal.js'

export const fromSatoshis = (num: Satoshis): number => {
  return Decimal.div(num, 100_000_000).toNumber()
}

export const toSatoshis = (num: number): Satoshis => {
  return Decimal.mul(num, 100_000_000).floor().toNumber()
}

export const prettyAgo = (timestamp: number | string, long = false): string => {
  const now = Math.floor(Date.now() / 1000)
  const unixTimestamp =
    typeof timestamp === 'string'
      ? Math.floor(new Date(timestamp).getTime() / 1000)
      : timestamp > 200_000_000_000
        ? Math.floor(timestamp / 1000)
        : timestamp
  const delta = Math.floor(now - unixTimestamp)
  if (delta === 0 || delta === 1) return 'just now'
  if (delta > 1) return `${prettyDelta(delta, long)} ago`
  if (delta < 0) return `in ${prettyDelta(delta, long)}`
  return ''
}

export const prettyAmount = (
  amount: string | number,
  config?: Partial<Pick<Config, 'denominationFormat' | 'displayMode'>>,
  suffix?: string,
): string => {
  const sats = typeof amount === 'string' ? Number(amount) : amount

  // If explicit suffix is provided (e.g., for fiat), use it
  if (suffix) return `${prettyNumber(sats, 2)} ${suffix}`

  // Determine format based on config
  const denominationFormat = config?.denominationFormat ?? DenominationFormat.Bip177
  const displayMode = config?.displayMode ?? DisplayMode.Base

  // BTC decimal format
  if (displayMode === DisplayMode.BTC) {
    const btc = fromSatoshis(sats)
    return `${prettyNumber(btc, 8)} BTC`
  }

  // Base format - either BIP-177 or SATS based on denominationFormat
  if (denominationFormat === DenominationFormat.Bip177) {
    // BIP-177 format: ₿10,000
    return `₿${prettyNumber(sats, 0)}`
  } else {
    // SATS format with smart abbreviations
    if (sats >= 100_000_000) {
      // >= 1 BTC, show as BTC
      const btc = fromSatoshis(sats)
      return `${prettyNumber(btc, 0)} BTC`
    } else if (sats >= 1_000_000) {
      // >= 1M sats, show as "X.XXM SATS"
      const millions = Decimal.div(sats, 1_000_000).toNumber()
      return `${prettyNumber(millions, 2)}M SATS`
    } else {
      // < 1M sats, show as "X,XXX SATS"
      return `${prettyNumber(sats, 0)} SATS`
    }
  }
}

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

export const prettyHide = (
  value: string | number,
  config?: Partial<Pick<Config, 'denominationFormat' | 'displayMode'>>,
  suffix = '',
): string => {
  if (!value) return ''
  const str = typeof value === 'string' ? value : value.toString()
  const length = str.length * 2 > 6 ? str.length * 2 : 6
  const dots = Array(length).fill('·').join('')

  // If explicit suffix is provided (e.g., for fiat), use it
  if (suffix) return `${dots} ${suffix}`

  // Determine format based on config
  const denominationFormat = config?.denominationFormat ?? DenominationFormat.Bip177
  const displayMode = config?.displayMode ?? DisplayMode.Base

  // BTC decimal format
  if (displayMode === DisplayMode.BTC) {
    return `${dots} BTC`
  }

  // Base format - either BIP-177 or SATS based on denominationFormat
  if (denominationFormat === DenominationFormat.Bip177) {
    // BIP-177 format: ₿··········
    return `₿${dots}`
  } else {
    // SATS format: ·········· SATS
    return `${dots} SATS`
  }
}

export const prettyLongText = (str?: string, showChars = 11): string => {
  if (!str) return ''
  str = String(str)
  if (str.length <= showChars * 2 + 4) return str
  const left = str.substring(0, showChars)
  const right = str.substring(str.length - showChars, str.length)
  return `${left}...${right}`
}

export const prettyNumber = (num?: number, maximumFractionDigits = 8, useGrouping = true): string => {
  if (!num) return '0'
  return new Intl.NumberFormat('en', { style: 'decimal', maximumFractionDigits, useGrouping }).format(num)
}

export const toUint8Array = (str: string): Uint8Array => {
  return new TextEncoder().encode(str)
}
