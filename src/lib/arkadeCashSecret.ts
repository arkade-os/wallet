import { getPublicKey, nip44 } from 'nostr-tools'

export function cashSecretCipher(seckey: Uint8Array) {
  if (seckey.length !== 32) throw new Error('Invalid voucher encryption key')
  const key = nip44.getConversationKey(seckey, getPublicKey(seckey))
  return {
    encrypt(data: string): string {
      return nip44.encrypt(data, key)
    },
    decrypt(data: string): string {
      return nip44.decrypt(data, key)
    },
  }
}
