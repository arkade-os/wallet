import { wordlist } from '@scure/bip39/wordlists/english'

export function completeMnemonicWord(value: string): string {
  if (!/\s/.test(value) && (/^nsec/i.test(value) || /^[0-9a-fA-F]{64}$/.test(value))) {
    return value
  }

  if (/\s$/.test(value)) {
    return value
  }

  const match = value.match(/(\S+)$/)
  if (!match) {
    return value
  }

  const token = match[1]
  const tokenStart = value.length - token.length

  if (token.length < 4) {
    return value
  }

  const lowerToken = token.toLowerCase()
  let singleMatch: string | null = null
  let matchCount = 0

  for (const word of wordlist) {
    if (word.startsWith(lowerToken)) {
      matchCount++
      singleMatch = word
      if (matchCount > 1) {
        break
      }
    }
  }

  if (matchCount !== 1 || singleMatch === null || lowerToken === singleMatch) {
    return value
  }

  return value.slice(0, tokenStart) + singleMatch + ' '
}
