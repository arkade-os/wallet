import type { CashRecordStore } from './arkadeCashTransfer'
import { cashSecretCipher } from './arkadeCashSecret'

export const encryptedSecretStorage = (seckey: Uint8Array): CashRecordStore => {
  const cipher = cashSecretCipher(seckey)
  return {
    save: async (records) => localStorage.setItem('arkade-cash', cipher.encrypt(JSON.stringify(records))),
    load: async () => {
      const stored = localStorage.getItem('arkade-cash')
      if (!stored) return []
      const parsed: unknown = JSON.parse(cipher.decrypt(stored))
      if (
        !Array.isArray(parsed) ||
        parsed.some((record) => typeof record?.id !== 'string' || !['issued', 'claimed'].includes(record?.action))
      ) {
        throw new Error('Saved vouchers are from another wallet')
      }
      if (parsed.some((record) => typeof record.token === 'string' && !/^t?arkadecash1/.test(record.token))) {
        localStorage.removeItem('arkade-cash')
        throw new Error('Saved voucher data is invalid')
      }
      return parsed
    },
    clear: async () => localStorage.removeItem('arkade-cash'),
  }
}
