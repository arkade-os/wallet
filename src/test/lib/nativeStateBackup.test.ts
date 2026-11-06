import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { runInNewContext } from 'node:vm'
import { base64 } from '@scure/base'
import { IndexedDbAssetSwapRepository } from '@arkade-os/swap'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from '../../lib/storageKeys'

const mocks = vi.hoisted(() => ({
  native: true,
  invoke: vi.fn(),
  exportSql: vi.fn(),
  restoreSql: vi.fn(),
  validateSql: vi.fn(),
  values: new Map<string, string>(),
  setSecret: vi.fn(),
}))
vi.mock('../../lib/nativeBridge', () => ({ isNativeHost: () => mocks.native }))
vi.mock('../../lib/nativePlatform', () => ({ invokeWalletHost: mocks.invoke }))
vi.mock('../../lib/secretStore', () => ({
  clearSecrets: async () => {
    mocks.values.clear()
  },
  getSecretStore: () => ({
    getItem: async (key: string) => mocks.values.get(key) ?? null,
    setItem: mocks.setSecret,
    removeItem: async (key: string) => {
      mocks.values.delete(key)
    },
  }),
}))
vi.mock('../../lib/nativeRepositories', () => ({
  exportNativeSqlState: mocks.exportSql,
  restoreNativeSqlState: mocks.restoreSql,
  validateNativeSqlState: mocks.validateSql,
}))

import {
  type NativeStatePayload,
  assertNativeStateReady,
  collectNativeState,
  decodeNativeState,
  decryptNativeState,
  encodeNativeState,
  encryptNativeState,
  exportNativeStateBackup,
  hasPendingNativeStateRestore,
  restoreNativeState,
} from '../../lib/nativeStateBackup'

const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const password = 'test backup password'
const secret = base64.encode(new Uint8Array(64).fill(7))
const sql = { version: 1 as const, namespace: `arkade-native-mutinynet-${publicKey}`, tables: {} }
const wallet = { network: 'mutinynet', pubkey: publicKey, nextRollover: 0 }
const config = { aspUrl: 'https://mutinynet.arkade.sh', pubkey: publicKey, walletMode: 'static' }
const payload = (): NativeStatePayload => ({
  version: 1,
  createdAt: Date.now(),
  network: 'mutinynet',
  publicKey,
  localStorage: { wallet: JSON.stringify(wallet), config: JSON.stringify(config) },
  credentials: { [MNEMONIC_STORAGE_KEY]: secret, [NSEC_STORAGE_KEY]: null },
  indexedDb: [],
  sqlite: sql,
})

async function database(name: string, version: number, create?: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onupgradeneeded = () => create?.(request.result)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transaction(db: IDBDatabase, stores: string[], write: (tx: IDBTransaction) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = () => reject(tx.error)
    write(tx)
  })
}

async function encrypted(value: unknown): Promise<string> {
  return JSON.stringify(await encryptNativeState(value, password))
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  localStorage.clear()
  mocks.native = true
  mocks.values.clear()
  mocks.invoke.mockReset().mockResolvedValue(undefined)
  mocks.exportSql.mockReset().mockResolvedValue(sql)
  mocks.restoreSql.mockReset().mockResolvedValue(undefined)
  mocks.validateSql.mockReset().mockImplementation(async (_network, _key, value) => value)
  mocks.setSecret.mockReset().mockImplementation(async (key: string, value: string) => {
    mocks.values.set(key, value)
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lossless native backup codec', () => {
  it('preserves cross-realm binary data, dates, bigint, IDB keys, references, cycles, and sparse arrays', () => {
    const source = runInNewContext(`(() => {
      const buffer = new Uint8Array([1,2,3,4]).buffer
      const object = {date:new Date(1710000000000), integer:12345678901234567890n,
        bytes:new Uint8Array(buffer,1,2),buffer,undefined:undefined, nan:NaN,zero:-0,
        sparse:new Array(3),key:[new Date(1710000000000),new Uint8Array([7]),Infinity]}
      object.sparse[2]='third';object.self=object
      object.map=new Map([[object.date,object]]);object.set=new Set([object.date])
      return object
    })()`)
    const restored = decodeNativeState(JSON.parse(JSON.stringify(encodeNativeState(source)))) as typeof source
    expect(restored.date.getTime()).toBe(1710000000000)
    expect(restored.integer).toBe(12345678901234567890n)
    expect(Array.from(restored.bytes)).toEqual([2, 3])
    expect(restored.bytes.buffer).toBe(restored.buffer)
    expect(restored.self).toBe(restored)
    expect(restored.map.get(restored.date)).toBe(restored)
    expect(restored.set.has(restored.date)).toBe(true)
    expect(restored.sparse).toHaveLength(3)
    expect(0 in restored.sparse).toBe(false)
    expect(restored.nan).toBeNaN()
    expect(Object.is(restored.zero, -0)).toBe(true)
    expect(indexedDB.cmp(restored.key, [new Date(1710000000000), new Uint8Array([7]), Infinity])).toBe(0)
  })

  it('rejects broken graph references and keeps prototype-named properties as own data', () => {
    expect(() => decodeNativeState({ version: 1, root: { ref: 5 }, nodes: [] })).toThrow()
    const source = JSON.parse('{"__proto__":{"polluted":true},"length":3}')
    const restored = decodeNativeState(encodeNativeState(source)) as Record<string, unknown>
    expect(Object.hasOwn(restored, '__proto__')).toBe(true)
    expect(restored.length).toBe(3)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('rejects aggregate allocation bombs and unreachable nodes before allocating decoded arrays', () => {
    const nodes = Array.from({ length: 64 }, () => ({ type: 'array', length: 200000, entries: [] }))
    expect(JSON.stringify(nodes).length).toBeLessThan(5000)
    expect(() => decodeNativeState({ version: 1, root: { ref: 0 }, nodes })).toThrow('invalid or unsupported')
    expect(() =>
      decodeNativeState({ version: 1, root: null, nodes: [{ type: 'array', length: 1, entries: [] }] }),
    ).toThrow('invalid or unsupported')
  })
})

describe('native backup encryption', () => {
  it('uses the exact bounded envelope and decrypts real AES-GCM/PBKDF2 ciphertext', async () => {
    const value = { preimage: new Uint8Array([1, 2, 3]), amount: 25n }
    const backup = await encryptNativeState(value, password)
    expect(Object.keys(backup).sort()).toEqual(['ciphertext', 'format', 'iterations', 'iv', 'kdf', 'salt', 'version'])
    expect(backup).toMatchObject({
      format: 'arkade-native-state',
      version: 1,
      kdf: 'PBKDF2-SHA256',
      iterations: 600000,
    })
    expect(base64.decode(backup.salt)).toHaveLength(16)
    expect(base64.decode(backup.iv)).toHaveLength(12)
    expect(await decryptNativeState(backup, password)).toEqual(value)
    await expect(decryptNativeState(backup, 'incorrect backup password')).rejects.toThrow('password is incorrect')
    const tampered = { ...backup, ciphertext: base64.encode(new Uint8Array(base64.decode(backup.ciphertext)).fill(0)) }
    await expect(decryptNativeState(tampered, password)).rejects.toThrow('file was changed')
  })

  it('rejects unsupported envelope parameters and short passwords before touching storage', async () => {
    await expect(encryptNativeState({}, 'too short')).rejects.toThrow('at least 12 characters')
    const value = await encryptNativeState({}, password)
    await expect(decryptNativeState({ ...value, iterations: 1 }, password)).rejects.toThrow('invalid or unsupported')
    await expect(decryptNativeState({ ...value, version: 2 }, password)).rejects.toThrow('invalid or unsupported')
    await expect(decryptNativeState({ ...value, plaintext: 'bad' }, password)).rejects.toThrow('invalid or unsupported')
    expect(mocks.restoreSql).not.toHaveBeenCalled()
  })
})

describe('native recovery export and restore', () => {
  it('captures every app IDB schema/preimage while omitting logs and device credentials', async () => {
    localStorage.setItem('wallet', JSON.stringify(wallet))
    localStorage.setItem('config', JSON.stringify(config))
    localStorage.setItem('logs', 'private diagnostics')
    mocks.values.set(MNEMONIC_STORAGE_KEY, secret)
    const db = await database('arkade-swaps', 3, (db) => {
      const records = db.createObjectStore('records', { keyPath: 'id' })
      records.createIndex('status', 'status', { unique: false })
      db.createObjectStore('counter', { autoIncrement: true })
    })
    await transaction(db, ['records', 'counter'], (tx) => {
      tx.objectStore('records').add({
        id: 'swap-1',
        preimage: new Uint8Array([5, 6]),
        date: new Date(1700000000000),
        amount: 9n,
      })
      tx.objectStore('counter').add({ old: true }, 7)
      tx.objectStore('counter').delete(7)
    })
    db.close()
    const state = await collectNativeState()
    expect(state.localStorage.logs).toBeUndefined()
    expect(JSON.parse(state.localStorage.wallet)).toEqual({ ...wallet, lockedByBiometrics: false })
    expect(state.indexedDb[0].version).toBe(3)
    expect(state.indexedDb[0].stores.find((store) => store.name === 'counter')).toMatchObject({ rows: [], nextKey: 8 })
    expect(state.indexedDb[0].stores.find((store) => store.name === 'records')?.rows[0].value).toMatchObject({
      amount: 9n,
    })
    const contents = await encrypted(state)
    vi.stubGlobal('indexedDB', new IDBFactory())
    mocks.values.clear()
    localStorage.clear()
    await restoreNativeState(contents, password)
    const restored = await database('arkade-swaps', 3)
    const store = restored.transaction('records').objectStore('records')
    const row = await new Promise<Record<string, unknown>>((resolve) => {
      const request = store.get('swap-1')
      request.onsuccess = () => resolve(request.result)
    })
    expect(Array.from(row.preimage as Uint8Array)).toEqual([5, 6])
    expect(Number(row.date)).toBe(1700000000000)
    expect(row.amount).toBe(9n)
    expect(Array.from(store.indexNames)).toEqual(['status'])
    const next = await new Promise<IDBValidKey>((resolve) => {
      const tx = restored.transaction('counter', 'readwrite')
      const request = tx.objectStore('counter').add({ new: true })
      request.onsuccess = () => resolve(request.result)
    })
    expect(next).toBe(8)
    restored.close()
    expect(mocks.values.get(MNEMONIC_STORAGE_KEY)).toBe(secret)
    expect(JSON.parse(localStorage.getItem('wallet')!)).toEqual({ ...wallet, lockedByBiometrics: false })
    expect(hasPendingNativeStateRestore()).toBe(false)
  })

  it('uses the native file picker with encrypted content only', async () => {
    localStorage.setItem('wallet', JSON.stringify(wallet))
    localStorage.setItem('config', JSON.stringify(config))
    mocks.values.set(MNEMONIC_STORAGE_KEY, secret)
    await exportNativeStateBackup(password)
    const [command, args] = mocks.invoke.mock.calls[0]
    expect(command).toBe('export_backup')
    expect(args.fileName).toBe('arkade-wallet-backup.json')
    expect(JSON.parse(args.contents).format).toBe('arkade-native-state')
    expect(args.contents).not.toContain(secret)
    expect(args.contents).not.toContain(publicKey)
  })

  it.each([{ lockedByBiometrics: true }, { passkeyId: 'old-device' }])(
    'refuses device-bound biometric exports and imports: %j',
    async (binding) => {
      localStorage.setItem('wallet', JSON.stringify({ ...wallet, ...binding }))
      localStorage.setItem('config', JSON.stringify(config))
      mocks.values.set(MNEMONIC_STORAGE_KEY, secret)
      await expect(exportNativeStateBackup(password)).rejects.toThrow('Switch to a wallet password')
      expect(mocks.invoke).not.toHaveBeenCalled()
      expect(mocks.exportSql).not.toHaveBeenCalled()
      const state = payload()
      state.localStorage.wallet = JSON.stringify({ ...wallet, ...binding })
      localStorage.clear()
      mocks.values.clear()
      await expect(restoreNativeState(await encrypted(state), password)).rejects.toThrow('Switch to a wallet password')
      expect(mocks.restoreSql).not.toHaveBeenCalled()
      expect(localStorage.getItem('wallet')).toBeNull()
      expect(hasPendingNativeStateRestore()).toBe(false)
    },
  )

  it('refuses to overwrite an existing wallet, even before native SQL preflight', async () => {
    localStorage.setItem('wallet', JSON.stringify(wallet))
    await expect(restoreNativeState(await encrypted(payload()), password)).rejects.toThrow('empty app profile')
    expect(mocks.validateSql).not.toHaveBeenCalled()
    expect(mocks.restoreSql).not.toHaveBeenCalled()
    expect(localStorage.getItem('wallet')).toBe(JSON.stringify(wallet))
    expect(hasPendingNativeStateRestore()).toBe(false)
  })

  it('restores after native reset removes the old identity from preserved preferences', async () => {
    const contents = await encrypted(payload())
    localStorage.setItem('wallet', JSON.stringify(wallet))
    localStorage.setItem(
      'config',
      JSON.stringify({ ...config, walletMode: 'hd', importedAssets: ['old'], apps: { assets: { enabled: true } } }),
    )
    mocks.values.set(MNEMONIC_STORAGE_KEY, secret)
    await (await import('../../lib/storage')).clearStorage()
    const saved = JSON.parse(localStorage.getItem('config')!)
    expect(saved.pubkey).toBe('')
    expect(saved.walletMode).toBe('static')
    expect(mocks.values.size).toBe(0)
    await restoreNativeState(contents, password)
    expect(JSON.parse(localStorage.getItem('wallet')!).pubkey).toBe(publicKey)
    expect(hasPendingNativeStateRestore()).toBe(false)
  })

  it('refuses existing orphaned vault credentials or unrelated IDB state', async () => {
    const contents = await encrypted(payload())
    mocks.values.set(NSEC_STORAGE_KEY, secret)
    await expect(restoreNativeState(contents, password)).rejects.toThrow('empty app profile')
    mocks.values.clear()
    const db = await database('existing-state', 1, (db) => db.createObjectStore('records'))
    await transaction(db, ['records'], (tx) => {
      tx.objectStore('records').add('keep me', 'existing')
    })
    db.close()
    await expect(restoreNativeState(contents, password)).rejects.toThrow('Existing wallet database state')
    expect(mocks.restoreSql).not.toHaveBeenCalled()
  })

  it('restores full swap recovery state over only the SDK public markets cache in a fresh profile', async () => {
    localStorage.setItem('wallet', JSON.stringify(wallet))
    localStorage.setItem('config', JSON.stringify(config))
    mocks.values.set(MNEMONIC_STORAGE_KEY, secret)
    const source = new IndexedDbAssetSwapRepository()
    await source.saveCachedMarkets('mutinynet', 'registry', { markets: [], fetchedAt: 1 })
    const original = await database('arkade-intents', 5)
    await transaction(original, ['swapRecords'], (tx) => {
      tx.objectStore('swapRecords').add({ id: 'pending-swap', preimage: new Uint8Array([4, 2]) })
    })
    original.close()
    await source[Symbol.asyncDispose]()
    const contents = await encrypted(await collectNativeState())
    vi.stubGlobal('indexedDB', new IDBFactory())
    localStorage.clear()
    mocks.values.clear()
    const warm = new IndexedDbAssetSwapRepository()
    await warm.saveCachedMarkets('mutinynet', 'registry', { markets: [], fetchedAt: 999 })
    await warm[Symbol.asyncDispose]()

    await restoreNativeState(contents, password)

    const restored = new IndexedDbAssetSwapRepository()
    expect((await restored.getCachedMarkets('mutinynet', 'registry'))?.fetchedAt).toBe(1)
    const restoredSwap = await restored.getSwapRecord('pending-swap')
    expect(Array.from((restoredSwap as unknown as { preimage: Uint8Array }).preimage)).toEqual([4, 2])
    await restored[Symbol.asyncDispose]()
    expect(hasPendingNativeStateRestore()).toBe(false)
  })

  it('preserves funded swap records and public markets when an existing profile is refused', async () => {
    const warm = new IndexedDbAssetSwapRepository()
    await warm.saveCachedMarkets('mutinynet', 'registry', { markets: [], fetchedAt: 999 })
    const db = await database('arkade-intents', 5)
    await transaction(db, ['swapRecords'], (tx) => {
      tx.objectStore('swapRecords').add({ id: 'funded-swap', preimage: new Uint8Array([9]) })
    })
    db.close()
    await expect(restoreNativeState(await encrypted(payload()), password)).rejects.toThrow(
      'Existing wallet database state',
    )
    expect(await warm.getSwapRecord('funded-swap')).toBeDefined()
    expect((await warm.getCachedMarkets('mutinynet', 'registry'))?.fetchedAt).toBe(999)
    expect(mocks.restoreSql).not.toHaveBeenCalled()
    expect(hasPendingNativeStateRestore()).toBe(false)
    await warm[Symbol.asyncDispose]()
  })

  it('validates backup identity and schema references before staging or payload writes', async () => {
    const state = payload()
    state.publicKey = '02' + '00'.repeat(32)
    await expect(restoreNativeState(await encrypted(state), password)).rejects.toThrow('invalid or unsupported')
    const broken = payload()
    broken.indexedDb = [
      {
        name: 'bad',
        version: 1,
        stores: [
          {
            name: 'rows',
            keyPath: 'id',
            autoIncrement: false,
            indexes: [],
            rows: [{ key: 'different-id', value: { id: 'id' } }],
          },
        ],
      },
    ]
    await expect(restoreNativeState(await encrypted(broken), password)).rejects.toThrow('invalid or unsupported')
    mocks.validateSql.mockRejectedValueOnce(new Error('Incompatible SQL schema'))
    await expect(restoreNativeState(await encrypted(payload()), password)).rejects.toThrow('Incompatible SQL schema')
    expect(mocks.restoreSql).not.toHaveBeenCalled()
    expect(hasPendingNativeStateRestore()).toBe(false)
  })

  it('keeps a failed restore closed and retries only the same encrypted backup', async () => {
    const contents = await encrypted(payload())
    mocks.restoreSql.mockRejectedValueOnce(new Error('Storage failure'))
    await expect(restoreNativeState(contents, password)).rejects.toThrow('Storage failure')
    expect(localStorage.getItem('wallet')).toBeNull()
    expect(hasPendingNativeStateRestore()).toBe(true)
    expect(() => assertNativeStateReady()).toThrow('Finish restoring')
    await expect(restoreNativeState(await encrypted(payload()), password)).rejects.toThrow('same backup file')
    await restoreNativeState(contents, password)
    expect(hasPendingNativeStateRestore()).toBe(false)
    expect(() => assertNativeStateReady()).not.toThrow()
    expect(localStorage.getItem('wallet')).not.toBeNull()
  })

  it('withholds wallet metadata when vault restoration fails after IDB writes and resumes without clearing data', async () => {
    const state = payload()
    state.indexedDb = [
      {
        name: 'swap-state',
        version: 1,
        stores: [
          {
            name: 'records',
            keyPath: null,
            autoIncrement: false,
            indexes: [],
            rows: [{ key: 'swap', value: { preimage: new Uint8Array([8]) } }],
          },
        ],
      },
    ]
    const contents = await encrypted(state)
    mocks.setSecret.mockRejectedValueOnce(new Error('Vault unavailable'))
    await expect(restoreNativeState(contents, password)).rejects.toThrow('Vault unavailable')
    expect(localStorage.getItem('wallet')).toBeNull()
    expect(hasPendingNativeStateRestore()).toBe(true)
    await restoreNativeState(contents, password)
    expect(localStorage.getItem('wallet')).not.toBeNull()
    expect(hasPendingNativeStateRestore()).toBe(false)
  })
})
