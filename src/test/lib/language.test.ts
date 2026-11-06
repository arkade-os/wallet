import { describe, expect, it } from 'vitest'
import { getCurrency, detectLanguage } from '../../lib/language'
import { Currencies } from '../../lib/types'

describe('getCurrency', () => {
  it.each([
    ['de-CH', Currencies.CHF],
    ['de-DE', Currencies.EUR],
    ['en-GB', Currencies.GBP],
    ['en-US', Currencies.USD],
    ['en-ES', Currencies.EUR],
    ['fr-FR', Currencies.EUR],
    ['ja-JP', Currencies.JPY],
    ['pt-BR', Currencies.BRL],
    ['pt-PT', Currencies.EUR],
    ['zh-CN', Currencies.CNY],
  ])('maps %s to %s', (locale, expected) => {
    expect(getCurrency(locale)).toBe(expected)
  })
})

describe('detectLanguage', () => {
  it.each([
    ['de-CH', 'en'],
    ['de-DE', 'en'],
    ['en-GB', 'en'],
    ['en-US', 'en'],
    ['es-ES', 'es'],
    ['fr-FR', 'en'],
    ['ja-JP', 'en'],
    ['pt-BR', 'pt'],
    ['pt-PT', 'pt'],
    ['zh-CN', 'en'],
  ])('maps %s to %s', (locale, expected) => {
    expect(detectLanguage(locale)).toBe(expected)
  })
})
