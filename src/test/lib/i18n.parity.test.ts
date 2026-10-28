import { describe, expect, it } from 'vitest'
import { translations } from '../../lib/i18n'
import { SETTINGS_OPTION_KEY } from '../../providers/language'

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

function collectUsedKeys(): Set<string> {
  const files = import.meta.glob('../../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
  const used = new Set<string>()
  for (const raw of Object.values(files)) {
    const content = (raw ?? '') as string
    if (!content) continue
    // ex: t('common.total')
    for (const match of content.matchAll(/\bt\(\s*['"]([A-Za-z0-9_.]+)['"]/g)) used.add(match[1])
    // ex: translate(language, 'common.total')
    for (const match of content.matchAll(/translate\([^)]*?,\s*['"]([A-Za-z0-9_.]+)['"]/g)) used.add(match[1])
    // ex: t(condition ? 'common.total' : 'common.amount')
    for (const match of content.matchAll(/\bt\([^?)]+ \? ['"]([A-Za-z0-9_.]+)['"] : ['"]([A-Za-z0-9_.]+)['"]/g)) {
      used.add(match[1])
      used.add(match[2])
    }
    // ex: render(someComponent, 'common.total', 'common.amount')
    for (const match of content.matchAll(/\brender\([^,]+, ['"]([A-Za-z0-9_.]+)['"], ['"]([A-Za-z0-9_.]+)['"]/g)) {
      used.add(match[1])
      used.add(match[2])
    }
  }
  // special case, not found by regexps above. check lnSwapLabel in src/lib/swapDisplay.ts
  const stemKeys = ['Send', 'Receive']
  const suffixes = ['Failed', 'Lost', 'Pending', 'Refunded', '']
  for (const stemKey of stemKeys) {
    for (const suffix of suffixes) {
      used.add(`transaction.lightning${stemKey}${suffix}`)
    }
  }
  // Add all keys from SETTINGS_OPTION_KEY to the used set so they are not considered unused.
  for (const key of Object.values(SETTINGS_OPTION_KEY)) {
    used.add(key)
  }
  return used
}
describe('i18n dictionary integrity', () => {
  it('en and es expose the same key set', () => {
    const en = collectLeafKeys(translations.en)
    const es = collectLeafKeys(translations.es)
    expect(new Set(es)).toEqual(new Set(en))
  })

  it('theres no unused keys in the translations object', () => {
    const used = collectUsedKeys()
    const allKeys = new Set(collectLeafKeys(translations.en))
    const unused = [...allKeys].filter((key) => !used.has(key)).sort()
    expect(unused).toEqual([])
  })

  it('every t()/translate() key used in source resolves in the EN dictionary', () => {
    const used = collectUsedKeys()
    const missing = [...used].filter((key) => typeof resolve(translations.en, key) !== 'string').sort()
    expect(missing).toEqual([])
  })

  it('es values are real translations unless the term is universal/technical', () => {
    // Proper nouns, protocol names and technical terms legitimately keep their
    // English form in the Spanish UI (LNURL, Arkade, sats, swap, pubkey...).
    // Any key in the es dictionary that is NOT listed here must be an actual
    // translation, not an English fallback.
    const allowList = new Set([
      'common.sat',
      'common.sats',
      'common.total',
      'settings.general',
      'settings.dust',
      'settings.solvers',
      'settings.auto',
      'settings.arkadeMint',
      'wallet.wallet',
      'transaction.totalTicker',
      'transaction.boarding',
      'transaction.swap',
      'send.bitcoin',
      'components.lnurlAddress',
      'accounts.arknote',
      'delegate.pubkeyLabel',
      'delegate.feeLabel',
      'contracts.script',
      'mint.arkadeMint',
      'mint.ticker',
      'mint.tickerLabel',
      'mint.max',
      'vtxos.subdust',
      'apps.dfx',
      'formatting.unit',
      'accounts.solver',
      // 'Original' is spelled the same in Spanish.
      'solvers.originalLabel',
      // Nostr relay and market-side terms shared across languages.
      'solvers.fieldRelays',
      'solvers.fieldBase',
      'accounts.total',
      // Payment-method names in the receive selector. These are the protocol
      // and product names the user is choosing between, not descriptive text,
      // so they stay as-is in both languages.
      'receive.methodLightning',
      'receive.methodArkade',
      'receive.methodBitcoin',
    ])

    const unlocalized = collectLeafKeys(translations.en)
      .filter((key) => !allowList.has(key))
      .filter((key) => resolve(translations.es, key) === resolve(translations.en, key))
    console.log('es strings identical to en (not allowed):', unlocalized)
    expect(unlocalized).toEqual([])
  })
})
