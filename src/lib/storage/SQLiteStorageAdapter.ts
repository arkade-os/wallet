import { CapacitorSQLite, SQLiteDBConnection, SQLiteConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'

/**
 * SQLite-based storage adapter for native Capacitor apps
 *
 * Provides a key-value storage interface backed by SQLite for better performance
 * and scalability compared to native Preferences/SharedPreferences.
 *
 * Features:
 * - Persistent storage using native SQLite
 * - Indexed queries for fast lookups
 * - Support for large datasets (VTXOs, transactions, etc.)
 * - Automatic schema creation
 *
 * Storage on native platforms:
 * - iOS: SQLite database in app's Documents directory
 * - Android: SQLite database using Android's SQLite API
 * - Web: Falls back to IndexedDB via sql.js (via jeep-sqlite)
 */
export class SQLiteStorageAdapter {
  private dbName: string
  private db: SQLiteDBConnection | null = null
  private sqlite: SQLiteConnection
  private initialized = false
  private initPromise: Promise<void> | null = null

  constructor(dbName = 'arkade-wallet') {
    this.dbName = dbName
    this.sqlite = new SQLiteConnection(CapacitorSQLite)
  }

  /**
   * Initialize the database connection and create schema
   * Uses lazy initialization pattern - only initializes on first use
   */
  private async initialize(): Promise<void> {
    // If already initialized, return
    if (this.initialized) return

    // If initialization is in progress, wait for it
    if (this.initPromise) return this.initPromise

    // Start initialization
    this.initPromise = this._doInitialize()
    await this.initPromise
  }

  private async _doInitialize(): Promise<void> {
    try {
      const platform = Capacitor.getPlatform()

      // For web platform, need to initialize the web store
      if (platform === 'web') {
        await this.sqlite.initWebStore()
      }

      // Create/open database
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false, // not encrypted (can enable later)
        'no-encryption',
        1, // version
        false, // readonly
      )

      await this.db.open()

      // Create key-value table if it doesn't exist
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS storage (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_storage_key ON storage(key);
      `)

      this.initialized = true
    } catch (error) {
      this.initPromise = null
      throw new Error(`Failed to initialize SQLite database: ${error}`)
    }
  }

  /**
   * Get an item from storage
   * @param key - The key to retrieve
   * @returns The value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const result = await this.db.query('SELECT value FROM storage WHERE key = ?', [key])

      if (result.values && result.values.length > 0) {
        return result.values[0].value
      }

      return null
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
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      // Use INSERT OR REPLACE to handle both insert and update
      await this.db.run(
        `INSERT OR REPLACE INTO storage (key, value, updated_at)
         VALUES (?, ?, strftime('%s', 'now'))`,
        [key, value],
      )
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
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      await this.db.run('DELETE FROM storage WHERE key = ?', [key])
    } catch (error) {
      console.error(`Error removing item ${key}:`, error)
      throw error
    }
  }

  /**
   * Clear all items from storage
   */
  async clear(): Promise<void> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      await this.db.run('DELETE FROM storage')
    } catch (error) {
      console.error('Error clearing storage:', error)
      throw error
    }
  }

  /**
   * Get all keys in storage
   * @returns Array of keys
   */
  async keys(): Promise<string[]> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const result = await this.db.query('SELECT key FROM storage ORDER BY key')

      if (result.values && result.values.length > 0) {
        return result.values.map((row) => row.key)
      }

      return []
    } catch (error) {
      console.error('Error getting keys:', error)
      return []
    }
  }

  /**
   * Close the database connection
   * Should be called when the adapter is no longer needed
   */
  async close(): Promise<void> {
    if (this.db) {
      try {
        await this.sqlite.closeConnection(this.dbName, false)
        this.db = null
        this.initialized = false
        this.initPromise = null
      } catch (error) {
        console.error('Error closing database:', error)
      }
    }
  }

  /**
   * Get storage statistics (useful for debugging/monitoring)
   */
  async getStats(): Promise<{ itemCount: number; dbSizeKB: number }> {
    await this.initialize()

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const countResult = await this.db.query('SELECT COUNT(*) as count FROM storage')
      const itemCount = countResult.values?.[0]?.count || 0

      // Database size estimation (not exact but useful)
      const sizeResult = await this.db.query('SELECT SUM(LENGTH(key) + LENGTH(value)) as size FROM storage')
      const dbSizeBytes = sizeResult.values?.[0]?.size || 0
      const dbSizeKB = Math.ceil(dbSizeBytes / 1024)

      return { itemCount, dbSizeKB }
    } catch (error) {
      console.error('Error getting storage stats:', error)
      return { itemCount: 0, dbSizeKB: 0 }
    }
  }
}
