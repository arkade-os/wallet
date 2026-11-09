// @vitest-environment node
import 'fake-indexeddb/auto'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IndexedDBContractRepository,
  IndexedDBWalletRepository,
  TxType,
  collectContracts,
  collectTransactionHistory,
  collectUtxos,
  collectVtxos,
  type Contract,
  type ExtendedVirtualCoin,
} from '@arkade-os/sdk'
import { TaprootControlBlock } from '@scure/btc-signer'
import { createNativeRepositories, nativeRepositoryNamespace } from '../../lib/nativeRepositories'

const databases: DatabaseSync[] = []
let id = 0
let sql: DatabaseSync
let failure: ((sql: string, values: unknown[]) => boolean) | undefined
let options: Parameters<typeof createNativeRepositories>[0]
let invoke: ReturnType<typeof vi.fn>

beforeEach(() => {
  sql = new DatabaseSync(':memory:')
  databases.push(sql)
  failure = undefined
  options = { network: 'mutinynet', publicKey: `02${(++id).toString(16).padStart(64, '0')}` }
  invoke = vi.fn(async (command: string, args: { sql: string; values: SQLInputValue[] }) => {
    if (failure?.(args.sql, args.values)) throw new Error('Injected storage failure')
    const statement = sql.prepare(args.sql)
    if (command.endsWith('|run')) {
      statement.run(...args.values)
      return
    }
    return statement.all(...args.values)
  })
  vi.stubGlobal('window', { indexedDB, __TAURI__: { core: { invoke } } })
})

afterEach(() => {
  vi.unstubAllGlobals()
  databases.splice(0).forEach((database) => database.close())
})

const contract = (script = '5120abcd'): Contract => ({
  script,
  address: 'test-address',
  type: 'vhtlc',
  params: { preimage: 'saved-claim-secret' },
  state: 'active',
  watch: 'awaiting-funds',
  createdAt: 1_700_000_000_000,
  metadata: { retained: ['plugin data'] },
})

function coin(txid = 'a'.repeat(64)): ExtendedVirtualCoin {
  const leaf: ExtendedVirtualCoin['forfeitTapLeafScript'] = [
    TaprootControlBlock.decode(new Uint8Array([0xc0, ...new Uint8Array(32).fill(1)])),
    new Uint8Array([0x51]),
  ]
  return {
    txid,
    vout: 0,
    value: 1234,
    script: '5120' + '01'.repeat(32),
    status: { confirmed: false },
    createdAt: new Date(1_700_000_000_000),
    isSpent: true,
    isUnrolled: false,
    spentBy: 'b'.repeat(64),
    commitmentTxIds: ['c'.repeat(64)],
    expiresAt: new Date(1_800_000_000_000),
    assets: [{ assetId: 'asset', amount: 9_007_199_254_740_993n }],
    extraWitness: [new Uint8Array([1, 2, 3])],
    tapTree: new Uint8Array([4, 5, 6]),
    forfeitTapLeafScript: leaf,
    intentTapLeafScript: leaf,
  }
}

describe('native SQLite repositories', () => {
  it('opens one bound namespace and shares its serialized repository bundle', async () => {
    const [first, second] = await Promise.all([createNativeRepositories(options), createNativeRepositories(options)])
    expect(first).toBe(second)
    expect(await first.walletRepository.getWalletState()).toBeNull()
    expect(invoke.mock.calls.every(([, args]) => args.namespace === nativeRepositoryNamespace(options))).toBe(true)
    expect(() => nativeRepositoryNamespace({ ...options, publicKey: '../outside' })).toThrow('public key')
    expect(() => nativeRepositoryNamespace({ ...options, network: 'unknown' as typeof options.network })).toThrow(
      'network',
    )
  })

  it('migrates current IndexedDB coins, assets, history, contracts and wallet state without deleting the source', async () => {
    const sourceName = nativeRepositoryNamespace(options)
    const wallet = new IndexedDBWalletRepository(sourceName)
    const contracts = new IndexedDBContractRepository(sourceName)
    const vtxo = coin()
    await wallet.saveVtxos('test-address', [vtxo])
    await wallet.saveUtxos('test-address', [
      {
        txid: 'utxo',
        vout: 0,
        value: 400,
        status: { confirmed: false },
        tapTree: vtxo.tapTree,
        forfeitTapLeafScript: vtxo.forfeitTapLeafScript,
        intentTapLeafScript: vtxo.intentTapLeafScript,
      },
    ])
    await wallet.saveTransactions('test-address', [
      {
        key: { arkTxid: 'ark', boardingTxid: '', commitmentTxid: '' },
        type: TxType.TxReceived,
        amount: 1234,
        createdAt: 1_700_000_000_000,
        settled: true,
        assets: vtxo.assets,
      },
    ])
    await wallet.saveWalletState({ settings: { account: { nextIndex: 12 }, salt: 'public-salt' }, lastSyncTime: 123 })
    await contracts.saveContract(contract())
    const native = await createNativeRepositories(options)
    const [copied] = await collectVtxos(native.walletRepository, 'test-address')
    expect(copied.assets).toEqual(vtxo.assets)
    expect(copied.spentBy).toBe(vtxo.spentBy)
    expect(copied.extraWitness).toEqual(vtxo.extraWitness)
    expect(copied.expiresAt).toEqual(vtxo.expiresAt)
    expect(await collectUtxos(native.walletRepository, 'test-address')).toHaveLength(1)
    expect(await collectTransactionHistory(native.walletRepository, 'test-address')).toMatchObject([
      { assets: vtxo.assets, settled: true },
    ])
    expect(await collectContracts(native.contractRepository)).toEqual([contract()])
    expect(await native.walletRepository.getWalletState()).toEqual(await wallet.getWalletState())
    expect(await collectVtxos(wallet, 'test-address')).toHaveLength(1)
    expect(sql.prepare('SELECT receipt FROM native_storage_migrations').all()).toHaveLength(1)
    await wallet[Symbol.asyncDispose]()
    await contracts[Symbol.asyncDispose]()
  })

  it('retains the source and retries an interrupted import before returning any repositories', async () => {
    const wallet = new IndexedDBWalletRepository(nativeRepositoryNamespace(options))
    await wallet.saveWalletState({ settings: { valuable: 'claim material' } })
    failure = (query) => query.startsWith('INSERT INTO native_storage_migrations')
    await expect(createNativeRepositories(options)).rejects.toThrow('Injected storage failure')
    expect(await wallet.getWalletState()).toEqual({ settings: { valuable: 'claim material' } })
    expect(sql.prepare('SELECT receipt FROM native_storage_migrations').all()).toEqual([])
    failure = undefined
    const native = await createNativeRepositories(options)
    expect(await native.walletRepository.getWalletState()).toEqual({ settings: { valuable: 'claim material' } })
    await wallet[Symbol.asyncDispose]()
  })

  it('migrates contract-manager VTXOs whose contractScript annotation repeats their script', async () => {
    const source = new IndexedDBWalletRepository(nativeRepositoryNamespace(options))
    const vtxo = { ...coin(), contractScript: coin().script }
    await source.saveVtxos('test-address', [vtxo])
    const native = await createNativeRepositories(options)
    expect(await collectVtxos(native.walletRepository, 'test-address')).toMatchObject([{ script: vtxo.script }])
    expect(await collectVtxos(source, 'test-address')).toMatchObject([{ contractScript: vtxo.script }])
    expect(sql.prepare('SELECT receipt FROM native_storage_migrations').all()).toHaveLength(1)
    await source[Symbol.asyncDispose]()
  })

  it('refuses a conflicting contractScript annotation and preserves the source without a receipt', async () => {
    const source = new IndexedDBWalletRepository(nativeRepositoryNamespace(options))
    const vtxo = { ...coin(), contractScript: '5120' + '02'.repeat(32) }
    await source.saveVtxos('test-address', [vtxo])
    await expect(createNativeRepositories(options)).rejects.toThrow('conflicting contract script')
    expect(await collectVtxos(source, 'test-address')).toMatchObject([{ contractScript: vtxo.contractScript }])
    expect(sql.prepare('SELECT receipt FROM native_storage_migrations').all()).toEqual([])
    await source[Symbol.asyncDispose]()
  })

  it('does not expose a lossy import or issue a migration receipt', async () => {
    const name = nativeRepositoryNamespace(options)
    const source = new IndexedDBContractRepository(name)
    await source.saveContract({ ...contract(), metadata: { indispensable: 'refund state' } })
    const original = invoke.getMockImplementation() as (
      command: string,
      args: { sql: string; values: SQLInputValue[] },
    ) => Promise<Record<string, unknown>[] | undefined>
    invoke.mockImplementation(async (command, args) => {
      const rows = await original(command, args)
      if (command.endsWith('|all') && args.sql.includes('SELECT * FROM ark_contracts'))
        return rows?.map((row: Record<string, unknown>) => ({ ...row, metadata_json: null }))
      return rows
    })
    await expect(createNativeRepositories(options)).rejects.toThrow('verification failed')
    expect(sql.prepare('SELECT receipt FROM native_storage_migrations').all()).toEqual([])
    expect(await collectContracts(source)).toMatchObject([{ metadata: { indispensable: 'refund state' } }])
    await source[Symbol.asyncDispose]()
  })

  it('keeps another repository write outside a failed wallet transaction and remains usable', async () => {
    const native = await createNativeRepositories(options)
    const vtxo = coin()
    failure = (query, values) => query.startsWith('INSERT') && values.includes('fail')
    const batch = Array.from({ length: 70 }, (_, index) => ({ ...vtxo, txid: index.toString(16).padStart(64, '0') }))
    batch.push(coin('fail'))
    const result = await Promise.allSettled([
      native.walletRepository.saveVtxos('test-address', batch),
      native.contractRepository.saveContract(contract()),
    ])
    expect(result.map((value) => value.status)).toEqual(['rejected', 'fulfilled'])
    expect(await collectVtxos(native.walletRepository, 'test-address')).toEqual([])
    expect(await collectContracts(native.contractRepository)).toEqual([contract()])
    failure = undefined
    await native.walletRepository.saveVtxos('test-address', [vtxo])
    expect(await collectVtxos(native.walletRepository, 'test-address')).toHaveLength(1)
  })

  it('clears SQLite and retained legacy core records on explicit reset without later reimport', async () => {
    const name = nativeRepositoryNamespace(options)
    const wallet = new IndexedDBWalletRepository(name)
    const source = new IndexedDBContractRepository(name)
    await wallet.saveWalletState({ settings: { old: true } })
    await source.saveContract(contract())
    const native = await createNativeRepositories(options)
    await native.clear()
    expect(await native.walletRepository.getWalletState()).toBeNull()
    expect(await collectContracts(native.contractRepository)).toEqual([])
    expect(await wallet.getWalletState()).toBeNull()
    expect(await collectContracts(source)).toEqual([])
    expect(sql.prepare('SELECT receipt FROM native_storage_migrations').all()).toHaveLength(1)
    expect(await createNativeRepositories(options)).toBe(native)
    await wallet[Symbol.asyncDispose]()
    await source[Symbol.asyncDispose]()
  })

  it('rejects an import if the retained source changes during verification, then retries the new state', async () => {
    const source = new IndexedDBWalletRepository(nativeRepositoryNamespace(options))
    await source.saveWalletState({ settings: { generation: 'original' } })
    const original = invoke.getMockImplementation() as (
      command: string,
      args: { sql: string; values: SQLInputValue[] },
    ) => Promise<Record<string, unknown>[] | undefined>
    let changed = false
    invoke.mockImplementation(async (command, args) => {
      if (!changed && args.sql.startsWith('INSERT OR REPLACE INTO ark_wallet_state')) {
        changed = true
        await source.saveWalletState({ settings: { generation: 'updated concurrently' } })
      }
      return original(command, args)
    })
    await expect(createNativeRepositories(options)).rejects.toThrow('changed during its storage upgrade')
    expect(sql.prepare('SELECT receipt FROM native_storage_migrations').all()).toEqual([])
    const retried = await createNativeRepositories(options)
    expect(await retried.walletRepository.getWalletState()).toEqual({
      settings: { generation: 'updated concurrently' },
    })
    await source[Symbol.asyncDispose]()
  })

  it('preserves a future IndexedDB schema instead of interpreting or clearing it', async () => {
    const name = nativeRepositoryNamespace(options)
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 7)
      request.onupgradeneeded = () => request.result.createObjectStore('future-wallet').put('retained', 'secret')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    database.close()
    await expect(createNativeRepositories(options)).rejects.toThrow('needs a newer wallet version')
    const check = await new Promise<unknown>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => {
        const database = request.result
        const read = database.transaction('future-wallet').objectStore('future-wallet').get('secret')
        read.onsuccess = () => {
          database.close()
          resolve(read.result)
        }
        read.onerror = () => {
          database.close()
          reject(read.error)
        }
      }
      request.onerror = () => reject(request.error)
    })
    expect(check).toBe('retained')
    expect(sql.prepare('SELECT receipt FROM native_storage_migrations').all()).toEqual([])
  })

  it('uses the committed SQLite state after an app restart instead of importing stale IndexedDB again', async () => {
    const name = nativeRepositoryNamespace(options)
    const source = new IndexedDBWalletRepository(name)
    await source.saveWalletState({ settings: { generation: 'before migration' } })
    const native = await createNativeRepositories(options)
    await native.walletRepository.saveWalletState({ settings: { generation: 'new native state' } })
    vi.resetModules()
    const reopenedModule = await import('../../lib/nativeRepositories')
    const reopened = await reopenedModule.createNativeRepositories(options)
    expect(await reopened.walletRepository.getWalletState()).toEqual({ settings: { generation: 'new native state' } })
    expect(await source.getWalletState()).toEqual({ settings: { generation: 'before migration' } })
    await source[Symbol.asyncDispose]()
  })
})
