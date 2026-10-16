import { describe, expect, it } from 'vitest'
import { translations } from '@/lib/i18n'
import { Language } from '@/lib/types'

// Proper nouns, protocol names and technical terms legitimately keep their
// English form in other languages' UI (LNURL, Arkade, sats, swap, pubkey...).
// Any key in the language dictionary that is NOT listed here must be an actual
// translation, not an English fallback.
const keepEnglishTermAllowList = new Set([
  'accounts.arknote',
  'accounts.solver',
  'accounts.total',
  'apps.dfx',
  'backup.title',
  'common.sat',
  'common.sats',
  'common.total',
  'components.lnurlAddress',
  'contracts.script',
  'delegate.feeLabel',
  'delegate.pubkeyLabel',
  'formatting.unit',
  'mint.arkadeMint',
  'mint.max',
  'mint.ticker',
  'mint.tickerLabel',
  'receive.methodLightning',
  'receive.methodArkade',
  'receive.methodBitcoin',
  'send.bitcoin',
  'settings.arkadeMint',
  'settings.auto',
  'settings.backup',
  'settings.dust',
  'settings.feedback',
  'settings.general',
  'settings.solvers',
  'transaction.boarding',
  'transaction.swap',
  'transaction.totalTicker',
  'vtxos.subdust',
  'wallet.wallet',
])

function collectLeafKeys(obj: unknown, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') keys.push(path)
    else keys.push(...collectLeafKeys(value, path))
  }
  return keys
}

function resolve(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, dict)
}

describe('i18n dictionary integrity', () => {
  const englishSet = new Set(collectLeafKeys(translations.en))

  it('es expose the same key set', () => {
    expect(englishSet).toEqual(new Set(collectLeafKeys(translations.es)))
  })

  it('pt expose the same key set', () => {
    expect(englishSet).toEqual(new Set(collectLeafKeys(translations.pt)))
  })

  it('every t()/translate() key used in source resolves in the EN dictionary', () => {
    const files = import.meta.glob('../../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
    const used = new Set<string>()
    for (const raw of Object.values(files)) {
      const content = (raw ?? '') as string
      if (!content) continue
      for (const match of content.matchAll(/\bt\(\s*['"]([A-Za-z0-9_.]+)['"]/g)) used.add(match[1])
      for (const match of content.matchAll(/translate\([^)]*?,\s*['"]([A-Za-z0-9_.]+)['"]/g)) used.add(match[1])
    }
    const missing = [...used].filter((key) => typeof resolve(translations.en, key) !== 'string').sort()
    expect(missing).toEqual([])
  })

  it('language values are real translations unless the term is universal/technical', () => {
    Object.values(Language).forEach((lang) => {
      if (lang === Language.English) return
      const unlocalized = collectLeafKeys(translations.en)
        .filter((key) => !keepEnglishTermAllowList.has(key))
        .filter((key) => resolve(translations[lang], key) === resolve(translations.en, key))
      expect(unlocalized).toEqual([])
    })
  })
})
