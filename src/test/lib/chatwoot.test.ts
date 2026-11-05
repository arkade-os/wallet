import { describe, expect, it } from 'vitest'
import { Language } from '../../lib/types'
import { getChatwootLocale, getChatwootSettings } from '../../lib/chatwoot'

describe('chatwoot localization', () => {
  it('maps the active language to the Chatwoot widget locale', () => {
    Object.values(Language).forEach((lang) => {
      expect(getChatwootLocale(lang)).toBe(lang)
    })
  })

  it('applies the locale to the widget settings', () => {
    Object.values(Language).forEach((lang) => {
      expect(getChatwootSettings(getChatwootLocale(lang)).locale).toBe(getChatwootLocale(lang))
    })
    expect(getChatwootSettings().locale).toBe('en')
  })
})
