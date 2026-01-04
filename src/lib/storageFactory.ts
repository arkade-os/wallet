import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB'
import { LocalStorageAdapter } from './localStorageAdapter'
import { consoleLog } from './logs'

/**
 * Checks if IndexedDB is actually available and usable
 * In Safari Lockdown mode, window.indexedDB exists but operations fail
 */
export async function isIndexedDBAvailable(): Promise<boolean> {
  if (!window.indexedDB) {
    return false
  }

  try {
    // Try to actually open a database to verify it works
    const testDbName = '__indexeddb_test__'
    const request = window.indexedDB.open(testDbName, 1)

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false)
      }, 1000)

      request.onsuccess = () => {
        clearTimeout(timeout)
        // Clean up test database
        const db = request.result
        db.close()
        window.indexedDB.deleteDatabase(testDbName)
        resolve(true)
      }

      request.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }

      request.onblocked = () => {
        clearTimeout(timeout)
        resolve(false)
      }
    })
  } catch {
    return false
  }
}

/**
 * Creates a storage adapter, preferring IndexedDB but falling back to localStorage
 * when IndexedDB is unavailable (e.g., Safari in Lockdown mode)
 */
export async function createStorageAdapter(dbName: string): Promise<IndexedDBStorageAdapter | LocalStorageAdapter> {
  const indexedDBAvailable = await isIndexedDBAvailable()

  if (indexedDBAvailable) {
    consoleLog('Using IndexedDB for storage')
    return new IndexedDBStorageAdapter(dbName)
  } else {
    consoleLog('IndexedDB unavailable, falling back to localStorage')
    return new LocalStorageAdapter(dbName)
  }
}

/**
 * Synchronous version that returns LocalStorageAdapter immediately
 * Use this when you need a storage adapter synchronously (e.g., in module initialization)
 */
export function createLocalStorageAdapter(dbName: string): LocalStorageAdapter {
  return new LocalStorageAdapter(dbName)
}
