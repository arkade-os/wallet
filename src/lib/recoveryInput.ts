import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { hex } from '@scure/base'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { nsecToPrivateKey } from './privateKey'

const words = new Set(wordlist)

export function isPrivateKeyInput(value: string): boolean {
  const trimmed = value.trim()
  return (
    !/\s/.test(trimmed) &&
    (/^nsec/i.test(trimmed) || (/^[\da-f]+$/i.test(trimmed) && (trimmed.length >= 8 || /\d/.test(trimmed))))
  )
}

export function getRecoveryWord(value: string, cursor: number | null) {
  if (cursor === null) return undefined
  return [...value.matchAll(/\S+/g)]
    .map((match, idx) => ({
      word: match[0],
      start: match.index!,
      end: match.index! + match[0].length,
      index: idx,
    }))
    .find(({ start, end }) => cursor >= start && cursor <= end)
}

export function getRecoverySuggestions(value: string, cursor: number | null): string[] {
  if (isPrivateKeyInput(value)) return []
  const token = getRecoveryWord(value, cursor)
  if (!token || token.word.length < 2 || !/^[a-z]+$/i.test(token.word)) return []
  return wordlist.filter((word) => word.startsWith(token.word.toLowerCase())).slice(0, 8)
}

export type RecoveryInput =
  | { kind: 'empty' }
  | { kind: 'key'; privateKey?: Uint8Array; error?: 'key' }
  | { kind: 'phrase'; count: number; mnemonic?: string; error?: 'word' | 'count' | 'checksum'; wordIndex?: number }

export function parseRecoveryInput(value: string): RecoveryInput {
  const trimmed = value.trim()
  if (!trimmed) return { kind: 'empty' }
  if (isPrivateKeyInput(trimmed)) {
    try {
      const privateKey = /^nsec/i.test(trimmed) ? nsecToPrivateKey(trimmed) : hex.decode(trimmed)
      if (secp256k1.utils.isValidSecretKey(privateKey)) return { kind: 'key', privateKey }
    } catch {
      // Keep parser details and the entered secret out of user-facing errors.
    }
    return { kind: 'key', error: 'key' }
  }

  const tokens = trimmed.toLowerCase().split(/\s+/)
  const count = tokens.length
  const wordIndex = tokens.findIndex((word) => !words.has(word))
  if (wordIndex !== -1) return { kind: 'phrase', count, error: 'word', wordIndex }
  if (![12, 15, 18, 21, 24].includes(count)) return { kind: 'phrase', count, error: 'count' }
  const mnemonic = tokens.join(' ')
  return validateMnemonic(mnemonic, wordlist)
    ? { kind: 'phrase', count, mnemonic }
    : { kind: 'phrase', count, error: 'checksum' }
}
