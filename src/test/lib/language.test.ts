import { describe, expect, it } from 'vitest'
import { getCurrency } from '../../lib/language'
import { Currencies } from '../../lib/types'

describe('getCurrency', () => {
  it.each([
    ['fr-FR', Currencies.EUR],
    ['de-DE', Currencies.EUR],
    ['pt-PT', Currencies.EUR],
    ['en-GB', Currencies.GBP],
    ['de-CH', Currencies.CHF],
    ['pt-BR', Currencies.BRL],
    ['ja-JP', Currencies.JPY],
    ['zh-CN', Currencies.CNY],
    ['en-US', Currencies.USD],
  ])('maps %s to %s', (locale, expected) => {
    expect(getCurrency(locale)).toBe(expected)
  })
})
