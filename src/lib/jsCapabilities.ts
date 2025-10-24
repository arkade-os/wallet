/**
 * Detects if JavaScript and required capabilities are available in the current environment.
 * This is particularly important for restricted browsers (like iOS PWAs with JIT disabled)
 * where cryptographic operations might fail or be extremely slow.
 */

export interface JSCapabilityCheck {
  isSupported: boolean
  errorMessage?: string
}

/**
 * Tests if the environment has sufficient JavaScript capabilities for the wallet to function.
 * This includes checking for:
 * - Basic JavaScript execution (implicitly tested by running this code)
 * - Cryptographic operations performance
 * - Web Workers support (used by the wallet service worker)
 * - IndexedDB support (used for storage)
 */
export const detectJSCapabilities = async (): Promise<JSCapabilityCheck> => {
  try {
    // Check for Web Workers support (required for the wallet service worker)
    if (!window.Worker) {
      return {
        isSupported: false,
        errorMessage: 'Web Workers are not supported in this environment. The wallet requires Web Workers to function.',
      }
    }

    // Check for Service Worker support
    if (!('serviceWorker' in navigator)) {
      return {
        isSupported: false,
        errorMessage: 'Service Workers are not supported in this environment. The wallet requires Service Workers to function.',
      }
    }

    // Check for IndexedDB support (required for wallet storage)
    if (!window.indexedDB) {
      return {
        isSupported: false,
        errorMessage: 'IndexedDB is not supported in this environment. The wallet requires IndexedDB for storage.',
      }
    }

    // Check for crypto.subtle support (required for cryptographic operations)
    if (!window.crypto || !window.crypto.subtle) {
      return {
        isSupported: false,
        errorMessage: 'Web Crypto API is not supported in this environment. The wallet requires cryptographic capabilities.',
      }
    }

    // Test basic cryptographic performance
    // If JIT is disabled, crypto operations might be extremely slow
    const perfCheck = await testCryptoPerformance()
    if (!perfCheck.isSupported) {
      return perfCheck
    }

    return {
      isSupported: true,
    }
  } catch (error) {
    return {
      isSupported: false,
      errorMessage: `JavaScript capabilities check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tests cryptographic operation performance.
 * In environments with JIT disabled, crypto operations can be 10-100x slower.
 */
const testCryptoPerformance = async (): Promise<JSCapabilityCheck> => {
  try {
    const startTime = performance.now()
    
    // Perform a simple but representative crypto operation
    // This tests if the environment can handle the crypto libraries we use
    const data = new Uint8Array(32)
    window.crypto.getRandomValues(data)
    
    // Test SHA-256 hashing (used extensively in Bitcoin/crypto operations)
    const encoder = new TextEncoder()
    const testData = encoder.encode('test-crypto-performance-check')
    await window.crypto.subtle.digest('SHA-256', testData)
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // If basic crypto operations take more than 1 second, something is seriously wrong
    // (likely JIT is disabled or environment is severely restricted)
    if (duration > 1000) {
      return {
        isSupported: false,
        errorMessage: 'JavaScript performance is severely degraded. Please enable JIT compilation in your browser settings.',
      }
    }
    
    return {
      isSupported: true,
    }
  } catch {
    return {
      isSupported: false,
      errorMessage: 'Cryptographic operations failed. Please check your browser settings.',
    }
  }
}

/**
 * Gets a user-friendly error message for restricted environments.
 * Provides specific guidance for iOS users about enabling JIT.
 */
export const getRestrictedEnvironmentMessage = (isIOS: boolean): string => {
  if (isIOS) {
    return 'We need JavaScript with JIT enabled. Please go to Settings > Safari > Advanced and enable JavaScript JIT compilation.'
  }
  return 'We need JavaScript enabled with full capabilities. Please check your browser settings and enable JavaScript.'
}
