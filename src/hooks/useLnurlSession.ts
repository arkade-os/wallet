import { useContext, useEffect, useMemo, useRef } from 'react'
import { LnurlContext } from '../providers/lnurl'
import { deriveLnurlCredentials } from '../lib/lnurl'

interface InvoiceRequest {
  amountMsat: number
  comment?: string
}

interface LnurlSession {
  lnurl: string
  active: boolean
  error: string | undefined
}

/**
 * Hook that manages an LNURL session via the app-level LnurlProvider.
 *
 * The SSE connection lives in the provider, so it survives component
 * unmount/remount (e.g. navigating away from the receive screen and back).
 * The session starts when `enabled` becomes true and persists until
 * `enabled` goes false or `stopSession` is called.
 *
 * When `walletAddress` is provided, session credentials are derived
 * deterministically so the same wallet always gets the same LNURL.
 */
export function useLnurlSession(
  enabled: boolean,
  onInvoiceRequest: (req: InvoiceRequest) => Promise<string>,
  walletAddress?: string,
): LnurlSession {
  const { lnurl, active, error, startSession, stopSession, updateHandler } = useContext(LnurlContext)
  const startedRef = useRef(false)

  const credentials = useMemo(
    () => (walletAddress ? deriveLnurlCredentials(walletAddress) : undefined),
    [walletAddress],
  )

  useEffect(() => {
    updateHandler(onInvoiceRequest)
  })

  useEffect(() => {
    if (enabled && !startedRef.current && !active) {
      startedRef.current = true
      startSession(onInvoiceRequest, credentials)
    } else if (!enabled && startedRef.current) {
      startedRef.current = false
      stopSession()
    }
  }, [enabled])

  return { lnurl, active, error }
}
