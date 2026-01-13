import { Preferences } from '@capacitor/preferences'

/**
 * Storage adapter for Capacitor using the Preferences API
 * Implements the storage interface expected by @arkade-os/sdk
 *
 * This adapter provides persistent key-value storage for native mobile platforms
 * using Capacitor's Preferences plugin, which stores data in:
 * - iOS: UserDefaults
 * - Android: SharedPreferences
 */
export class CapacitorStorageAdapter {
  private prefix: string

  /**
   * Creates a new Capacitor storage adapter
   * @param prefix - Optional prefix for all keys to avoid collisions
   */
  constructor(prefix = 'arkade-wallet') {
    this.prefix = prefix
  }

  /**
   * Get the full key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`
  }

  /**
   * Get an item from storage
   * @param key - The key to retrieve
   * @returns The value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: this.getKey(key) })
      return value
    } catch (error) {
      console.error(`Error getting item ${key}:`, error)
      return null
    }
  }

  /**
   * Set an item in storage
   * @param key - The key to set
   * @param value - The value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({
        key: this.getKey(key),
        value,
      })
    } catch (error) {
      console.error(`Error setting item ${key}:`, error)
      throw error
    }
  }

  /**
   * Remove an item from storage
   * @param key - The key to remove
   */
  async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key: this.getKey(key) })
    } catch (error) {
      console.error(`Error removing item ${key}:`, error)
      throw error
    }
  }

  /**
   * Clear all items with this adapter's prefix
   */
  async clear(): Promise<void> {
    try {
      // Get all keys
      const { keys } = await Preferences.keys()

      // Filter keys that match our prefix and remove them
      const prefixedKeys = keys.filter((key) => key.startsWith(`${this.prefix}:`))

      // Remove all matching keys
      await Promise.all(prefixedKeys.map((key) => Preferences.remove({ key })))
    } catch (error) {
      console.error('Error clearing storage:', error)
      throw error
    }
  }

  /**
   * Get all keys with this adapter's prefix
   * @returns Array of keys (without prefix)
   */
  async keys(): Promise<string[]> {
    try {
      const { keys } = await Preferences.keys()
      const prefix = `${this.prefix}:`

      return keys.filter((key) => key.startsWith(prefix)).map((key) => key.substring(prefix.length))
    } catch (error) {
      console.error('Error getting keys:', error)
      return []
    }
  }
}
