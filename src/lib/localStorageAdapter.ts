/**
 * LocalStorage-based storage adapter
 * Fallback for when IndexedDB is unavailable (e.g., Safari in Lockdown mode)
 *
 * This adapter implements the same interface as IndexedDBStorageAdapter
 * from @arkade-os/sdk but uses localStorage instead.
 */

export class LocalStorageAdapter {
  private dbName: string
  private prefix: string

  constructor(dbName: string) {
    this.dbName = dbName
    this.prefix = `${dbName}:`
  }

  /**
   * Get all items from a collection
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const key = `${this.prefix}${storeName}`
    try {
      const data = localStorage.getItem(key)
      if (!data) return []
      return JSON.parse(data) as T[]
    } catch (error) {
      console.error(`Error getting all items from ${storeName}:`, error)
      return []
    }
  }

  /**
   * Get a single item by key
   */
  async get<T>(storeName: string, key: string | number): Promise<T | undefined> {
    const items = await this.getAll<T>(storeName)
    return items.find((item: any) => item.id === key || item[storeName] === key)
  }

  /**
   * Add or update an item in a collection
   */
  async put<T>(storeName: string, value: T, key?: string): Promise<void> {
    const items = await this.getAll<T>(storeName)

    // If a key is provided, check if the item exists and update it
    if (key && typeof value === 'object' && value !== null) {
      const itemKey = (value as any)[key]
      const existingIndex = items.findIndex((item: any) => item[key] === itemKey)

      if (existingIndex !== -1) {
        items[existingIndex] = value
      } else {
        items.push(value)
      }
    } else {
      items.push(value)
    }

    const storageKey = `${this.prefix}${storeName}`
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } catch (error) {
      console.error(`Error saving to ${storeName}:`, error)
      throw error
    }
  }

  /**
   * Delete an item from a collection
   */
  async delete(storeName: string, key: string | number): Promise<void> {
    const items = await this.getAll(storeName)
    const filtered = items.filter((item: any) => item.id !== key)

    const storageKey = `${this.prefix}${storeName}`
    try {
      localStorage.setItem(storageKey, JSON.stringify(filtered))
    } catch (error) {
      console.error(`Error deleting from ${storeName}:`, error)
      throw error
    }
  }

  /**
   * Clear all items from a collection
   */
  async clear(storeName: string): Promise<void> {
    const storageKey = `${this.prefix}${storeName}`
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.error(`Error clearing ${storeName}:`, error)
      throw error
    }
  }

  /**
   * Delete the entire database (all collections)
   */
  async deleteDatabase(): Promise<void> {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }
}
