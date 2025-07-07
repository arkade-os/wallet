import { ReactNode, createContext, useContext, useEffect, useState, useRef } from 'react'
import { SwapStatus, monitorSwap, stopMonitoring, fetchSwapStatus, preconnectBoltzWebSocket } from '../lib/boltz'
import { NetworkName } from '@arkade-os/sdk/dist/types/networks'
import { WalletContext } from './wallet'
import { consoleLog, consoleError } from '../lib/logs'

interface LightningContextProps {
  isMonitoring: boolean
  lightningStatus: SwapStatus
  error: string | null
  startMonitoring: (swapId: string) => void
  stopMonitoring: () => void
}

export const LightningContext = createContext<LightningContextProps>({
  isMonitoring: false,
  lightningStatus: null,
  error: null,
  startMonitoring: () => {},
  stopMonitoring: () => {},
})

export function LightningProvider({ children }: { children: ReactNode }) {
  const [currentSwapId, setCurrentSwapId] = useState<string | null>(null)
  const [lightningStatus, setLightningStatus] = useState<SwapStatus>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { wallet } = useContext(WalletContext)

  // Reference to the status polling interval and preconnected WebSocket
  const statusPollingRef = useRef<number | null>(null)
  const preconnectedWsRef = useRef<WebSocket | null>(null)

  const handleStatusUpdate = (status: SwapStatus, statusError?: string) => {
    if (!status && statusError) {
      // For connection errors, log them but don't show to user
      if (
        statusError.includes('Connection error') ||
        statusError.includes('Failed to connect') ||
        statusError.includes('WebSocket')
      ) {
        consoleLog(`Silent Lightning error (not showing to user): ${statusError}`)
        return
      }

      // Only set other types of errors if there's an error message and no status
      setError(statusError)
      consoleLog(`Lightning error: ${statusError}`)
      return
    }

    if (status) {
      setLightningStatus(status)
      consoleLog(`Lightning swap status updated: ${status}`)

      // Clear any previous connection errors when we get a valid status
      if (error?.includes('Connection error')) {
        setError(null)
      }

      // Handle final statuses
      if (['transaction.claimed', 'invoice.settled'].includes(status as string)) {
        // Success case - can be handled in UI
        // Stop polling when we reach a success status
        if (statusPollingRef.current) {
          clearInterval(statusPollingRef.current)
          statusPollingRef.current = null
        }
      } else if (
        ['swap.expired', 'transaction.refunded', 'invoice.failedToPay', 'transaction.failed'].includes(status as string)
      ) {
        // Failure case - can be handled in UI
        setError(`Lightning payment failed: ${status}`)
        // Stop polling when we reach a failure status
        if (statusPollingRef.current) {
          clearInterval(statusPollingRef.current)
          statusPollingRef.current = null
        }
      }
    }

    // Only set non-connection errors
    if (
      statusError &&
      !statusError.includes('Connection error') &&
      !statusError.includes('Failed to connect') &&
      !statusError.includes('WebSocket')
    ) {
      setError(statusError)
    }
  }

  // Start polling for swap status as a fallback mechanism
  const startStatusPolling = (swapId: string, network: NetworkName) => {
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current)
    }

    // Poll every 5 seconds
    statusPollingRef.current = window.setInterval(async () => {
      try {
        if (!isMonitoring) return

        const status = await fetchSwapStatus(swapId, network)
        if (status) {
          consoleLog(`Polled status update: ${status}`)
          handleStatusUpdate(status)
        }
      } catch (err) {
        consoleError(err, 'Error polling swap status')
      }
    }, 5000) as number
  }

  const startMonitoring = (swapId: string) => {
    if (!wallet?.network) {
      consoleError('Cannot monitor swap: wallet network not available')
      return
    }

    // Clean up any existing monitoring
    if (currentSwapId) {
      stopMonitoring(currentSwapId)
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current)
        statusPollingRef.current = null
      }
    }

    setCurrentSwapId(swapId)
    setLightningStatus(null)
    // Don't set error to null to avoid UI flashes if there's a connection issue
    // The error will be cleared once we get a status update
    setIsMonitoring(true)

    consoleLog(`Starting to monitor swap ${swapId} on ${wallet.network}`)

    // Start monitoring using the imported function, using the preconnected WebSocket if available
    const ws = preconnectedWsRef.current
    monitorSwap(swapId, wallet.network, handleStatusUpdate, 0, ws || undefined)

    // Reset the preconnected WebSocket reference since it's now being used
    preconnectedWsRef.current = null

    // Start a new preconnection for future use
    preconnectBoltzWebSocket(wallet.network).then((ws) => {
      preconnectedWsRef.current = ws
    })

    // Also start polling as a fallback
    startStatusPolling(swapId, wallet.network)
  }

  const stopMonitoringSwap = () => {
    if (currentSwapId) {
      consoleLog(`Stopping monitoring for swap ${currentSwapId}`)
      stopMonitoring(currentSwapId)
    }

    // Clear polling interval
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current)
      statusPollingRef.current = null
    }

    setCurrentSwapId(null)
    setIsMonitoring(false)
  }

  // Establish a connection early when wallet is ready
  useEffect(() => {
    if (wallet?.network) {
      consoleLog('Attempting to pre-connect to Boltz WebSocket')
      // Start a pre-connection that we can use when needed
      preconnectBoltzWebSocket(wallet.network).then((ws) => {
        preconnectedWsRef.current = ws
        consoleLog('Boltz WebSocket pre-connection established:', ws ? 'success' : 'failed')
      })
    }

    return () => {
      // Clean up the pre-connection if it exists
      if (preconnectedWsRef.current) {
        consoleLog('Cleaning up pre-connected WebSocket')
        if (preconnectedWsRef.current.readyState === WebSocket.OPEN) {
          preconnectedWsRef.current.close()
        }
        preconnectedWsRef.current = null
      }
    }
  }, [wallet?.network])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (currentSwapId) {
        consoleLog(`Component unmounting, cleaning up swap monitoring for ${currentSwapId}`)
        stopMonitoring(currentSwapId)
      }

      // Clear polling interval
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current)
        statusPollingRef.current = null
      }
    }
  }, [currentSwapId])

  return (
    <LightningContext.Provider
      value={{
        isMonitoring,
        lightningStatus,
        error,
        startMonitoring,
        stopMonitoring: stopMonitoringSwap,
      }}
    >
      {children}
    </LightningContext.Provider>
  )
}
