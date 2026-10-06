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
  const lowerToken = token.toLowerCase()
  const found = wordlist.filter((w) => w.startsWith(lowerToken))
  if (found.length !== 1 || found[0] === lowerToken) return value

  const tokenStart = value.length - token.length
  return value.slice(0, tokenStart) + found[0] + ' '
}
