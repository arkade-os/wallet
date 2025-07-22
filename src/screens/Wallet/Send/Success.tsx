import { useContext, useEffect, useState, useCallback } from 'react'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Success from '../../../components/Success'
import { prettyAmount } from '../../../lib/format'
import { IframeContext } from '../../../providers/iframe'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { LightningContext } from '../../../providers/lightning'
import Loading from '../../../components/Loading'
import Error from '../../../components/Error'
import { consoleLog } from '../../../lib/logs'

// Configuration constants
const AUTO_SUCCESS_TIMEOUT = 30 // seconds - time to assume success if no response
const CONNECTION_RETRY_NOTICE_TIMEOUT = 5 // seconds - time to show "trying again" notice

export default function SendSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { sendInfo } = useContext(FlowContext)
  const { iframeUrl, sendMessage } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)
  const { lightningStatus, error: lightningError, stopMonitoring } = useContext(LightningContext)

  // Track time since component mounted to auto-succeed lightning payments after timeout
  const [timeSinceMounted, setTimeSinceMounted] = useState(0)

  // Track if we've forced success due to timeout
  const [forcedSuccess, setForcedSuccess] = useState(false)

  // Store any local error state
  const [localError, setLocalError] = useState<string | null>(null)

  // Track if we're showing the connection retry notice
  const [showingRetryNotice, setShowingRetryNotice] = useState(false)

  // Combine errors from both sources
  const error = lightningError || localError

  // Show payment sent notification
  useEffect(() => {
    if (sendInfo.total) notifyPaymentSent(sendInfo.total)
  }, [sendInfo.total])

  // Show temporary "trying again" notice if we see a connection error
  // Note: With our improved error handling, connection errors should be hidden,
  // but we'll keep this as a fallback in case some errors make it through
  useEffect(() => {
    if (
      lightningError?.includes('Connection error') ||
      lightningError?.includes('Failed to connect') ||
      lightningError?.includes('WebSocket')
    ) {
      setShowingRetryNotice(true)

      // Clear the retry notice after a few seconds
      const timer = setTimeout(() => {
        setShowingRetryNotice(false)
      }, CONNECTION_RETRY_NOTICE_TIMEOUT * 1000)

      return () => clearTimeout(timer)
    }
  }, [lightningError])

  // Helper function to check if this is a lightning payment
  const isLightningPayment = useCallback(() => {
    return Boolean(sendInfo.invoice && sendInfo.swapId)
  }, [sendInfo.invoice, sendInfo.swapId])

  // Check if payment is in a pending state - any state that's not a final success or failure state
  const isPending = useCallback(() => {
    return (
      isLightningPayment() &&
      ![
        'invoice.settled',
        'transaction.claimed',
        'invoice.failedToPay',
        'swap.expired',
        'transaction.failed',
        'transaction.refunded',
      ].includes(lightningStatus || '')
    )
  }, [isLightningPayment, lightningStatus])

  // Check if payment failed
  const isFailed = useCallback(() => {
    return (
      isLightningPayment() &&
      ['invoice.failedToPay', 'swap.expired', 'transaction.failed', 'transaction.refunded'].includes(
        lightningStatus || '',
      )
    )
  }, [isLightningPayment, lightningStatus])

  // Check if payment is successfully settled
  const isSettled = useCallback(() => {
    return (
      isLightningPayment() &&
      (['invoice.settled', 'transaction.claimed'].includes(lightningStatus || '') || forcedSuccess)
    )
  }, [isLightningPayment, lightningStatus, forcedSuccess])

  // Start a timer to track time since component mounted
  useEffect(() => {
    // Only start timer for Lightning payments
    if (!isLightningPayment()) return

    const timer = setInterval(() => {
      setTimeSinceMounted((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isLightningPayment])

  // Force success after timeout if we're still pending
  useEffect(() => {
    if (timeSinceMounted >= AUTO_SUCCESS_TIMEOUT && isLightningPayment() && isPending()) {
      consoleLog(`Lightning payment timeout reached after ${AUTO_SUCCESS_TIMEOUT} seconds, assuming success`)
      setForcedSuccess(true)
      // Set a local error to indicate we've hit the timeout but are assuming success
      setLocalError('Payment may have succeeded but confirmation was not received')
    }
  }, [timeSinceMounted, isLightningPayment, isPending])

  // Clean up the monitoring when leaving the screen
  useEffect(() => {
    return () => {
      if (isLightningPayment()) {
        consoleLog('Leaving success screen, stopping lightning monitoring')
        stopMonitoring()
      }
    }
  }, [isLightningPayment, stopMonitoring])

  // Add debug logging
  useEffect(() => {
    if (isLightningPayment()) {
      consoleLog(
        `Lightning payment status update: ${lightningStatus}, isPending: ${isPending()}, isSettled: ${isSettled()}, forcedSuccess: ${forcedSuccess}`,
      )
    }
  }, [lightningStatus, isPending, isSettled, forcedSuccess, isLightningPayment])

  useEffect(() => {
    if (iframeUrl) {
      sendMessage(
        JSON.stringify({
          action: 'paid',
          arkAddress: sendInfo.arkAddress,
          satoshis: sendInfo.total,
          txid: sendInfo.txid,
        }),
      )
      navigate(Pages.Wallet)
    }
  }, [iframeUrl, sendInfo, sendMessage, navigate])

  if (iframeUrl) {
    return <></>
  }

  const displayAmount = useFiat ? prettyAmount(toFiat(sendInfo.total), config.fiat) : prettyAmount(sendInfo.total ?? 0)

  // Function to get appropriate status message for Lightning payments
  const getLightningStatusMessage = () => {
    if (forcedSuccess) {
      return `Payment of ${displayAmount} has been processed`
    }

    // For connection errors, we'll handle separately with the retry notice
    if (error && !lightningError?.includes('Connection error')) {
      if (isSettled()) {
        return `Payment of ${displayAmount} completed, but with warning: ${error}`
      }
      return `Payment initiated, but there was an error: ${error}`
    }

    switch (lightningStatus) {
      case 'invoice.paid':
        return `Payment initiated, waiting for completion...`
      case 'invoice.settled':
        return `Payment of ${displayAmount} completed successfully`
      case 'transaction.claimed':
        return `Payment of ${displayAmount} completed successfully`
      case 'invoice.pending':
        return `Payment of ${displayAmount} is being processed...`
      case 'transaction.mempool':
        return `Payment is confirming on blockchain...`
      case 'transaction.confirmed':
        return `Payment confirmed, finalizing transaction...`
      case 'invoice.failedToPay':
      case 'swap.expired':
      case 'transaction.refunded':
      case 'transaction.failed':
        return `Payment failed: ${lightningStatus}`
      default:
        return `Processing payment...`
    }
  }

  // Determine the appropriate header text based on lightning status
  const getHeaderText = () => {
    if (isLightningPayment()) {
      if (isFailed()) {
        return 'Payment Failed'
      } else if (isSettled()) {
        return 'Success'
      } else if (isPending()) {
        return 'Processing Payment'
      }
    }
    return 'Success'
  }

  return (
    <>
      <Header text={getHeaderText()} />
      <Content>
        {isLightningPayment() ? (
          <>
            {isPending() ? (
              <Loading text={showingRetryNotice ? 'Connection error, trying again...' : getLightningStatusMessage()} />
            ) : isFailed() ? (
              <Error error text={getLightningStatusMessage()} />
            ) : isSettled() ? (
              <Success text={getLightningStatusMessage()} />
            ) : (
              // Default loading state for lightning payments until we get a status
              <Loading text='Waiting for payment status...' />
            )}
          </>
        ) : (
          // Regular on-chain payment success
          <Success text={`Payment of ${displayAmount} sent successfully`} />
        )}
      </Content>
    </>
  )
}
