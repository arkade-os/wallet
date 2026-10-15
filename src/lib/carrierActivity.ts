import { translate } from './i18n'
import { Language } from './types'

export const isCanonicalTxid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)

const boundedSats = (value: string): bigint => {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) throw new Error('Invalid carrier sats')
  const sats = BigInt(value)
  if (sats > 2_100_000_000_000_000n) throw new Error('Carrier sats exceed the Bitcoin supply')
  return sats
}

export const pluralSats = (value: string, language: Language): string =>
  `${boundedSats(value).toLocaleString('en-US')} ${translate(language, boundedSats(value) === 1n ? 'common.sat' : 'common.sats')}`
