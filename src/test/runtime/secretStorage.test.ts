import { afterEach, describe, expect, it, vi } from 'vitest'

// Back the secure-storage plugin with an in-memory map so the adapter's
// delegation can be tested without a native runtime.
const store = new Map<string, string>()
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: async (k: string) => {
      store.delete(k)
    },
  },
}))

import { nativeSecretStorage } from '../../runtime/secretStorage'

describe('nativeSecretStorage', () => {
  afterEach(() => store.clear())

  it('round-trips the encrypted blob through the secure-storage plugin', async () => {
    expect(await nativeSecretStorage.getItem('encrypted_mnemonic')).toBeNull()

    await nativeSecretStorage.setItem('encrypted_mnemonic', 'blob==')
    expect(store.get('encrypted_mnemonic')).toBe('blob==')
    expect(await nativeSecretStorage.getItem('encrypted_mnemonic')).toBe('blob==')

    await nativeSecretStorage.removeItem('encrypted_mnemonic')
    expect(await nativeSecretStorage.getItem('encrypted_mnemonic')).toBeNull()
  })
})
