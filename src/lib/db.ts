export type PasskeyCredentials = {
  // TODO: JS migration should encrypt the seed itself instead of password
  // now, with WASM sdk, we need a password.
  encryptedPassword: string
  passkeyId: string
}

export interface CredentialsRepository {
  get(): Promise<PasskeyCredentials>
  set(credentials: PasskeyCredentials): Promise<void>
}

const DB_NAME = 'arkade'

export class IndexedDbCredentials implements CredentialsRepository {
  static STORE_NAME = 'credentials'
  static DB_VERSION = 1

  private db: IDBDatabase | null = null

  static async create(): Promise<IndexedDbCredentials> {
    const instance = new IndexedDbCredentials()
    await instance.init()
    return instance
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, IndexedDbCredentials.DB_VERSION)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(IndexedDbCredentials.STORE_NAME)) {
          db.createObjectStore(IndexedDbCredentials.STORE_NAME)
        }
      }
    })
  }

  async get(): Promise<PasskeyCredentials> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(IndexedDbCredentials.STORE_NAME, 'readonly')
      const store = transaction.objectStore(IndexedDbCredentials.STORE_NAME)
      const request = store.get('credentials')

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          reject(new Error('No credentials found'))
          return
        }
        resolve(result)
      }
    })
  }

  async set(credentials: PasskeyCredentials): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(IndexedDbCredentials.STORE_NAME, 'readwrite')
      const store = transaction.objectStore(IndexedDbCredentials.STORE_NAME)
      const request = store.put(credentials, 'credentials')

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }
}
