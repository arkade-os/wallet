import { describe, expect, it, beforeEach } from 'vitest'
import { hex } from '@scure/base'
import {
  recoverKeys,
  keysFromPrivateKey,
  decryptBackup,
  decryptPrfVault,
  isValidMnemonic,
  parsePrfVault,
} from '../../../recovery/crypto'
import { deriveNostrKeyFromMnemonic, setMnemonic } from '../../lib/mnemonic'
import { setPrivateKey, privateKeyToNsec } from '../../lib/privateKey'
import { setMnemonicWithPrf } from '../../lib/passkeyVault'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY, PRF_MNEMONIC_STORAGE_KEY } from '../../lib/storageKeys'

const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('offline recovery tool crypto', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('recoverKeys', () => {
    it('derives exactly the same key as the wallet app (mainnet + testnet)', () => {
      for (const isMainnet of [true, false]) {
        const appKey = deriveNostrKeyFromMnemonic(testMnemonic, isMainnet)
        const recovered = recoverKeys(testMnemonic, isMainnet)
        expect(recovered.privateKeyHex).toBe(hex.encode(appKey))
        expect(recovered.nsec).toBe(privateKeyToNsec(appKey))
      }
    })

    it('normalizes whitespace and case', () => {
      const messy = '  Abandon abandon ABANDON abandon abandon abandon\nabandon abandon abandon abandon abandon about '
      expect(recoverKeys(messy, true)).toEqual(recoverKeys(testMnemonic, true))
    })

    it('throws on an invalid mnemonic', () => {
      expect(() => recoverKeys('invalid words here', true)).toThrow('Invalid recovery phrase')
    })
  })

  describe('keysFromPrivateKey', () => {
    it('encodes nsec/npub consistently with the app', () => {
      const privateKey = deriveNostrKeyFromMnemonic(testMnemonic, true)
      const keys = keysFromPrivateKey(privateKey)
      expect(keys.nsec).toBe(privateKeyToNsec(privateKey))
      expect(keys.privateKeyHex).toBe(hex.encode(privateKey))
    })

    it('rejects keys that are not 32 bytes', () => {
      expect(() => keysFromPrivateKey(new Uint8Array(16))).toThrow()
    })
  })

  describe('decryptBackup', () => {
    it('decrypts an encrypted_mnemonic blob produced by the app', async () => {
      await setMnemonic(testMnemonic, 'hunter2')
      const blob = localStorage.getItem(MNEMONIC_STORAGE_KEY)!
      const result = await decryptBackup(blob, 'hunter2')
      expect(result).toEqual({ kind: 'mnemonic', mnemonic: testMnemonic })
    })

    it('decrypts an encrypted_private_key blob produced by the app', async () => {
      const privateKey = new Uint8Array(32).fill(9)
      await setPrivateKey(privateKey, 'hunter2')
      const blob = localStorage.getItem(NSEC_STORAGE_KEY)!
      const result = await decryptBackup(blob, 'hunter2')
      expect(result.kind).toBe('privateKey')
      if (result.kind === 'privateKey') expect(result.privateKey).toEqual(privateKey)
    })

    it('fails with the wrong password', async () => {
      await setMnemonic(testMnemonic, 'hunter2')
      const blob = localStorage.getItem(MNEMONIC_STORAGE_KEY)!
      await expect(decryptBackup(blob, 'wrong')).rejects.toThrow('wrong password or corrupted backup')
    })

    it('rejects garbage input', async () => {
      await expect(decryptBackup('!!!not-base64!!!', 'x')).rejects.toThrow('not valid base64')
      await expect(decryptBackup('aGVsbG8=', 'x')).rejects.toThrow('too short')
    })
  })

  describe('passkey vault recovery (seized-domain rescue)', () => {
    const prfOutput = () => new Uint8Array(32).fill(7)

    it('decrypts a PRF vault produced by the app', async () => {
      await setMnemonicWithPrf(testMnemonic, 'deadbeef', prfOutput())
      const raw = localStorage.getItem(PRF_MNEMONIC_STORAGE_KEY)!
      expect(parsePrfVault(raw).credentialId).toBe('deadbeef')
      expect(await decryptPrfVault(raw, prfOutput())).toBe(testMnemonic)
    })

    it('fails with the wrong PRF output', async () => {
      await setMnemonicWithPrf(testMnemonic, 'deadbeef', prfOutput())
      const raw = localStorage.getItem(PRF_MNEMONIC_STORAGE_KEY)!
      await expect(decryptPrfVault(raw, new Uint8Array(32).fill(8))).rejects.toThrow('does not match the vault')
    })

    it('rejects malformed vaults', () => {
      expect(() => parsePrfVault('not json')).toThrow('not valid JSON')
      expect(() => parsePrfVault('{"v":2,"credentialId":"a","data":"b"}')).toThrow('expected')
      expect(() => parsePrfVault('{"v":1}')).toThrow('expected')
    })
  })

  describe('isValidMnemonic', () => {
    it('accepts a valid phrase and rejects an invalid one', () => {
      expect(isValidMnemonic(testMnemonic)).toBe(true)
      expect(isValidMnemonic('foo bar baz')).toBe(false)
    })
  })
})
