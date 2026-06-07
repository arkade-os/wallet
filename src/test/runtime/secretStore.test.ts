import { afterEach, describe, expect, it } from 'vitest'
import { getSecretStore, setSecretStore } from '../../lib/secretStore'
import { hasMnemonic, setMnemonic } from '../../lib/mnemonic'
import type { SecretStorageAdapter } from '../../runtime/types'

// Restore the default (localStorage) store after each test so other suites are
// unaffected by the injected adapter.
const localStorageStore: SecretStorageAdapter = {
  getItem: async (k) => localStorage.getItem(k),
  setItem: async (k, v) => {
    localStorage.setItem(k, v)
  },
  removeItem: async (k) => {
    localStorage.removeItem(k)
  },
}

describe('secret store routing', () => {
  afterEach(() => {
    setSecretStore(localStorageStore)
    localStorage.clear()
  })

  it('defaults to a localStorage-backed store', async () => {
    setSecretStore(localStorageStore)
    await setMnemonic(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      'pw',
    )
    expect(localStorage.getItem('encrypted_mnemonic')).not.toBeNull()
    expect(await hasMnemonic()).toBe(true)
  })

  it('routes secret reads/writes through the injected adapter', async () => {
    const mem = new Map<string, string>()
    const memStore: SecretStorageAdapter = {
      getItem: async (k) => mem.get(k) ?? null,
      setItem: async (k, v) => {
        mem.set(k, v)
      },
      removeItem: async (k) => {
        mem.delete(k)
      },
    }
    setSecretStore(memStore)
    expect(getSecretStore()).toBe(memStore)

    await setMnemonic(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      'pw',
    )
    // Written to the injected store, not localStorage.
    expect(mem.has('encrypted_mnemonic')).toBe(true)
    expect(localStorage.getItem('encrypted_mnemonic')).toBeNull()
    expect(await hasMnemonic()).toBe(true)
  })
})
