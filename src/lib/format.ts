import { centsToUnits, prettyAssetAmount } from './assets'
import { fiatDecimalsFor, FIAT_SYMBOLS } from './fiat'
import { Fiats, Tx } from './types'
import { Decimal } from 'decimal.js'

export const fromSatoshis = (num: number): number => {
  return Decimal.div(num, 100_000_000).toNumber()
}

export const toSatoshis = (num: number): number => {
  return Decimal.mul(num, 100_000_000).floor().toNumber()
}

export const prettyAgo = (timestamp: number | string, long = false): string => {
  if (!timestamp) return ''
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

export const prettyAmount = (sats: number, suffix?: string, decimals = 2): string => {
  if (suffix) return `${prettyNumber(sats, decimals)} ${suffix}`
  if (sats >= 100_000_000_000_000) return `${prettyNumber(fromSatoshis(sats), 0)}K BTC`
  if (sats >= 100_000_000_000) return `${prettyNumber(fromSatoshis(sats), 0)} BTC`
  if (sats >= 100_000_000) return `${prettyNumber(fromSatoshis(sats), 3)} BTC`
  if (sats >= 1_000_000) return `${prettyNumber(sats / 1_000_000, 3)}M SATS`
  return `${prettyNumber(sats, 0)} ${sats === 1 ? 'SAT' : 'SATS'}`
}

type FiatAmountFormatOptions = {
  maximumFractionDigits?: number
  minimumFractionDigits?: number
}

export const formatFiatAmountParts = (
  amount: number,
  currency: Fiats,
  options: FiatAmountFormatOptions = {},
): { amount: string; unit: string } => {
  const symbol = FIAT_SYMBOLS[currency]
  const maximumFractionDigits = options.maximumFractionDigits ?? fiatDecimalsFor(currency)
  const minimumFractionDigits = options.minimumFractionDigits ?? maximumFractionDigits
  const formatted = prettyNumber(amount, maximumFractionDigits, true, minimumFractionDigits)

  return {
    amount: symbol ? `${symbol}${formatted}` : formatted,
    unit: symbol ? '' : currency,
  }
}

export const prettyFiatAmount = (amount: number, currency: Fiats, options?: FiatAmountFormatOptions): string => {
  const parts = formatFiatAmountParts(amount, currency, options)
  return parts.unit ? `${parts.amount} ${parts.unit}` : parts.amount
}

export const fiatForTicker = (ticker: string | undefined): Fiats | undefined => {
  const normalized = ticker?.trim().toUpperCase()
  if (normalized === 'USD' || normalized === 'USDT' || normalized === 'USDC' || normalized === 'AUSD') return Fiats.USD
  if (normalized === 'CHF') return Fiats.CHF
  if (normalized === 'EUR') return Fiats.EUR
  if (normalized === 'GBP') return Fiats.GBP
  if (normalized === 'JPY') return Fiats.JPY
  if (normalized === 'CNY') return Fiats.CNY
}

export const prettyCurrencyAssetAmount = (
  amount: bigint,
  decimals: number,
  ticker: string | undefined,
  useGrouping = true,
): string => {
  const fiat = fiatForTicker(ticker)
  if (!fiat) return prettyAssetAmount(amount, decimals, useGrouping)

  const unitAmount = Decimal.div(amount.toString(), Decimal.pow(10, decimals))
  const fiatDecimals = fiatDecimalsFor(fiat)
  return prettyNumber(unitAmount, fiatDecimals, useGrouping, fiatDecimals)
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

const hideDots = (value: string | number | bigint): string => {
  const str = typeof value === 'string' ? value : value.toString()
  const length = str.length * 2 > 6 ? str.length * 2 : 6
  return '·'.repeat(length)
}

export const prettyHide = (value: string | number | bigint, suffix = 'SATS'): string => {
  if (!value) return ''
  const dots = hideDots(value)
  return suffix ? `${dots} ${suffix}` : dots
}

export const prettyFiatHide = (value: number, currency: Fiats): string => {
  if (!value) return ''
  const dots = hideDots(value)
  const symbol = FIAT_SYMBOLS[currency]
  return symbol ? `${symbol}${dots}` : `${dots} ${currency}`
}

export const prettyLongText = (str?: string, showChars = 11): string => {
  if (!str) return ''
  str = String(str)
  if (str.length <= showChars * 2 + 4) return str
  const left = str.substring(0, showChars)
  const right = str.substring(str.length - showChars, str.length)
  return `${left}...${right}`
}

type PrettyNumberInput = number | string | bigint | Decimal

export const prettyNumber = (
  num?: PrettyNumberInput,
  maximumFractionDigits = 8,
  useGrouping = true,
  minimumFractionDigits?: number,
): string => {
  if (num === undefined || num === null) return '0'
  if (typeof num === 'number') {
    if (Number.isNaN(num)) return '0'
    return new Intl.NumberFormat('en', {
      style: 'decimal',
      maximumFractionDigits,
      minimumFractionDigits,
      useGrouping,
    }).format(num)
  }

  return formatDecimalText(num, maximumFractionDigits, useGrouping, minimumFractionDigits)
}

function formatDecimalText(
  value: Exclude<PrettyNumberInput, number>,
  maximumFractionDigits: number,
  useGrouping: boolean,
  minimumFractionDigits = 0,
): string {
  const fixed = new Decimal(value.toString()).toFixed(maximumFractionDigits)
  const [rawInteger, rawFraction = ''] = fixed.split('.')
  const negative = rawInteger.startsWith('-')
  const integer = negative ? rawInteger.slice(1) : rawInteger
  const groupedInteger = useGrouping ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : integer
  const trimmedFraction = rawFraction.replace(/0+$/, '')
  const fraction =
    trimmedFraction.length < minimumFractionDigits
      ? trimmedFraction.padEnd(minimumFractionDigits, '0')
      : trimmedFraction

  return `${negative ? '-' : ''}${groupedInteger}${fraction ? `.${fraction}` : ''}`
}

export const formatAssetAmount = (amount: bigint, decimals: number): string => {
  if (decimals === 0) return prettyNumber(amount, 0)
  return prettyNumber(centsToUnits(amount, decimals), decimals)
}

export const isIssuance = (tx: Tx): boolean => {
  return tx.type === 'sent' && tx.amount === 0 && (tx.assets ?? []).some((a) => a.amount > 0)
}

export const isBurn = (tx: Tx): boolean => {
  return tx.type === 'sent' && tx.amount === 0 && (tx.assets ?? []).some((a) => a.amount < 0)
}

export const toUint8Array = (str: string): Uint8Array => {
  return new TextEncoder().encode(str)
}
