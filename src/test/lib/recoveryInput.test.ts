import { describe, expect, it } from 'vitest'
import { entropyToMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { nip19 } from 'nostr-tools'
import { getRecoverySuggestions, getRecoveryWord, parseRecoveryInput } from '../../lib/recoveryInput'

// Public, deterministic fixtures; never use a funded wallet in these tests.
const privateKey = Uint8Array.from({ length: 32 }, () => 1)

describe('recovery input', () => {
  it('suggests prefixes from two characters, including four-letter metal backups', () => {
    expect(getRecoverySuggestions('a', 1)).toEqual([])
    expect(getRecoverySuggestions('ah', 2)).toEqual(['ahead'])
    expect(getRecoverySuggestions('ag', 2)).toEqual(['again', 'age', 'agent', 'agree'])
    expect(getRecoverySuggestions('aban', 4)).toEqual(['abandon'])
    expect(getRecoverySuggestions('ahead agree ', 12)).toEqual([])
  })

  it('targets the word at the caret, including edits in the middle', () => {
    expect(getRecoveryWord('ahead agr about', 8)).toEqual({ word: 'agr', start: 6, end: 9, index: 1 })
    expect(getRecoverySuggestions('ahead agr about', 8)).toEqual(['agree'])
    expect(getRecoverySuggestions('ahead', null)).toEqual([])
  })

  it('suppresses suggestions for keys without treating short hex-like words as keys', () => {
    expect(getRecoverySuggestions('nsec1abcdef', 11)).toEqual([])
    expect(getRecoverySuggestions('abcdefab', 8)).toEqual([])
    expect(getRecoverySuggestions('ab12', 4)).toEqual([])
    expect(getRecoverySuggestions('face', 4)).toEqual(['face'])
  })

  it.each([16, 20, 24, 28, 32])('preserves support for a %i-byte BIP39 entropy phrase', (bytes) => {
    const mnemonic = entropyToMnemonic(new Uint8Array(bytes), wordlist)
    expect(parseRecoveryInput(`  ${mnemonic.toUpperCase().replaceAll(' ', '\n\t')}  `)).toMatchObject({
      kind: 'phrase',
      mnemonic,
    })
  })

  it('distinguishes empty input, unknown words, missing words and a bad checksum', () => {
    expect(parseRecoveryInput('  ')).toEqual({ kind: 'empty' })
    expect(parseRecoveryInput('ahead abnadon')).toMatchObject({ error: 'word', wordIndex: 1 })
    expect(parseRecoveryInput('ahead agree')).toMatchObject({ error: 'count', count: 2 })
    expect(parseRecoveryInput(Array(12).fill('abandon').join(' '))).toMatchObject({ error: 'checksum' })
  })

  it('accepts nsec and hex and rejects malformed, zero and out-of-range keys', () => {
    expect(parseRecoveryInput(nip19.nsecEncode(privateKey))).toEqual({ kind: 'key', privateKey })
    expect(parseRecoveryInput('01'.repeat(32))).toEqual({ kind: 'key', privateKey })
    for (const invalid of ['nsec1bad', '01'.repeat(31), '00'.repeat(32), 'ff'.repeat(32)]) {
      expect(parseRecoveryInput(invalid)).toEqual({ kind: 'key', error: 'key' })
    }
  })
})
