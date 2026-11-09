import {
  IndexedDBWalletRepository,
  IndexedDBContractRepository,
  collectContracts,
  collectTransactionHistory,
  collectUtxos,
  collectVtxos,
  type ContractRepository,
  type ExtendedVirtualCoin,
  type NetworkName,
  type WalletRepository,
} from '@arkade-os/sdk'
import {
  SQLiteContractRepository,
  SQLiteIntentRepository,
  SQLiteVirtualTxRepository,
  SQLiteWalletRepository,
  type SQLExecutor,
} from '@arkade-os/sdk/repositories/sqlite'
import { sha256 } from '@noble/hashes/sha2.js'
import { hex } from '@scure/base'

type Options = { network: NetworkName; publicKey: string; legacyDatabase?: string }
type Invoke = <T>(command: string, args: Record<string, unknown>) => Promise<T>
type LegacyRows = Record<string, Record<string, unknown>[]>
type CoreRepositories = { walletRepository: WalletRepository; contractRepository: ContractRepository }
export type NativeSqlSnapshot = {
  version: 1
  namespace: string
  tables: Record<string, { columns: string[]; rows: (string | number | null)[][] }>
}
const stores = ['vtxos', 'utxos', 'transactions', 'walletState', 'contracts']
const databases = new Map<string, Promise<NativeRepositories>>()

export type NativeRepositories = CoreRepositories & {
  intentRepository: SQLiteIntentRepository
  virtualTxRepository: SQLiteVirtualTxRepository
  clear(): Promise<void>
}

export function nativeRepositoryNamespace({ network, publicKey }: Options): string {
  if (!['bitcoin', 'testnet', 'signet', 'mutinynet', 'regtest'].includes(network))
    throw new Error('Unsupported wallet storage network')
  if (!/^0[23][0-9a-f]{64}$/i.test(publicKey)) throw new Error('Invalid wallet storage public key')
  return `arkade-native-${network}-${publicKey.toLowerCase()}`
}

function nativeExecutor(namespace: string): SQLExecutor {
  const host = window as Window & { __TAURI__?: { core?: { invoke?: Invoke } } }
  const invoke = host.__TAURI__?.core?.invoke
  if (!invoke) throw new Error('Native wallet storage is unavailable')
  const all = <T>(sql: string, values: unknown[] = []): Promise<T[]> =>
    invoke<T[]>('plugin:wallet-sql|all', { namespace, sql, values })
  return {
    run: (sql, values = []) => invoke('plugin:wallet-sql|run', { namespace, sql, values }),
    all,
    get: async <T>(sql: string, values?: unknown[]) => (await all<T>(sql, values))[0],
  }
}

async function nativeStorageCommand<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const host = window as Window & { __TAURI__?: { core?: { invoke?: Invoke } } }
  if (!host.__TAURI__?.core?.invoke) throw new Error('Native wallet storage is unavailable')
  return host.__TAURI__.core.invoke<T>(`plugin:wallet-sql|${command}`, args)
}

async function prepareNativeSnapshot(network: NetworkName, publicKey: string): Promise<string> {
  const repositories = await createNativeRepositories({ network, publicKey })
  await repositories.contractRepository.getContractsPage(undefined, { limit: 1 })
  await repositories.intentRepository.getIntentsPage(undefined, { limit: 1 })
  await repositories.virtualTxRepository.getVirtualTx('native-state-backup')
  return nativeRepositoryNamespace({ network, publicKey })
}

export async function exportNativeSqlState(network: NetworkName, publicKey: string): Promise<NativeSqlSnapshot> {
  const namespace = await prepareNativeSnapshot(network, publicKey)
  return nativeStorageCommand('snapshot', { namespace })
}

export async function validateNativeSqlState(
  network: NetworkName,
  publicKey: string,
  snapshot: unknown,
): Promise<NativeSqlSnapshot> {
  const namespace = await prepareNativeSnapshot(network, publicKey)
  await nativeStorageCommand('validate_snapshot', { namespace, snapshot })
  return snapshot as NativeSqlSnapshot
}

export async function restoreNativeSqlState(
  network: NetworkName,
  publicKey: string,
  snapshot: NativeSqlSnapshot,
): Promise<void> {
  const namespace = await prepareNativeSnapshot(network, publicKey)
  await nativeStorageCommand('restore', { namespace, snapshot })
}

async function queuedRepositories(db: SQLExecutor) {
  let pending = Promise.resolve()
  const walletRepository = new SQLiteWalletRepository(db)
  await walletRepository.getWalletState()
  const wrap = <T extends object>(target: T, atomic = new Set<PropertyKey>()): T => {
    const methods = new Map<PropertyKey, unknown>()
    return new Proxy(target, {
      get(target, key) {
        const value = Reflect.get(target, key)
        if (typeof value !== 'function') return value
        if (!methods.has(key)) {
          methods.set(key, (...args: unknown[]) => {
            const work = pending.then(async () => {
              if (!atomic.has(key)) return value.apply(target, args)
              await db.run('BEGIN IMMEDIATE')
              try {
                const result = await value.apply(target, args)
                await db.run('COMMIT')
                return result
              } catch (error) {
                await db.run('ROLLBACK').catch(() => undefined)
                throw error
              }
            })
            pending = work.then(
              () => undefined,
              () => undefined,
            )
            return work
          })
        }
        return methods.get(key)
      },
    })
  }
  return {
    walletRepository: wrap(
      walletRepository,
      new Set(['saveVtxos', 'saveVtxosForScript', 'saveUtxos', 'saveTransactions', 'clear']),
    ),
    contractRepository: wrap(new SQLiteContractRepository(db)),
    intentRepository: wrap(new SQLiteIntentRepository(db)),
    virtualTxRepository: wrap(new SQLiteVirtualTxRepository(db)),
  }
}

function canonical(value: unknown): string {
  const normalize = (value: unknown): unknown => {
    if (value instanceof Uint8Array) return { bytes: hex.encode(value) }
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'bigint') return { integer: value.toString() }
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, value]) => value !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, normalize(value)]),
      )
    return value
  }
  return JSON.stringify(normalize(value))
}

const digest = (value: unknown): string => hex.encode(sha256(new TextEncoder().encode(canonical(value))))

async function legacyRows(name: string): Promise<LegacyRows | undefined> {
  const database = await new Promise<IDBDatabase | undefined>((resolve, reject) => {
    let absent = false
    const request = indexedDB.open(name)
    request.onupgradeneeded = (event) => {
      if (event.oldVersion === 0) {
        absent = true
        request.transaction?.abort()
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      absent ? resolve(undefined) : reject(new Error('Unable to read the previous wallet database'))
    request.onblocked = () => reject(new Error('Close the other wallet window before upgrading storage'))
  })
  if (!database) return undefined
  try {
    if (database.version > 6) throw new Error('The previous wallet database needs a newer wallet version')
    const names = Array.from(database.objectStoreNames)
    if (!names.length) return {}
    return await new Promise<LegacyRows>((resolve, reject) => {
      const transaction = database.transaction(names, 'readonly')
      const result: LegacyRows = {}
      transaction.oncomplete = () => resolve(result)
      transaction.onabort = transaction.onerror = () => reject(new Error('Unable to read the previous wallet database'))
      for (const name of names) {
        const request = transaction.objectStore(name).getAll()
        request.onsuccess = () => {
          result[name] = request.result
        }
      }
    })
  } finally {
    database.close()
  }
}

const cleanRow = <T>(row: T): T => {
  if (!row || typeof row !== 'object') return row
  const ignored = new Set(['address', 'unspent', 'virtualStatus', 'keyBoardingTxid', 'keyCommitmentTxid', 'keyArkTxid'])
  const record = Object.fromEntries(Object.entries(row).filter(([key]) => !ignored.has(key)))
  return record as T
}

async function snapshot(repositories: CoreRepositories, addresses: string[]) {
  const { walletRepository, contractRepository } = repositories
  const buckets = []
  for (const address of addresses) {
    buckets.push({
      address,
      vtxos: (await collectVtxos(walletRepository, address)).map((row) => {
        const { contractScript, ...vtxo } = row as ExtendedVirtualCoin & { contractScript?: string }
        if (contractScript !== undefined && contractScript !== row.script)
          throw new Error('The previous wallet has a conflicting contract script; its data has been preserved')
        return cleanRow(vtxo)
      }),
      utxos: (await collectUtxos(walletRepository, address)).map(cleanRow),
      transactions: (await collectTransactionHistory(walletRepository, address)).map(cleanRow),
    })
  }
  return {
    buckets,
    contracts: await collectContracts(contractRepository),
    state: await walletRepository.getWalletState(),
  }
}

async function migrate(db: SQLExecutor, repositories: CoreRepositories, legacyDatabase: string) {
  await db.run('CREATE TABLE IF NOT EXISTS native_storage_migrations (source TEXT PRIMARY KEY, receipt TEXT NOT NULL)')
  if (await db.get('SELECT receipt FROM native_storage_migrations WHERE source = ?', [legacyDatabase])) return
  const source = {
    walletRepository: new IndexedDBWalletRepository(legacyDatabase),
    contractRepository: new IndexedDBContractRepository(legacyDatabase),
  }
  try {
    let raw = await legacyRows(legacyDatabase)
    if (raw) {
      await source.walletRepository.getWalletState()
      raw = await legacyRows(legacyDatabase)
    }
    for (const [name, rows] of Object.entries(raw ?? {})) {
      if (!stores.includes(name) && rows.length)
        throw new Error('The previous wallet contains storage this version cannot migrate; its data has been preserved')
    }
    const addresses = [
      ...new Set(['vtxos', 'utxos', 'transactions'].flatMap((store) => (raw?.[store] ?? []).map((row) => row.address))),
    ].sort()
    if (addresses.some((address) => typeof address !== 'string'))
      throw new Error('The previous wallet has an invalid storage address')
    const before = digest(raw)
    const data = raw ? await snapshot(source, addresses as string[]) : { buckets: [], contracts: [], state: null }
    await repositories.walletRepository.clear()
    await repositories.contractRepository.clear()
    for (const bucket of data.buckets) {
      if (bucket.vtxos.length) await repositories.walletRepository.saveVtxos(bucket.address, bucket.vtxos)
      if (bucket.utxos.length) await repositories.walletRepository.saveUtxos(bucket.address, bucket.utxos)
      if (bucket.transactions.length)
        await repositories.walletRepository.saveTransactions(bucket.address, bucket.transactions)
    }
    for (const contract of data.contracts) await repositories.contractRepository.saveContract(contract)
    if (data.state) await repositories.walletRepository.saveWalletState(data.state)
    const copied = await snapshot(repositories, addresses as string[])
    if (canonical(data) !== canonical(copied))
      throw new Error('Wallet storage verification failed; the previous database has been preserved')
    if (before !== digest(await legacyRows(legacyDatabase)))
      throw new Error('The previous wallet changed during its storage upgrade; reopen the app to retry')
    await db.run('INSERT INTO native_storage_migrations (source, receipt) VALUES (?, ?)', [
      legacyDatabase,
      JSON.stringify({ version: 1, digest: digest(data), addresses: addresses.length }),
    ])
  } finally {
    await source.walletRepository[Symbol.asyncDispose]()
    await source.contractRepository[Symbol.asyncDispose]()
  }
}

export function createNativeRepositories(options: Options): Promise<NativeRepositories> {
  const namespace = nativeRepositoryNamespace(options)
  const legacyDatabase = options.legacyDatabase ?? namespace
  let opening = databases.get(namespace)
  if (!opening) {
    opening = (async () => {
      const db = nativeExecutor(namespace)
      const repositories = await queuedRepositories(db)
      await migrate(db, repositories, legacyDatabase)
      return {
        ...repositories,
        clear: async () => {
          await repositories.walletRepository.clear()
          await repositories.contractRepository.clear()
          await repositories.intentRepository.clear()
          await repositories.virtualTxRepository.clear()
          const sources = await db.all<{ source: string }>('SELECT source FROM native_storage_migrations')
          for (const { source } of sources) {
            if (source !== namespace && source !== 'arkade-service-worker')
              throw new Error('Invalid wallet storage source')
            const previous = new IndexedDBWalletRepository(source)
            const contracts = new IndexedDBContractRepository(source)
            try {
              await previous.clear()
              await contracts.clear()
            } finally {
              await previous[Symbol.asyncDispose]()
              await contracts[Symbol.asyncDispose]()
            }
          }
        },
      }
    })()
    databases.set(namespace, opening)
    void opening.catch(() => {
      if (databases.get(namespace) === opening) databases.delete(namespace)
    })
  }
  return opening
}
