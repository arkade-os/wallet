import { describe, expect, it } from 'vitest'
import { translations } from '../../lib/i18n'

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
  it('en and es expose the same key set', () => {
    const en = collectLeafKeys(translations.en)
    const es = collectLeafKeys(translations.es)
    expect(new Set(es)).toEqual(new Set(en))
  })

  it('every t()/translate() key used in source resolves in the EN dictionary', () => {
    const files = import.meta.glob('../../**/*.{ts,tsx}', { as: 'raw', eager: true })
    const used = new Set<string>()
    for (const [, raw] of Object.entries(files)) {
      if (!raw) continue
      for (const match of raw.matchAll(/\bt\(\s*['"]([A-Za-z0-9_.]+)['"]/g)) used.add(match[1])
      // `translate(language, key)` takes the key as the SECOND positional
      // argument. Keep the regex tied to that signature — if it ever changes to
      // `translate(key, language)`, this pattern would silently start collecting
      // the locale argument instead of the key.
      for (const match of raw.matchAll(/translate\([^)]*?,\s*['"]([A-Za-z0-9_.]+)['"]/g)) used.add(match[1])
    }
    const missing = [...used].filter((key) => typeof resolve(translations.en, key) !== 'string').sort()
    console.log('unique t() keys used:', used.size)
    console.log('missing from EN dict:', missing)
    expect(missing).toEqual([])
  })
})
