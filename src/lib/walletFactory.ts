import { Wallet, ServiceWorkerWallet, SingleKey, NetworkName } from '@arkade-os/sdk'
import { isNativePlatform } from './platform'
import { SQLiteStorageAdapter } from './storage/SQLiteStorageAdapter'
import { consoleError } from './logs'

/**
 * Configuration for wallet initialization
 */
export interface WalletConfig {
  privateKey: string
  arkServerUrl: string
  esploraUrl: string
  network: NetworkName
}

/**
 * Retry configuration for wallet initialization
 */
interface RetryConfig {
  retryCount?: number
  maxRetries?: number
}

/**
 * Result of wallet initialization - discriminated union
 */
export type WalletInstance =
  | { type: 'service-worker'; wallet: ServiceWorkerWallet }
  | { type: 'standard'; wallet: Wallet }

/**
 * Creates the appropriate wallet type based on the platform
 *
 * - In native Capacitor apps: Uses standard Wallet with SQLite storage for production-grade performance
 * - In web/PWA: Uses ServiceWorkerWallet for better performance and security
 *
 * @param config - Wallet configuration
 * @param retryConfig - Optional retry configuration (only used for ServiceWorker)
 * @returns Promise<WalletInstance> - Discriminated union of wallet types
 */
export const createWallet = async (config: WalletConfig, retryConfig: RetryConfig = {}): Promise<WalletInstance> => {
  const isNative = isNativePlatform()

  if (isNative) {
    // Native platform: use standard Wallet with Capacitor storage
    return await createStandardWallet(config)
  } else {
    // Web platform: use ServiceWorkerWallet
    return await createServiceWorkerWallet(config, retryConfig)
  }
}

/**
 * Creates a standard Wallet for native platforms using SQLite storage
 */
const createStandardWallet = async (config: WalletConfig): Promise<WalletInstance> => {
  try {
    const storage = new SQLiteStorageAdapter('arkade-wallet')
    const identity = SingleKey.fromHex(config.privateKey)

    const wallet = await Wallet.create({
      identity,
      arkServerUrl: config.arkServerUrl,
      esploraUrl: config.esploraUrl,
      storage,
    })

    return {
      type: 'standard',
      wallet,
    }
  } catch (error) {
    consoleError(error, 'Failed to create standard wallet')
    throw error
  }
}

/**
 * Creates a ServiceWorkerWallet for web platforms
 */
const createServiceWorkerWallet = async (
  config: WalletConfig,
  { retryCount = 0, maxRetries = 5 }: RetryConfig,
): Promise<WalletInstance> => {
  try {
    const identity = SingleKey.fromHex(config.privateKey)

    const wallet = await ServiceWorkerWallet.setup({
      serviceWorkerPath: '/wallet-service-worker.mjs',
      identity,
      arkServerUrl: config.arkServerUrl,
      esploraUrl: config.esploraUrl,
    })

    return {
      type: 'service-worker',
      wallet,
    }
  } catch (err) {
    // Handle service worker activation timeout with exponential backoff
    if (err instanceof Error && err.message.includes('Service worker activation timed out')) {
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000
        consoleError(
          new Error(
            `Service worker activation timed out, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
          ),
          'Service worker activation retry',
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        return createServiceWorkerWallet(config, { retryCount: retryCount + 1, maxRetries })
      } else {
        consoleError(
          new Error('Service worker activation timed out after maximum retries'),
          'Service worker activation failed',
        )
        throw err
      }
    }
    // Re-throw other errors
    throw err
  }
}

/**
 * Type guard to check if wallet is ServiceWorkerWallet
 */
export const isServiceWorkerWallet = (
  instance: WalletInstance,
): instance is { type: 'service-worker'; wallet: ServiceWorkerWallet } => {
  return instance.type === 'service-worker'
}

/**
 * Type guard to check if wallet is standard Wallet
 */
export const isStandardWallet = (instance: WalletInstance): instance is { type: 'standard'; wallet: Wallet } => {
  return instance.type === 'standard'
}
