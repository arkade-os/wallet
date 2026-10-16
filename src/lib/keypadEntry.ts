// Scales with decimals so an 18-decimal asset still has a 12-digit whole part.
export const maxEntryDigits = (decimals: number): number => Math.max(16, decimals + 12)

/** All bitcoin there will ever be, in sats: in sats and BTC modes the digits count sats. */
export const MAX_SATS = 2_100_000_000_000_000n

export const pushDigit = (digits: string, key: string, decimals: number, maxUnits?: bigint): string => {
  if (!/^\d$/.test(key) || digits.length >= maxEntryDigits(decimals)) return digits
  if (digits === '' && key === '0') return ''
  return maxUnits !== undefined && BigInt(digits + key) > maxUnits ? digits : digits + key
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
  // Not clamped, so Max loads a past-cap balance exactly (pushDigit stops typing); excess fraction digits drop.
  return (whole + frac.padEnd(decimals, '0').slice(0, decimals)).replace(/^0+/, '')
}
