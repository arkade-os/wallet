import { Currencies } from './types'

const europeanRegions = new Set([
  'ad',
  'al',
  'at',
  'ax',
  'ba',
  'be',
  'bg',
  'by',
  'cy',
  'cz',
  'de',
  'dk',
  'ee',
  'es',
  'fi',
  'fo',
  'fr',
  'gi',
  'gr',
  'hr',
  'hu',
  'ie',
  'im',
  'is',
  'it',
  'je',
  'li',
  'lt',
  'lu',
  'lv',
  'mc',
  'md',
  'me',
  'mk',
  'mt',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'rs',
  'se',
  'si',
  'sk',
  'sm',
  'ua',
  'va',
  'xk',
])

const europeanLanguages = new Set([
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'et',
  'fi',
  'fr',
  'ga',
  'hr',
  'hu',
  'is',
  'it',
  'lt',
  'lv',
  'mt',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'sk',
  'sl',
  'sq',
  'sr',
  'sv',
  'tr',
  'uk',
])

export function getCurrency(locale = navigator.language || 'en-US'): Currencies {
  const normalizedLocale = locale.toLowerCase()
  const [language, region] = normalizedLocale.split(/[-_]/)

  if (region === 'br') return Currencies.BRL
  if (region === 'gb') return Currencies.GBP
  if (region === 'ch') return Currencies.CHF
  if (language === 'ja' || region === 'jp') return Currencies.JPY
  if (language === 'zh' || region === 'cn') return Currencies.CNY
  if (europeanRegions.has(region) || europeanLanguages.has(language)) return Currencies.EUR

  return Currencies.USD
}
