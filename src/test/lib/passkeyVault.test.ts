import { describe, expect, it, beforeEach } from 'vitest'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import {
  hasPasskeyWallet,
  getPasskeyDescriptor,
  getLastPasskeyId,
  setPasskeyWallet,
  clearPasskeyWallet,
  mnemonicFromPrf,
} from '../../lib/passkeyVault'
import { setMnemonic, hasMnemonic } from '../../lib/mnemonic'
import { setPrivateKey } from '../../lib/privateKey'
import { clearStorage } from '../../lib/storage'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY, PASSKEY_WALLET_STORAGE_KEY } from '../../lib/storageKeys'

const credentialId = 'deadbeef'
const prfA = () => new Uint8Array(32).fill(7)
const prfB = () => new Uint8Array(32).fill(8)

describe('passkey wallet (PRF-derived)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('mnemonicFromPrf', () => {
    it('derives a valid 12-word BIP39 mnemonic', async () => {
      const mnemonic = await mnemonicFromPrf(prfA())
      expect(mnemonic.split(' ')).toHaveLength(12)
      expect(validateMnemonic(mnemonic, wordlist)).toBe(true)
    })

    it('is deterministic for the same PRF output', async () => {
      expect(await mnemonicFromPrf(prfA())).toBe(await mnemonicFromPrf(prfA()))
    })

    it('produces different mnemonics for different PRF outputs', async () => {
      expect(await mnemonicFromPrf(prfA())).not.toBe(await mnemonicFromPrf(prfB()))
    })

    it('does not mutate the caller PRF buffer', async () => {
      const prf = prfA()
      await mnemonicFromPrf(prf)
      expect(prf).toEqual(prfA())
    })
  })

  describe('descriptor storage', () => {
    it('stores and reads the descriptor, holding no secret', () => {
      expect(hasPasskeyWallet()).toBe(false)
      setPasskeyWallet(credentialId)
      expect(hasPasskeyWallet()).toBe(true)
      const desc = getPasskeyDescriptor()
      expect(desc).toEqual({ v: 1, credentialId })
      // the stored value contains only v + credentialId, never a mnemonic/key
      expect(localStorage.getItem(PASSKEY_WALLET_STORAGE_KEY)).toBe(JSON.stringify({ v: 1, credentialId }))
    })

    it('returns null for malformed descriptors', () => {
      localStorage.setItem(PASSKEY_WALLET_STORAGE_KEY, 'not json')
      expect(getPasskeyDescriptor()).toBeNull()
      localStorage.setItem(PASSKEY_WALLET_STORAGE_KEY, JSON.stringify({ v: 2, credentialId }))
      expect(getPasskeyDescriptor()).toBeNull()
    })

    it('clearPasskeyWallet removes the descriptor', () => {
      setPasskeyWallet(credentialId)
      clearPasskeyWallet()
      expect(hasPasskeyWallet()).toBe(false)
    })

    it('remembers the last-used passkey id, surviving a wallet reset', async () => {
      setPasskeyWallet(credentialId)
      expect(getLastPasskeyId()).toBe(credentialId)
      // reset wipes the wallet, but login must still know which passkey to
      // target (identifier only — no secret)
      await clearStorage()
      expect(hasPasskeyWallet()).toBe(false)
      expect(getLastPasskeyId()).toBe(credentialId)
    })
  })

  describe('mutual exclusion of storage keys', () => {
    it('setPasskeyWallet removes password/private-key vaults', () => {
      localStorage.setItem(MNEMONIC_STORAGE_KEY, 'x')
      localStorage.setItem(NSEC_STORAGE_KEY, 'y')
      setPasskeyWallet(credentialId)
      expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
      expect(localStorage.getItem(NSEC_STORAGE_KEY)).toBeNull()
      expect(hasPasskeyWallet()).toBe(true)
    })

    it('setMnemonic removes the passkey descriptor', async () => {
      setPasskeyWallet(credentialId)
      await setMnemonic(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'pw',
      )
      expect(hasPasskeyWallet()).toBe(false)
      expect(hasMnemonic()).toBe(true)
    })

    it('setPrivateKey removes the passkey descriptor', async () => {
      setPasskeyWallet(credentialId)
      await setPrivateKey(new Uint8Array(32).fill(1), 'pw')
      expect(hasPasskeyWallet()).toBe(false)
    })
  })
})
