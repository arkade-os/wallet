import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from '../../lib/storageKeys'

type HostWindow = Window & { __ARKADE_NATIVE__?: unknown; __TAURI__?: unknown }
const host = window as HostWindow

function vault(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  const invoke = vi.fn(async (command: string, args: Record<string, unknown>) => {
    const key = String(args.key)
    if (command === 'plugin:wallet|secret_get') return values.get(key) ?? null
    if (command === 'plugin:wallet|secret_set') values.set(key, String(args.value))
    else if (command === 'plugin:wallet|secret_remove') values.delete(key)
    else throw new Error('Unexpected command')
    return undefined
  })
  host.__ARKADE_NATIVE__ = { version: 1, platform: 'android' }
  host.__TAURI__ = { core: { invoke } }
  return { values, invoke }
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

afterEach(() => {
  delete host.__ARKADE_NATIVE__
  delete host.__TAURI__
})

describe('native credential storage', () => {
  it('uses browser encrypted storage when running as a PWA', async () => {
    const { getSecretStore, hasSecret, initializeSecretStore, clearSecrets } = await import('../../lib/secretStore')
    await initializeSecretStore()
    await getSecretStore().setItem(MNEMONIC_STORAGE_KEY, 'encrypted-blob')
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBe('encrypted-blob')
    expect(hasSecret(MNEMONIC_STORAGE_KEY)).toBe(true)
    await clearSecrets()
    expect(hasSecret(MNEMONIC_STORAGE_KEY)).toBe(false)
  })

  it('keeps reads closed before native initialization and loads existing vault presence at boot', async () => {
    vault({ [NSEC_STORAGE_KEY]: 'encrypted-key' })
    const store = await import('../../lib/secretStore')
    expect(() => store.hasSecret(NSEC_STORAGE_KEY)).toThrow('Secure wallet storage is unavailable')
    expect(() => store.getSecretStore()).toThrow('Secure wallet storage is unavailable')
    await store.initializeSecretStore()
    expect(store.hasSecret(MNEMONIC_STORAGE_KEY)).toBe(false)
    expect(store.hasSecret(NSEC_STORAGE_KEY)).toBe(true)
    expect(await store.getSecretStore().getItem(NSEC_STORAGE_KEY)).toBe('encrypted-key')
    expect(localStorage.getItem(NSEC_STORAGE_KEY)).toBeNull()
  })

  it('migrates both previous encrypted blobs only after successful readback', async () => {
    const native = vault()
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'old-encrypted-mnemonic')
    localStorage.setItem(NSEC_STORAGE_KEY, 'old-encrypted-key')
    const store = await import('../../lib/secretStore')
    await store.initializeSecretStore()
    expect(Object.fromEntries(native.values)).toEqual({
      [MNEMONIC_STORAGE_KEY]: 'old-encrypted-mnemonic',
      [NSEC_STORAGE_KEY]: 'old-encrypted-key',
    })
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(NSEC_STORAGE_KEY)).toBeNull()
    expect(store.hasSecret(MNEMONIC_STORAGE_KEY)).toBe(true)
    const before = native.invoke.mock.calls.length
    await store.initializeSecretStore()
    expect(native.invoke.mock.calls).toHaveLength(before)
  })

  it('decrypts an existing PWA-format mnemonic unchanged after native migration', async () => {
    const mnemonic = await import('../../lib/mnemonic')
    const phrase = 'abandon '.repeat(11) + 'about'
    await mnemonic.setMnemonic(phrase, 'existing-password')
    const encrypted = localStorage.getItem(MNEMONIC_STORAGE_KEY)
    const native = vault()
    await (await import('../../lib/secretStore')).initializeSecretStore()
    expect(native.values.get(MNEMONIC_STORAGE_KEY)).toBe(encrypted)
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
    expect(await mnemonic.getMnemonic('existing-password')).toBe(phrase)
    await expect(mnemonic.getMnemonic('incorrect-password')).rejects.toThrow()
  })

  it('preserves a legacy blob if writing fails and never falls back after that failure', async () => {
    const native = vault()
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'old-encrypted-mnemonic')
    native.invoke.mockImplementation(async () => {
      throw new Error('Native error including sensitive native details')
    })
    const store = await import('../../lib/secretStore')
    await expect(store.initializeSecretStore()).rejects.toThrow(
      'Secure wallet storage is unavailable. Restart the app to retry.',
    )
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBe('old-encrypted-mnemonic')
    expect(() => store.getSecretStore()).toThrow('Secure wallet storage is unavailable')
  })

  it('retries a failed initialization after storage unlock without reopening the module or losing credentials', async () => {
    const native = vault({ [NSEC_STORAGE_KEY]: 'existing-encrypted-key' })
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'legacy-encrypted-mnemonic')
    native.invoke.mockRejectedValueOnce(new Error('Vault locked'))
    const store = await import('../../lib/secretStore')
    await expect(store.initializeSecretStore()).rejects.toThrow('Secure wallet storage is unavailable')
    expect(() => store.getSecretStore()).toThrow('Secure wallet storage is unavailable')
    expect(() => store.hasSecret(NSEC_STORAGE_KEY)).toThrow('Secure wallet storage is unavailable')
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBe('legacy-encrypted-mnemonic')
    expect(Object.fromEntries(native.values)).toEqual({ [NSEC_STORAGE_KEY]: 'existing-encrypted-key' })

    let unlock!: () => void
    const unlocked = new Promise<void>((resolve) => {
      unlock = resolve
    })
    native.invoke.mockClear()
    native.invoke.mockImplementationOnce(async (_command, args) => {
      await unlocked
      return native.values.get(String(args.key)) ?? null
    })
    const retry = store.initializeSecretStore()
    expect(store.initializeSecretStore()).toBe(retry)
    expect(native.invoke).toHaveBeenCalledOnce()
    expect(() => store.getSecretStore()).toThrow('Secure wallet storage is unavailable')
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBe('legacy-encrypted-mnemonic')
    unlock()
    await retry

    expect(native.invoke.mock.calls).toEqual([
      ['plugin:wallet|secret_get', { key: MNEMONIC_STORAGE_KEY }],
      ['plugin:wallet|secret_set', { key: MNEMONIC_STORAGE_KEY, value: 'legacy-encrypted-mnemonic' }],
      ['plugin:wallet|secret_get', { key: MNEMONIC_STORAGE_KEY }],
      ['plugin:wallet|secret_get', { key: NSEC_STORAGE_KEY }],
    ])
    expect(Object.fromEntries(native.values)).toEqual({
      [MNEMONIC_STORAGE_KEY]: 'legacy-encrypted-mnemonic',
      [NSEC_STORAGE_KEY]: 'existing-encrypted-key',
    })
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
    expect(store.hasSecret(MNEMONIC_STORAGE_KEY)).toBe(true)
    expect(store.hasSecret(NSEC_STORAGE_KEY)).toBe(true)
    expect(await store.getSecretStore().getItem(NSEC_STORAGE_KEY)).toBe('existing-encrypted-key')
    const calls = native.invoke.mock.calls.length
    await store.initializeSecretStore()
    expect(native.invoke).toHaveBeenCalledTimes(calls)
  })

  it('preserves the browser copy when native readback differs and refuses initialization', async () => {
    const native = vault()
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'old-encrypted-mnemonic')
    native.invoke.mockImplementation(async (command) => {
      if (command === 'plugin:wallet|secret_set') native.values.set(MNEMONIC_STORAGE_KEY, 'corrupted')
      return native.values.get(MNEMONIC_STORAGE_KEY) ?? null
    })
    const store = await import('../../lib/secretStore')
    await expect(store.initializeSecretStore()).rejects.toThrow('Secure wallet storage is unavailable')
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBe('old-encrypted-mnemonic')
    expect(() => store.hasSecret(MNEMONIC_STORAGE_KEY)).toThrow('Secure wallet storage is unavailable')
  })

  it('does not overwrite a different credential already present in the vault', async () => {
    const native = vault({ [MNEMONIC_STORAGE_KEY]: 'existing-encrypted-mnemonic' })
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'legacy-encrypted-mnemonic')
    const store = await import('../../lib/secretStore')
    await expect(store.initializeSecretStore()).rejects.toThrow('Secure wallet storage is unavailable')
    expect(native.values.get(MNEMONIC_STORAGE_KEY)).toBe('existing-encrypted-mnemonic')
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBe('legacy-encrypted-mnemonic')
    expect(native.invoke.mock.calls.every(([command]) => command === 'plugin:wallet|secret_get')).toBe(true)
  })

  it('resumes a migration interrupted after copying to the vault', async () => {
    vault({ [MNEMONIC_STORAGE_KEY]: 'matching-encrypted-blob' })
    localStorage.setItem(MNEMONIC_STORAGE_KEY, 'matching-encrypted-blob')
    const store = await import('../../lib/secretStore')
    await store.initializeSecretStore()
    expect(store.hasSecret(MNEMONIC_STORAGE_KEY)).toBe(true)
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
  })

  it('never falls back to browser storage when the native bridge is missing', async () => {
    host.__ARKADE_NATIVE__ = { version: 1, platform: 'android' }
    localStorage.setItem(NSEC_STORAGE_KEY, 'browser-blob')
    const store = await import('../../lib/secretStore')
    await expect(store.initializeSecretStore()).rejects.toThrow('Secure wallet storage is unavailable')
    expect(localStorage.getItem(NSEC_STORAGE_KEY)).toBe('browser-blob')
  })

  it('clears vault credentials even after localStorage was cleared separately', async () => {
    const native = vault({ [MNEMONIC_STORAGE_KEY]: 'mnemonic-blob', [NSEC_STORAGE_KEY]: 'key-blob' })
    const store = await import('../../lib/secretStore')
    await store.initializeSecretStore()
    localStorage.clear()
    await store.clearSecrets()
    expect(native.values.size).toBe(0)
    expect(store.hasSecret(MNEMONIC_STORAGE_KEY)).toBe(false)
    expect(store.hasSecret(NSEC_STORAGE_KEY)).toBe(false)
  })

  it('refuses to report a reset as complete when removing a vault credential fails', async () => {
    const native = vault({ [MNEMONIC_STORAGE_KEY]: 'mnemonic-blob' })
    const store = await import('../../lib/secretStore')
    await store.initializeSecretStore()
    localStorage.setItem('wallet', 'existing-wallet-metadata')
    native.invoke.mockImplementation(async (command, args) => {
      if (command === 'plugin:wallet|secret_remove') throw new Error('Unavailable')
      return native.values.get(String(args.key)) ?? null
    })
    const { clearStorage } = await import('../../lib/storage')
    await expect(clearStorage()).rejects.toThrow('Secure wallet storage is unavailable')
    expect(native.values.get(MNEMONIC_STORAGE_KEY)).toBe('mnemonic-blob')
    expect(localStorage.getItem('wallet')).toBe('existing-wallet-metadata')
  })

  it('creates and restores a mnemonic wallet using vault storage and the existing password format', async () => {
    const native = vault()
    const { initializeSecretStore } = await import('../../lib/secretStore')
    await initializeSecretStore()
    let mnemonic = await import('../../lib/mnemonic')
    let passwords = await import('../../lib/privateKey')
    const phrase = 'abandon '.repeat(11) + 'about'
    await mnemonic.setMnemonic(phrase, 'test-password')
    expect(mnemonic.hasMnemonic()).toBe(true)
    expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
    expect(native.values.get(MNEMONIC_STORAGE_KEY)).not.toContain('abandon')
    expect(await passwords.isValidPassword('wrong-password')).toBe(false)
    expect(await passwords.isValidPassword('test-password')).toBe(true)

    vi.resetModules()
    await (await import('../../lib/secretStore')).initializeSecretStore()
    mnemonic = await import('../../lib/mnemonic')
    passwords = await import('../../lib/privateKey')
    expect(mnemonic.hasMnemonic()).toBe(true)
    expect(await mnemonic.getMnemonic('test-password')).toBe(phrase)
    expect(await passwords.isValidPassword('test-password')).toBe(true)

    await mnemonic.setMnemonic(phrase, 'new-password')
    expect(await passwords.isValidPassword('test-password')).toBe(false)
    expect(await passwords.isValidPassword('new-password')).toBe(true)
  })

  it('switches to a private-key wallet without leaving the previous mnemonic in either store', async () => {
    const native = vault()
    const store = await import('../../lib/secretStore')
    await store.initializeSecretStore()
    const mnemonic = await import('../../lib/mnemonic')
    const privateKey = await import('../../lib/privateKey')
    await mnemonic.setMnemonic('abandon '.repeat(11) + 'about', 'test-password')
    const key = new Uint8Array(32).fill(1)
    await privateKey.setPrivateKey(key, 'test-password')
    expect(store.hasSecret(MNEMONIC_STORAGE_KEY)).toBe(false)
    expect(store.hasSecret(NSEC_STORAGE_KEY)).toBe(true)
    expect(native.values.has(MNEMONIC_STORAGE_KEY)).toBe(false)
    expect(await privateKey.getPrivateKey('test-password')).toEqual(key)
    expect(await privateKey.isValidPassword('wrong-password')).toBe(false)
    expect(localStorage.getItem(NSEC_STORAGE_KEY)).toBeNull()
  })
})
