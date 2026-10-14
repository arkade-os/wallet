// 16 digits keeps 21M BTC in sats (2.1e15) and any fiat entry below Number's exact-integer range.
export const MAX_ENTRY_DIGITS = 16

export const pushDigit = (digits: string, key: string): string => {
  if (!/^\d$/.test(key) || digits.length >= MAX_ENTRY_DIGITS) return digits
  return digits === '' && key === '0' ? '' : digits + key
}

export const popDigit = (digits: string): string => digits.slice(0, -1)

export const digitsToValue = (digits: string, decimals: number): string => {
  if (!digits) return ''
  if (decimals === 0) return digits
  const padded = digits.padStart(decimals + 1, '0')
  return `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`
}

export const valueToDigits = (value: string, decimals: number): string => {
  const [whole = '', frac = ''] = value.replaceAll(',', '').split('.')
  const digits = (whole + frac.padEnd(decimals, '0').slice(0, decimals)).replace(/^0+/, '')
  return digits.slice(0, MAX_ENTRY_DIGITS)
}
