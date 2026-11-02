import type { NetworkName } from '@arkade-os/sdk'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { base64, hex } from '@scure/base'
import { isNativeHost } from './nativeBridge'
import { invokeWalletHost } from './nativePlatform'
import { getSecretStore } from './secretStore'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from './storageKeys'
import {
  exportNativeSqlState,
  restoreNativeSqlState,
  validateNativeSqlState,
  type NativeSqlSnapshot,
} from './nativeRepositories'

const FORMAT = 'arkade-native-state'
const ITERATIONS = 600_000
const MAX_BYTES = 20 * 1024 * 1024
const MAX_ROWS = 100_000
const MAX_NODES = 200_000
const STAGING_KEY = 'arkade-native-state-import'
const aad = new TextEncoder().encode(`${FORMAT}:1`)
const credentialKeys = [MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY] as const
const localKeys = [
  'wallet',
  'config',
  'transactionActivityMetadata',
  'assetMetadataCache',
  'swapQuoteSnapshots',
  'lnurlWatermarks',
  'lnurlSends',
  'solverCards',
  'approvedAssetIcons',
  'commitmentTxs',
] as const

type Atom = null | boolean | string | number | { ref: number } | { type: string; value?: string }
type Encoded = { version: 1; root: Atom; nodes: Record<string, unknown>[] }
type KeyPath = string | string[] | null
type IndexState = { name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }
type StoreState = {
  name: string
  keyPath: KeyPath
  autoIncrement: boolean
  nextKey?: number
  indexes: IndexState[]
  rows: { key: IDBValidKey; value: unknown }[]
}
type DatabaseState = { name: string; version: number; stores: StoreState[] }
export type NativeStatePayload = {
  version: 1
  createdAt: number
  network: NetworkName
  publicKey: string
  localStorage: Record<string, string>
  credentials: Record<(typeof credentialKeys)[number], string | null>
  indexedDb: DatabaseState[]
  sqlite: NativeSqlSnapshot
}
export type NativeStateEnvelope = {
  format: typeof FORMAT
  version: 1
  kdf: 'PBKDF2-SHA256'
  iterations: typeof ITERATIONS
  salt: string
  iv: string
  ciphertext: string
}

const invalid = () => new Error('This wallet backup is invalid or unsupported.')
function assert(condition: unknown): asserts condition {
  if (!condition) throw invalid()
}
const record = (value: unknown): Record<string, unknown> => {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value))
  return value as Record<string, unknown>
}
const list = (value: unknown, max = MAX_NODES): unknown[] => {
  assert(Array.isArray(value) && value.length <= max)
  return value
}
const text = (value: unknown, max = MAX_BYTES): string => {
  assert(typeof value === 'string' && value.length <= max)
  return value
}
const name = (value: unknown): string => {
  const result = text(value, 256)
  assert(result.length > 0 && !result.includes('\0'))
  return result
}
const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  assert(typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max)
  return value
}
const boolean = (value: unknown): boolean => {
  assert(typeof value === 'boolean')
  return value
}
const fields = (value: Record<string, unknown>, keys: string[]) => {
  assert(Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)))
}
const bytes = (value: unknown): Uint8Array<ArrayBuffer> => {
  const encoded = text(value)
  let decoded: Uint8Array
  try {
    decoded = base64.decode(encoded)
  } catch {
    throw invalid()
  }
  assert(base64.encode(decoded) === encoded && decoded.length <= MAX_BYTES)
  return new Uint8Array(decoded)
}
const own = (target: object, key: string, value: unknown) =>
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true })

function allocationBudget(nodes: unknown[], root: unknown): void {
  let units = nodes.length
  let binary = 0
  for (const value of nodes) {
    const node = record(value)
    if (node.type === 'array') units += integer(node.length, 0, MAX_NODES)
    if (['array', 'object', 'map', 'set'].includes(String(node.type)))
      units += list(node.entries).length * (node.type === 'set' ? 1 : 2)
    if (node.type === 'buffer') {
      const encoded = text(node.value)
      binary += Math.floor(encoded.length / 4) * 3
    }
    assert(units <= MAX_NODES && binary <= MAX_BYTES)
  }
  const reached = new Set<number>()
  const pending: unknown[] = [root]
  while (pending.length) {
    const atom = pending.pop()
    if (!atom || typeof atom !== 'object' || !Object.hasOwn(atom, 'ref')) continue
    const id = integer(record(atom).ref, 0, nodes.length - 1)
    if (reached.has(id)) continue
    reached.add(id)
    const node = record(nodes[id])
    if (node.type === 'date') pending.push(node.value)
    else if (node.type === 'view') pending.push(node.buffer)
    else if (node.type === 'set') {
      for (const entry of list(node.entries)) pending.push(entry)
    } else if (['array', 'object', 'map'].includes(String(node.type))) {
      for (const entry of list(node.entries)) {
        const pair = list(entry, 2)
        assert(pair.length === 2)
        if (node.type === 'map') pending.push(pair[0])
        pending.push(pair[1])
      }
    }
  }
  assert(reached.size === nodes.length)
}

export function encodeNativeState(value: unknown): Encoded {
  const nodes: Record<string, unknown>[] = []
  const seen = new Map<object, number>()
  const encode = (value: unknown, depth = 0): Atom => {
    assert(depth < 128)
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
    if (typeof value === 'number')
      return Number.isFinite(value) && !Object.is(value, -0)
        ? value
        : { type: 'number', value: Object.is(value, -0) ? '-0' : String(value) }
    if (typeof value === 'undefined') return { type: 'undefined' }
    if (typeof value === 'bigint') return { type: 'bigint', value: value.toString() }
    assert(typeof value === 'object')
    const previous = seen.get(value)
    if (previous !== undefined) return { ref: previous }
    assert(nodes.length < MAX_NODES)
    const ref = nodes.length
    seen.set(value, ref)
    const node: Record<string, unknown> = {}
    nodes.push(node)
    const next = (item: unknown) => encode(item, depth + 1)
    const tag = Object.prototype.toString.call(value)
    if (Array.isArray(value) || tag === '[object Object]') {
      node.type = Array.isArray(value) ? 'array' : 'object'
      if (Array.isArray(value)) {
        assert(value.length <= MAX_NODES)
        node.length = value.length
      }
      node.entries = Object.keys(value).map((key) => [key, next((value as Record<string, unknown>)[key])])
    } else if (tag === '[object Date]') {
      node.type = 'date'
      node.value = next(Number(value))
    } else if (tag === '[object ArrayBuffer]') {
      node.type = 'buffer'
      node.value = base64.encode(new Uint8Array(value as ArrayBuffer))
    } else if (ArrayBuffer.isView(value)) {
      node.type = 'view'
      node.kind = tag.slice(8, -1)
      node.buffer = next(value.buffer)
      node.offset = value.byteOffset
      node.length = value.byteLength
    } else if (tag === '[object Map]') {
      node.type = 'map'
      node.entries = Array.from(value as Map<unknown, unknown>, ([key, item]) => [next(key), next(item)])
    } else if (tag === '[object Set]') {
      node.type = 'set'
      node.entries = Array.from(value as Set<unknown>, next)
    } else if (tag === '[object RegExp]') {
      node.type = 'regexp'
      node.source = (value as RegExp).source
      node.flags = (value as RegExp).flags
    } else throw new Error('This wallet contains a data type that cannot be backed up by this app version.')
    return { ref }
  }
  const root = encode(value)
  allocationBudget(nodes, root)
  return { version: 1, root, nodes }
}

export function decodeNativeState(input: unknown): unknown {
  const encoded = record(input)
  fields(encoded, ['version', 'root', 'nodes'])
  assert(encoded.version === 1)
  const nodes = list(encoded.nodes)
  allocationBudget(nodes, encoded.root)
  const objects: unknown[] = new Array(nodes.length)
  const decode = (atom: unknown): unknown => {
    if (atom === null || typeof atom === 'string' || typeof atom === 'boolean') return atom
    if (typeof atom === 'number') {
      assert(Number.isFinite(atom))
      return atom
    }
    const token = record(atom)
    if (Object.hasOwn(token, 'ref')) {
      fields(token, ['ref'])
      return objects[integer(token.ref, 0, nodes.length - 1)]
    }
    if (token.type === 'undefined') {
      fields(token, ['type'])
      return undefined
    }
    fields(token, ['type', 'value'])
    if (token.type === 'bigint') {
      const value = text(token.value, 10_000)
      assert(/^-?(0|[1-9]\d*)$/.test(value))
      return BigInt(value)
    }
    assert(token.type === 'number' && ['-0', 'NaN', 'Infinity', '-Infinity'].includes(String(token.value)))
    return Number(token.value)
  }
  nodes.forEach((value, index) => {
    const node = record(value)
    switch (node.type) {
      case 'array':
        objects[index] = new Array(integer(node.length, 0, MAX_NODES))
        break
      case 'object':
        objects[index] = {}
        break
      case 'buffer':
        objects[index] = bytes(node.value).buffer
        break
      case 'date':
        objects[index] = new Date(0)
        break
      case 'map':
        objects[index] = new Map()
        break
      case 'set':
        objects[index] = new Set()
        break
      case 'regexp':
        objects[index] = new RegExp(text(node.source, 10_000), text(node.flags, 20))
        break
      case 'view':
        break
      default:
        throw invalid()
    }
  })
  const constructors: Record<string, { new (buffer: ArrayBuffer, offset: number, length?: number): ArrayBufferView }> =
    {
      Uint8Array,
      Uint8ClampedArray,
      Int8Array,
      Uint16Array,
      Int16Array,
      Uint32Array,
      Int32Array,
      Float32Array,
      Float64Array,
      BigInt64Array,
      BigUint64Array,
      DataView,
    }
  nodes.forEach((value, index) => {
    const node = record(value)
    if (node.type !== 'view') return
    fields(node, ['type', 'kind', 'buffer', 'offset', 'length'])
    const buffer = decode(node.buffer)
    assert(Object.prototype.toString.call(buffer) === '[object ArrayBuffer]')
    const kind = text(node.kind, 30)
    const Constructor = Object.hasOwn(constructors, kind) ? constructors[kind] : undefined
    assert(Constructor)
    const offset = integer(node.offset, 0, MAX_BYTES)
    const length = integer(node.length, 0, MAX_BYTES)
    const elementSize = 'BYTES_PER_ELEMENT' in Constructor ? Number(Constructor.BYTES_PER_ELEMENT) : 1
    assert(length % elementSize === 0)
    try {
      objects[index] = new Constructor(buffer as ArrayBuffer, offset, length / elementSize)
    } catch {
      throw invalid()
    }
  })
  nodes.forEach((value, index) => {
    const node = record(value)
    if (node.type === 'object' || node.type === 'array') {
      fields(node, node.type === 'array' ? ['type', 'length', 'entries'] : ['type', 'entries'])
      const names = new Set<string>()
      for (const entry of list(node.entries)) {
        const [key, atom] = list(entry, 2)
        const property = text(key, 10_000)
        assert(!names.has(property) && (node.type !== 'array' || property !== 'length'))
        if (node.type === 'array' && /^(0|[1-9]\d*)$/.test(property)) assert(Number(property) < Number(node.length))
        names.add(property)
        own(objects[index] as object, property, decode(atom))
      }
    } else if (node.type === 'date') {
      fields(node, ['type', 'value'])
      const date = decode(node.value)
      assert(typeof date === 'number')
      ;(objects[index] as Date).setTime(date)
    } else if (node.type === 'map') {
      fields(node, ['type', 'entries'])
      for (const entry of list(node.entries)) {
        const pair = list(entry, 2)
        assert(pair.length === 2)
        ;(objects[index] as Map<unknown, unknown>).set(decode(pair[0]), decode(pair[1]))
      }
    } else if (node.type === 'set') {
      fields(node, ['type', 'entries'])
      for (const entry of list(node.entries)) (objects[index] as Set<unknown>).add(decode(entry))
    } else if (node.type === 'buffer') fields(node, ['type', 'value'])
    else if (node.type === 'regexp') fields(node, ['type', 'source', 'flags'])
  })
  return decode(encoded.root)
}

function passwordBytes(password: string): Uint8Array<ArrayBuffer> {
  if (Array.from(password).length < 12 || password.length > 1024)
    throw new Error('Use a backup password with at least 12 characters.')
  return new TextEncoder().encode(password)
}

async function encryptionKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const passwordData = passwordBytes(password)
  try {
    const material = await crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, ['deriveKey'])
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  } finally {
    passwordData.fill(0)
  }
}

export async function encryptNativeState(payload: unknown, password: string): Promise<NativeStateEnvelope> {
  passwordBytes(password).fill(0)
  const plaintext = new TextEncoder().encode(JSON.stringify(encodeNativeState(payload)))
  assert(plaintext.byteLength <= MAX_BYTES - 16)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
      await encryptionKey(password, salt),
      plaintext,
    )
    return {
      format: FORMAT,
      version: 1,
      kdf: 'PBKDF2-SHA256',
      iterations: ITERATIONS,
      salt: base64.encode(salt),
      iv: base64.encode(iv),
      ciphertext: base64.encode(new Uint8Array(ciphertext)),
    }
  } finally {
    plaintext.fill(0)
  }
}

function envelope(input: unknown): NativeStateEnvelope {
  const value = record(input)
  fields(value, ['format', 'version', 'kdf', 'iterations', 'salt', 'iv', 'ciphertext'])
  assert(
    value.format === FORMAT && value.version === 1 && value.kdf === 'PBKDF2-SHA256' && value.iterations === ITERATIONS,
  )
  assert(bytes(value.salt).length === 16 && bytes(value.iv).length === 12 && bytes(value.ciphertext).length >= 16)
  return {
    format: FORMAT,
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: String(value.salt),
    iv: String(value.iv),
    ciphertext: String(value.ciphertext),
  }
}

export async function decryptNativeState(input: unknown, password: string): Promise<unknown> {
  const value = envelope(input)
  const key = await encryptionKey(password, bytes(value.salt))
  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes(value.iv), additionalData: aad, tagLength: 128 },
      key,
      bytes(value.ciphertext),
    )
  } catch {
    throw new Error('The backup password is incorrect, or the backup file was changed.')
  }
  try {
    return decodeNativeState(JSON.parse(new TextDecoder().decode(plaintext)))
  } finally {
    new Uint8Array(plaintext).fill(0)
  }
}

function openDatabase(
  name: string,
  version?: number,
  upgrade?: (db: IDBDatabase, tx: IDBTransaction) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = version === undefined ? indexedDB.open(name) : indexedDB.open(name, version)
    request.onupgradeneeded = () => {
      try {
        upgrade?.(request.result, request.transaction!)
      } catch {
        request.transaction?.abort()
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Wallet database access failed. Close other wallet windows and retry.'))
    request.onblocked = () => reject(new Error('Close other wallet windows before restoring this backup.'))
  })
}

async function readDatabase(info: IDBDatabaseInfo): Promise<DatabaseState> {
  const db = await openDatabase(info.name!)
  try {
    const names = Array.from(db.objectStoreNames)
    const result: DatabaseState = { name: db.name, version: db.version, stores: [] }
    if (!names.length) return result
    return await new Promise((resolve, reject) => {
      const writable = names.some((name) => db.transaction(name).objectStore(name).autoIncrement)
      const tx = db.transaction(names, writable ? 'readwrite' : 'readonly')
      let complete = false
      let pending = names.length
      let total = 0
      const finish = () => {
        if (--pending === 0) {
          complete = true
          result.stores.sort((a, b) => a.name.localeCompare(b.name))
          if (writable) tx.abort()
        }
      }
      tx.oncomplete = () => resolve(result)
      tx.onabort = tx.onerror = () =>
        complete ? resolve(result) : reject(new Error('Unable to snapshot wallet database.'))
      for (const name of names) {
        const source = tx.objectStore(name)
        const store: StoreState = {
          name,
          keyPath: source.keyPath,
          autoIncrement: source.autoIncrement,
          indexes: Array.from(source.indexNames, (name) => {
            const index = source.index(name)
            return { name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry }
          }).sort((a, b) => a.name.localeCompare(b.name)),
          rows: [],
        }
        result.stores.push(store)
        const request = source.openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            if (++total > MAX_ROWS) {
              tx.abort()
              return
            }
            store.rows.push({ key: cursor.primaryKey, value: cursor.value })
            cursor.continue()
          } else {
            if (source.autoIncrement) {
              pending++
              const probe = source.add({})
              probe.onsuccess = () => {
                store.nextKey = Number(probe.result)
                finish()
              }
            }
            finish()
          }
        }
      }
    })
  } finally {
    db.close()
  }
}

async function databases(): Promise<DatabaseState[]> {
  if (typeof indexedDB.databases !== 'function')
    throw new Error('Update Android System WebView before backing up wallet data.')
  const result = await indexedDB.databases()
  assert(result.length <= 64)
  return Promise.all(result.filter((info) => info.name !== undefined).map(readDatabase))
}

function keyPath(value: unknown): KeyPath {
  if (value === null) return null
  const validate = (part: unknown) => {
    const path = text(part, 256)
    assert(
      path === '' || path.split('.').every((part) => /^[$_\p{ID_Start}][$_\u200c\u200d\p{ID_Continue}]*$/u.test(part)),
    )
    return path
  }
  if (Array.isArray(value)) {
    assert(value.length > 0)
    return list(value, 16).map(validate)
  }
  return validate(value)
}

function pathValue(value: unknown, path: KeyPath): unknown {
  if (Array.isArray(path)) return path.map((part) => pathValue(value, part))
  if (path === '') return value
  for (const part of (path ?? '').split('.')) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

function validateDatabase(input: unknown): DatabaseState {
  const value = record(input)
  fields(value, ['name', 'version', 'stores'])
  const stores = list(value.stores, 64)
    .map((input) => {
      const store = record(input)
      fields(
        store,
        store.nextKey === undefined
          ? ['name', 'keyPath', 'autoIncrement', 'indexes', 'rows']
          : ['name', 'keyPath', 'autoIncrement', 'indexes', 'rows', 'nextKey'],
      )
      const path = keyPath(store.keyPath)
      const autoIncrement = boolean(store.autoIncrement)
      assert(!autoIncrement || (!Array.isArray(path) && path !== ''))
      assert(!autoIncrement || store.nextKey !== undefined)
      const indexes = list(store.indexes, 64)
        .map((input) => {
          const index = record(input)
          fields(index, ['name', 'keyPath', 'unique', 'multiEntry'])
          const path = keyPath(index.keyPath)
          assert(path !== null)
          const multiEntry = boolean(index.multiEntry)
          assert(!multiEntry || !Array.isArray(path))
          return { name: name(index.name), keyPath: path, unique: boolean(index.unique), multiEntry }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
      assert(new Set(indexes.map((index) => index.name)).size === indexes.length)
      const rows = list(store.rows, MAX_ROWS)
        .map((input) => {
          const row = record(input)
          fields(row, ['key', 'value'])
          try {
            assert(indexedDB.cmp(row.key as IDBValidKey, row.key as IDBValidKey) === 0)
            if (path !== null)
              assert(indexedDB.cmp(pathValue(row.value, path) as IDBValidKey, row.key as IDBValidKey) === 0)
          } catch {
            throw invalid()
          }
          return { key: row.key as IDBValidKey, value: row.value }
        })
        .sort((a, b) => indexedDB.cmp(a.key, b.key))
      const sorted = rows.map((row) => row.key).sort((a, b) => indexedDB.cmp(a, b))
      assert(sorted.every((key, index) => index === 0 || indexedDB.cmp(key, sorted[index - 1]) !== 0))
      for (const index of indexes.filter((index) => index.unique)) {
        const indexed: { key: IDBValidKey; row: number }[] = []
        rows.forEach((row, number) => {
          const value = pathValue(row.value, index.keyPath)
          for (const candidate of index.multiEntry && Array.isArray(value) ? value : [value]) {
            try {
              indexedDB.cmp(candidate as IDBValidKey, candidate as IDBValidKey)
            } catch {
              continue
            }
            indexed.push({ key: candidate as IDBValidKey, row: number })
          }
        })
        indexed.sort((a, b) => indexedDB.cmp(a.key, b.key))
        assert(
          indexed.every(
            (item, position) =>
              position === 0 ||
              indexed[position - 1].row === item.row ||
              indexedDB.cmp(indexed[position - 1].key, item.key) !== 0,
          ),
        )
      }
      return {
        name: name(store.name),
        keyPath: path,
        autoIncrement,
        indexes,
        rows,
        ...(autoIncrement ? { nextKey: integer(store.nextKey, 1) } : {}),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  assert(new Set(stores.map((store) => store.name)).size === stores.length)
  return { name: name(value.name), version: integer(value.version, 1), stores }
}

function validatePayload(input: unknown): NativeStatePayload {
  const value = record(input)
  fields(value, ['version', 'createdAt', 'network', 'publicKey', 'localStorage', 'credentials', 'indexedDb', 'sqlite'])
  assert(
    value.version === 1 && ['bitcoin', 'testnet', 'signet', 'mutinynet', 'regtest'].includes(String(value.network)),
  )
  const publicKey = text(value.publicKey, 66)
  assert(/^0[23][0-9a-f]{64}$/.test(publicKey))
  try {
    secp256k1.Point.fromBytes(hex.decode(publicKey)).assertValidity()
  } catch {
    throw invalid()
  }
  const storage = record(value.localStorage)
  assert(Object.keys(storage).every((key) => localKeys.includes(key as (typeof localKeys)[number])))
  for (const item of Object.values(storage)) {
    text(item)
    JSON.parse(String(item))
  }
  const wallet = record(JSON.parse(text(storage.wallet)))
  assertPortablePassword(wallet)
  assert(wallet.pubkey === publicKey && wallet.network === value.network)
  integer(wallet.nextRollover)
  const config = record(JSON.parse(text(storage.config)))
  assert(config.pubkey === publicKey)
  const server = new URL(text(config.aspUrl, 2048))
  assert(['https:', 'http:'].includes(server.protocol) && !server.username && !server.password)
  const credentials = record(value.credentials)
  fields(credentials, [...credentialKeys])
  for (const key of credentialKeys)
    if (credentials[key] !== null) {
      assert(text(credentials[key], 64 * 1024).length > 0 && bytes(credentials[key]).length >= 44)
    }
  if (wallet.signer !== undefined) {
    const signer = record(wallet.signer)
    assert(signer.type === 'native' && signer.publicKey === publicKey && typeof signer.name === 'string')
    assert(credentialKeys.every((key) => credentials[key] === null))
  } else assert(credentialKeys.filter((key) => credentials[key] !== null).length === 1)
  delete wallet.passkeyId
  wallet.lockedByBiometrics = false
  storage.wallet = JSON.stringify(wallet)
  const dbs = list(value.indexedDb, 64).map(validateDatabase)
  assert(new Set(dbs.map((db) => db.name)).size === dbs.length)
  assert(dbs.reduce((sum, db) => sum + db.stores.reduce((sum, store) => sum + store.rows.length, 0), 0) <= MAX_ROWS)
  return {
    version: 1,
    createdAt: integer(value.createdAt, 1),
    network: value.network as NetworkName,
    publicKey,
    localStorage: storage as Record<string, string>,
    credentials: credentials as NativeStatePayload['credentials'],
    indexedDb: dbs,
    sqlite: value.sqlite as NativeSqlSnapshot,
  }
}

const canonical = (value: unknown): string => JSON.stringify(encodeNativeState(value))
const schema = (db: DatabaseState): unknown => ({
  name: db.name,
  version: db.version,
  stores: db.stores.map(({ name, keyPath, autoIncrement, indexes }) => ({ name, keyPath, autoIncrement, indexes })),
})

function assertPortablePassword(wallet: Record<string, unknown>): void {
  if (wallet.lockedByBiometrics || wallet.passkeyId)
    throw new Error(
      'Switch to a wallet password before creating this backup. Biometric credentials are tied to the original device.',
    )
}

function existingWallet(): boolean {
  const wallet = localStorage.getItem('wallet')
  if (!wallet) return false
  try {
    const data = record(JSON.parse(wallet))
    return Boolean(
      data.pubkey || data.signer || data.passkeyId || data.lockedByBiometrics || data.network || data.nextRollover,
    )
  } catch {
    return true
  }
}

export function hasPendingNativeStateRestore(): boolean {
  return localStorage.getItem(STAGING_KEY) !== null
}

export function assertNativeStateReady(): void {
  if (hasPendingNativeStateRestore())
    throw new Error('Finish restoring your encrypted wallet backup before opening this wallet.')
}

const disposableMarkets = (db: DatabaseState, store: StoreState): boolean =>
  db.name === 'arkade-intents' &&
  store.name === 'markets' &&
  store.keyPath === null &&
  !store.autoIncrement &&
  store.indexes.length === 0

async function freshDestination(
  payload: NativeStatePayload,
  backupHash: string,
): Promise<{ retry: boolean; replaceMarkets: boolean }> {
  const raw = localStorage.getItem(STAGING_KEY)
  let retry = false
  if (raw !== null) {
    const stage = record(JSON.parse(raw))
    fields(stage, ['version', 'backupHash', 'network', 'publicKey'])
    if (
      stage.version !== 1 ||
      stage.backupHash !== backupHash ||
      stage.network !== payload.network ||
      stage.publicKey !== payload.publicKey
    )
      throw new Error('Finish restoring the same backup file before importing another wallet.')
    retry = true
  }
  const store = getSecretStore()
  const config = JSON.parse(localStorage.getItem('config') ?? '{}') as Record<string, unknown>
  if ((!retry && config.pubkey) || (retry && config.pubkey && config.pubkey !== payload.publicKey))
    throw new Error('Existing wallet configuration prevents restoring this backup.')
  for (const key of localKeys.filter((key) => key !== 'wallet' && key !== 'config')) {
    const current = localStorage.getItem(key)
    if (current !== null && (!retry || current !== payload.localStorage[key]))
      throw new Error('Existing wallet recovery state prevents restoring this backup.')
  }
  if (
    !retry &&
    (existingWallet() ||
      (await Promise.all(credentialKeys.map((key) => store.getItem(key)))).some((value) => value !== null))
  )
    throw new Error('Restore requires an empty app profile. Your existing wallet has been preserved.')
  if (retry && existingWallet()) {
    assert(localStorage.getItem('wallet') === payload.localStorage.wallet)
  }
  for (const key of credentialKeys) {
    const current = await store.getItem(key)
    if (current !== null && (!retry || current !== payload.credentials[key]))
      throw new Error('Existing wallet credentials prevent restoring this backup.')
  }
  const existing = await databases()
  let replaceMarkets = false
  for (const db of existing) {
    const target = payload.indexedDb.find((item) => item.name === db.name)
    const hasRows = db.stores.some((store) => store.rows.length > 0 || (store.autoIncrement && store.nextKey! > 1))
    if (hasRows && (!retry || !target || canonical(db) !== canonical(target))) {
      const cacheOnly = db.stores.every(
        (store) =>
          disposableMarkets(db, store) || (store.rows.length === 0 && (!store.autoIncrement || store.nextKey === 1)),
      )
      if (!cacheOnly) throw new Error('Existing wallet database state prevents restoring this backup.')
      replaceMarkets = true
    }
    if (target && canonical(schema(db)) !== canonical(schema(target)))
      throw new Error('This backup needs an empty app profile with a compatible wallet version.')
  }
  return { retry, replaceMarkets }
}

async function clearDisposableMarkets(): Promise<void> {
  const db = await openDatabase('arkade-intents')
  try {
    const names = Array.from(db.objectStoreNames)
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(names, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onabort = tx.onerror = () =>
        reject(new Error('Wallet state changed during restore. Existing swap records have been preserved.'))
      const markets = tx.objectStore('markets')
      if (markets.keyPath !== null || markets.autoIncrement || markets.indexNames.length !== 0) {
        tx.abort()
        return
      }
      let pending = names.length - 1
      if (pending === 0) markets.clear()
      for (const name of names.filter((name) => name !== 'markets')) {
        const request = tx.objectStore(name).count()
        request.onsuccess = () => {
          if (request.result !== 0) {
            tx.abort()
            return
          }
          if (--pending === 0) markets.clear()
        }
      }
    })
  } finally {
    db.close()
  }
}

function assignPath(value: Record<string, unknown>, path: string, key: number): void {
  const parts = path.split('.')
  let current = value
  parts.forEach((part, index) => {
    if (index === parts.length - 1) own(current, part, key)
    else {
      const next = {}
      own(current, part, next)
      current = next
    }
  })
}

async function restoreDatabase(state: DatabaseState): Promise<void> {
  const db = await openDatabase(state.name, state.version, (db) => {
    for (const item of state.stores) {
      const store = db.createObjectStore(item.name, { keyPath: item.keyPath, autoIncrement: item.autoIncrement })
      for (const index of item.indexes)
        store.createIndex(index.name, index.keyPath, { unique: index.unique, multiEntry: index.multiEntry })
    }
  })
  try {
    if (!state.stores.length) return
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        state.stores.map((store) => store.name),
        'readwrite',
      )
      tx.oncomplete = () => resolve()
      tx.onabort = tx.onerror = () =>
        reject(new Error('Wallet database restore failed. Select the same backup file to retry.'))
      try {
        for (const item of state.stores) {
          const store = tx.objectStore(item.name)
          for (const row of item.rows) {
            const request = item.keyPath === null ? store.add(row.value, row.key) : store.add(row.value)
            request.onerror = () => tx.abort()
          }
          if (item.autoIncrement && item.nextKey! > 1) {
            const key = item.nextKey! - 1
            if (!item.rows.some((row) => indexedDB.cmp(row.key, key) === 0)) {
              const probe: Record<string, unknown> = {}
              if (typeof item.keyPath === 'string') assignPath(probe, item.keyPath, key)
              if (item.keyPath === null) store.add(probe, key)
              else store.add(probe)
              store.delete(key)
            }
          }
        }
      } catch {
        tx.abort()
      }
    })
  } finally {
    db.close()
  }
}

export async function collectNativeState(): Promise<NativeStatePayload> {
  if (!isNativeHost()) throw new Error('Open Arkade in the native app to back up local wallet state.')
  assertNativeStateReady()
  const storage = Object.fromEntries(
    localKeys.flatMap((key) => {
      const value = localStorage.getItem(key)
      return value === null ? [] : [[key, value]]
    }),
  )
  const wallet = record(JSON.parse(storage.wallet ?? 'null'))
  assertPortablePassword(wallet)
  const store = getSecretStore()
  const credentials = {
    [MNEMONIC_STORAGE_KEY]: await store.getItem(MNEMONIC_STORAGE_KEY),
    [NSEC_STORAGE_KEY]: await store.getItem(NSEC_STORAGE_KEY),
  }
  const state = {
    version: 1,
    createdAt: Date.now(),
    network: wallet.network,
    publicKey: wallet.pubkey,
    localStorage: storage,
    credentials,
    indexedDb: await databases(),
    sqlite: await exportNativeSqlState(wallet.network as NetworkName, String(wallet.pubkey)),
  }
  return validatePayload(state)
}

export async function exportNativeStateBackup(password: string): Promise<void> {
  passwordBytes(password).fill(0)
  const state = await collectNativeState()
  const encrypted = await encryptNativeState(state, password)
  await invokeWalletHost('export_backup', {
    contents: JSON.stringify(encrypted),
    fileName: 'arkade-wallet-backup.json',
  })
}

export async function restoreNativeState(contents: string, password: string): Promise<void> {
  if (!isNativeHost()) throw new Error('Open Arkade in the native app to restore wallet state.')
  assert(contents.length <= 32 * 1024 * 1024)
  const encrypted = envelope(JSON.parse(contents))
  const payload = validatePayload(await decryptNativeState(encrypted, password))
  const backupHash = base64.encode(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(encrypted)))),
  )
  const { retry, replaceMarkets } = await freshDestination(payload, backupHash)
  payload.sqlite = await validateNativeSqlState(payload.network, payload.publicKey, payload.sqlite)
  localStorage.setItem(
    STAGING_KEY,
    JSON.stringify({ version: 1, backupHash, network: payload.network, publicKey: payload.publicKey }),
  )
  await restoreNativeSqlState(payload.network, payload.publicKey, payload.sqlite)
  if (replaceMarkets) await clearDisposableMarkets()
  const existing = await databases()
  for (const db of payload.indexedDb) {
    const present = existing.find((item) => item.name === db.name)
    if (retry && present && canonical(present) === canonical(db)) continue
    await restoreDatabase(db)
    const restored = await readDatabase({ name: db.name, version: db.version })
    assert(canonical(restored) === canonical(db))
  }
  const store = getSecretStore()
  for (const key of credentialKeys) {
    const value = payload.credentials[key]
    const current = await store.getItem(key)
    if (current !== null && current !== value)
      throw new Error('Wallet credentials changed during restore. Existing credentials have been preserved.')
    if (value !== null && current === null) await store.setItem(key, value)
  }
  assert(record(JSON.parse(localStorage.getItem(STAGING_KEY) ?? 'null')).backupHash === backupHash)
  if (existingWallet() && localStorage.getItem('wallet') !== payload.localStorage.wallet)
    throw new Error('A wallet was opened during restore. Its metadata has been preserved.')
  const currentConfig = record(JSON.parse(localStorage.getItem('config') ?? '{}'))
  if (currentConfig.pubkey && currentConfig.pubkey !== payload.publicKey)
    throw new Error('Wallet configuration changed during restore. Its metadata has been preserved.')
  for (const key of localKeys.filter((key) => key !== 'wallet')) {
    if (payload.localStorage[key] !== undefined) {
      const current = localStorage.getItem(key)
      if (key !== 'config' && current !== null && current !== payload.localStorage[key])
        throw new Error('Wallet recovery state changed during restore. Existing state has been preserved.')
      localStorage.setItem(key, payload.localStorage[key])
    }
  }
  localStorage.setItem('wallet', payload.localStorage.wallet)
  localStorage.removeItem(STAGING_KEY)
}

export async function importNativeStateBackup(password: string): Promise<void> {
  passwordBytes(password).fill(0)
  const contents = await invokeWalletHost<string>('import_backup')
  await restoreNativeState(contents, password)
}
