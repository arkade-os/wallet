import { describe, expect, it } from 'vitest'
import { Language } from '../../lib/types'
import { getChatwootLocale, getChatwootSettings } from '../../lib/chatwoot'

describe('chatwoot localization', () => {
  it('maps the active language to the Chatwoot widget locale', () => {
    expect(getChatwootLocale(Language.Spanish)).toBe('es')
    expect(getChatwootLocale(Language.English)).toBe('en')
  })

  it('applies the locale to the widget settings', () => {
    expect(getChatwootSettings(getChatwootLocale(Language.Spanish)).locale).toBe('es')
    expect(getChatwootSettings(getChatwootLocale(Language.English)).locale).toBe('en')
    expect(getChatwootSettings().locale).toBe('en')
  })
})
