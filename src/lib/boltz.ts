import { NetworkName } from '@arkade-os/sdk/dist/types/networks'
import { Satoshis, Wallet } from './types'
import * as bolt11 from './bolt11'
import { consoleLog, consoleError } from './logs'

// Boltz swap status types
export type SwapStatus =
  | 'swap.created'
  | 'transaction.mempool'
  | 'transaction.confirmed'
  | 'invoice.set'
  | 'invoice.pending'
  | 'invoice.paid'
  | 'invoice.failedToPay'
  | 'invoice.settled'
  | 'invoice.expired'
  | 'transaction.claim.pending'
  | 'transaction.claimed'
  | 'swap.expired'
  | 'transaction.lockupFailed'
  | 'transaction.failed'
  | 'transaction.refunded'
  | null

// Callback for swap status updates
export type SwapStatusCallback = (status: SwapStatus, error?: string) => void

// Map to store active websocket connections
const activeConnections: Record<string, WebSocket> = {}

// Store websocket connection promises to avoid duplicate connection attempts
const connectionPromises: Record<string, Promise<WebSocket | null>> = {}

type SwapSubmarineResponse = {
  ARK: {
    BTC: {
      hash: string
      rate: number
      limits: {
        maximal: number
        minimal: number
        maximalZeroConf: number
      }
      fees: {
        percentage: number
        minerFees: number
      }
    }
  }
}

export const getBoltzApiUrl = (network: NetworkName): string => {
  switch (network) {
    case 'bitcoin':
      return 'https://boltz.arkade.sh'
    case 'regtest':
      return 'http://localhost:9069'
    default:
      return ''
  }
}

export const getBoltzLimits = async (network: NetworkName): Promise<{ min: number; max: number }> => {
  const url = getBoltzApiUrl(network)
  if (!url) throw 'Invalid network for Boltz API'
  const response = await fetch(`${getBoltzApiUrl(network)}/v2/swap/submarine`)
  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to fetch limits'
  }
  const json: SwapSubmarineResponse = await response.json()
  const { minimal, maximal } = json.ARK.BTC.limits
  return {
    min: minimal,
    max: maximal,
  }
}

export const getInvoiceSatoshis = (invoice: string): number => {
  return bolt11.decode(invoice).satoshis ?? 0
}

export const submarineSwap = async (
  invoice: string,
  wallet: Wallet,
): Promise<{ address: string; amount: number; id: string }> => {
  const refundPublicKey = wallet.pubkey
  if (!refundPublicKey) throw 'Failed to get public key'
  if (!wallet.network) throw 'Failed to get network'

  const response = await fetch(`${getBoltzApiUrl(wallet.network)}/v2/swap/submarine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ARK',
      to: 'BTC',
      invoice,
      refundPublicKey,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw errorData.error || 'Failed to process Lightning payment'
  }

  const res = (await response.json()) as {
    address: string
    expectedAmount: number
    id: string
  }

  return { address: res.address, amount: res.expectedAmount, id: res.id }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const reverseSwap = async (sats: Satoshis): Promise<string> => {
  return '' // TODO not implemented yet
}

/**
 * Establish a WebSocket connection to Boltz server ahead of time
 * This allows us to warm up the connection before we need it
 * @param network The network name (bitcoin or regtest)
 * @returns Promise that resolves to the WebSocket or null if connection fails
 */
export const preconnectBoltzWebSocket = async (network: NetworkName): Promise<WebSocket | null> => {
  // Use a unique key for each network
  const cacheKey = `preconnect-${network}`

  // If we already have a connection promise, return it
  if (cacheKey in connectionPromises) {
    return connectionPromises[cacheKey]
  }

  // Otherwise create a new connection
  connectionPromises[cacheKey] = new Promise((resolve) => {
    try {
      const baseUrl = getBoltzApiUrl(network)
      if (!baseUrl) {
        consoleLog('Invalid network for Boltz API preconnection')
        resolve(null)
        return
      }

      // Convert HTTP URL to WebSocket URL
      const wsUrl = baseUrl.replace(/^http(s)?:\/\//, 'ws$1://') + '/v2/ws'

      consoleLog(`Preconnecting to Boltz WebSocket at ${wsUrl}`)
      const ws = new WebSocket(wsUrl)

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          consoleLog('Preconnection WebSocket timed out')
          resolve(null)
          // Cleanup the failed connection attempt
          delete connectionPromises[cacheKey]
        }
      }, 5000)

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        consoleLog('Boltz WebSocket preconnection established')
        resolve(ws)
      }

      ws.onerror = () => {
        clearTimeout(connectionTimeout)
        consoleLog('Boltz WebSocket preconnection failed')
        resolve(null)
        // Cleanup the failed connection attempt
        delete connectionPromises[cacheKey]
      }

      ws.onclose = () => {
        consoleLog('Boltz WebSocket preconnection closed')
        // Cleanup on close so we can try again next time
        delete connectionPromises[cacheKey]
      }
    } catch (err) {
      consoleError(err, 'Failed to preconnect to Boltz WebSocket')
      resolve(null)
      // Cleanup the failed connection attempt
      delete connectionPromises[cacheKey]
    }
  })

  return connectionPromises[cacheKey]
}

/**
 * Monitors a Boltz swap via WebSocket using the proper subscription protocol
 * Uses silent error handling and reconnection to avoid showing errors to users
 * @param swapId The ID of the swap to monitor
 * @param network The network name
 * @param onStatusUpdate Callback function for status updates
 * @param retryCount Optional retry counter for internal use
 * @param preconnectedWs Optional preconnected WebSocket
 */
export const monitorSwap = (
  swapId: string,
  network: NetworkName,
  onStatusUpdate: SwapStatusCallback,
  retryCount: number = 0,
  preconnectedWs?: WebSocket,
): void => {
  // Maximum immediate retries for initial connection
  const MAX_IMMEDIATE_RETRIES = 3
  // Stop any existing connection for this swap
  stopMonitoring(swapId)

  try {
    const baseUrl = getBoltzApiUrl(network)
    if (!baseUrl) {
      // Silently handle error - just log it but don't update UI
      consoleLog('Invalid network for Boltz API')
      return
    }

    // Use preconnected WebSocket if available, otherwise create a new one
    let ws: WebSocket | null = null
    if (preconnectedWs && preconnectedWs.readyState === WebSocket.OPEN) {
      consoleLog('Using preconnected WebSocket for swap monitoring')
      ws = preconnectedWs
    } else {
      // Convert HTTP URL to WebSocket URL
      const wsUrl = baseUrl.replace(/^http(s)?:\/\//, 'ws$1://') + '/v2/ws'

      consoleLog(`Connecting to Boltz WebSocket at ${wsUrl} (attempt ${retryCount + 1})`)
      ws = new WebSocket(wsUrl)
    }

    // Set connection timeout to detect stalled connection attempts
    const connectionTimeoutMs = 5000 // 5 seconds
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        consoleLog(`WebSocket connection timed out after ${connectionTimeoutMs}ms`)
        ws.close()

        // Try REST API fallback while retrying WebSocket
        // IMPORTANT: We don't pass error to UI - silently handle connection issues
        if (retryCount === 0) {
          consoleLog('Attempting to fetch initial status via REST API')
          fetchSwapStatus(swapId, network).then((status) => {
            if (status) {
              consoleLog(`Got initial status via REST API: ${status}`)
              onStatusUpdate(status)
            }
          })
        }

        // Retry connection if under max retries
        if (retryCount < MAX_IMMEDIATE_RETRIES) {
          consoleLog(`Immediately retrying connection (${retryCount + 1}/${MAX_IMMEDIATE_RETRIES})`)
          setTimeout(() => {
            monitorSwap(swapId, network, onStatusUpdate, retryCount + 1)
          }, 1000) // Wait 1 second before retry
        }
      }
    }, connectionTimeoutMs)

    // Reconnection variables
    const MAX_RECONNECT_ATTEMPTS = 10 // Increased from 5 to 10 for more resilience
    const RECONNECT_INTERVAL = 3000 // 3 seconds
    let reconnectAttempts = 0

    // Function to attempt reconnection - all errors silently handled
    const attemptReconnect = () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        consoleLog(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)

        // Clear existing connection
        delete activeConnections[swapId]

        // Try to reconnect after delay
        setTimeout(() => {
          monitorSwap(swapId, network, onStatusUpdate)
        }, RECONNECT_INTERVAL)
      } else {
        consoleLog('Max reconnection attempts reached, falling back to REST API polling')
        // Check status via REST API as last resort
        fetchSwapStatus(swapId, network).then((status) => {
          if (status) {
            consoleLog(`Got status via REST API after WebSocket failed: ${status}`)
            onStatusUpdate(status)
          } else {
            // Don't show error message to user - silently fall back to polling
            consoleLog('Failed to get payment status after multiple attempts')
          }
        })
      }
    }

    ws.onopen = () => {
      // Clear the connection timeout since we're connected
      clearTimeout(connectionTimeout)

      consoleLog(`Boltz WebSocket connection established for swap ${swapId}`)

      // After connection is established, subscribe to swap updates using proper protocol
      const subscriptionMessage = JSON.stringify({
        op: 'subscribe',
        channel: 'swap.update',
        args: [swapId],
      })

      ws.send(subscriptionMessage)
      consoleLog(`Subscribed to updates for swap ${swapId}`)

      // Also fetch initial status via REST API to ensure we have the most current state
      // This helps if the WebSocket connected but we missed earlier messages
      fetchSwapStatus(swapId, network).then((status) => {
        if (status) {
          consoleLog(`Got initial status via REST API after WebSocket connected: ${status}`)
          onStatusUpdate(status)
        }
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        consoleLog('Boltz WebSocket message received:', data)

        // Handle subscription acknowledgment
        if (data.event === 'subscribed' && data.channel === 'swap.update') {
          consoleLog('Successfully subscribed to swap updates')
          return
        }

        // Handle swap update events - support multiple possible message formats
        if (
          // Format: {channel: 'swap.update', data: {id: '...', status: '...'}}
          (data.channel === 'swap.update' && data.data?.id && data.data?.status) ||
          // Format: {event: 'swap.update', data: {id: '...', status: '...'}}
          (data.event === 'swap.update' && data.data?.id && data.data?.status) ||
          // Format: {id: '...', status: '...'}
          (data.id && data.status)
        ) {
          // Extract id and status from the appropriate location in the data
          const id = data.data?.id || data.id
          const status = data.data?.status || data.status

          // Only process updates for our swap ID
          if (id === swapId) {
            consoleLog(`Received status update for swap ${id}: ${status}`)
            onStatusUpdate(status)
          }
        }
        // If we get a message we don't understand but it might be related to our swap
        else if (data.id === swapId || (data.data && data.data.id === swapId)) {
          consoleLog('Received unrecognized message format for our swap:', data)

          // Try to extract a status if possible
          const status = data.status || data.data?.status || null
          if (status) {
            consoleLog(`Extracted status from unrecognized message: ${status}`)
            onStatusUpdate(status)
          }
        }
      } catch (err) {
        consoleError(err, 'Error parsing Boltz WebSocket message')
        // Don't pass error to UI - silently handle JSON parsing errors
      }
    }

    ws.onerror = (err) => {
      consoleError(err, 'Boltz WebSocket error')
      // Don't show error to user - silently handle WebSocket errors
      attemptReconnect()
    }

    ws.onclose = (event) => {
      consoleLog(
        `Boltz WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`,
      )

      // If this wasn't a normal closure, attempt to reconnect
      if (event.code !== 1000) {
        attemptReconnect()
      }

      delete activeConnections[swapId]
    }

    activeConnections[swapId] = ws
  } catch (err) {
    consoleError(err, 'Failed to connect to Boltz WebSocket')
    // Don't show error to user - silently handle connection errors

    // Attempt to connect again after a delay
    if (retryCount < MAX_IMMEDIATE_RETRIES) {
      setTimeout(() => {
        monitorSwap(swapId, network, onStatusUpdate, retryCount + 1)
      }, 1000)
    }
  }
}

/**
 * Stops monitoring a specific swap by properly unsubscribing and closing the WebSocket connection
 * @param swapId The ID of the swap to stop monitoring
 */
export const stopMonitoring = (swapId: string): void => {
  if (activeConnections[swapId]) {
    const ws = activeConnections[swapId]

    // Only send unsubscribe message if the connection is still open
    if (ws.readyState === WebSocket.OPEN) {
      try {
        // Send unsubscribe message before closing
        const unsubscribeMessage = JSON.stringify({
          op: 'unsubscribe',
          channel: 'swap.update',
          args: [swapId],
        })

        ws.send(unsubscribeMessage)
        consoleLog(`Unsubscribed from swap ${swapId} updates`)

        // Close the connection after a small delay to ensure the message is sent
        setTimeout(() => {
          ws.close()
        }, 100)
      } catch (err) {
        consoleError(err, 'Error sending unsubscribe message')
        // Close the connection anyway
        ws.close()
      }
    } else {
      // Just close if not in OPEN state
      ws.close()
    }

    delete activeConnections[swapId]
  }
}

/**
 * Stops monitoring all swaps by properly unsubscribing and closing all WebSocket connections
 */
export const stopAllMonitoring = (): void => {
  Object.keys(activeConnections).forEach((swapId) => {
    // Use the individual stopMonitoring function for consistent behavior
    stopMonitoring(swapId)
  })
}

/**
 * Fetch swap status directly via REST API as a fallback mechanism
 * @param swapId The ID of the swap to check
 * @param network The network name
 * @returns Promise resolving to the swap status
 */
export const fetchSwapStatus = async (swapId: string, network: NetworkName): Promise<SwapStatus> => {
  try {
    const baseUrl = getBoltzApiUrl(network)
    if (!baseUrl) {
      throw new Error('Invalid network for Boltz API')
    }

    const response = await fetch(`${baseUrl}/v2/swap/${swapId}`)
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch swap status')
    }

    const data = await response.json()
    consoleLog('Fetched swap status via REST API:', data)

    return data.status || null
  } catch (err) {
    consoleError(err, 'Error fetching swap status via REST API')
    return null
  }
}
