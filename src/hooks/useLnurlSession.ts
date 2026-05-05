import { useContext, useEffect, useRef, useState } from 'react'
import { LnurlContext } from '../providers/lnurl'
import { deriveLnurlCredentials, LnurlSessionCredentials } from '../lib/lnurl'
import type { Identity } from '@arkade-os/sdk'

interface InvoiceRequest {
  amountMsat: number
  comment?: string
}

interface LnurlSession {
  lnurl: string
  active: boolean
  error: string | undefined
}

export function useLnurlSession(
  enabled: boolean,
  onInvoiceRequest: (req: InvoiceRequest) => Promise<string>,
  identity?: Identity,
): LnurlSession {
  const { lnurl, active, error, startSession, stopSession, updateHandler } = useContext(LnurlContext)
  const startedRef = useRef(false)
  const [credentials, setCredentials] = useState<LnurlSessionCredentials | undefined>()

  useEffect(() => {
    if (!identity) {
      setCredentials(undefined)
      return
    }
    deriveLnurlCredentials(identity).then(setCredentials)
  }, [identity])

  useEffect(() => {
    updateHandler(onInvoiceRequest)
  })

  useEffect(() => {
    if (enabled && !startedRef.current && !active && (credentials || !identity)) {
      startedRef.current = true
      startSession(onInvoiceRequest, credentials)
    } else if (!enabled && startedRef.current) {
      startedRef.current = false
      stopSession()
    }
  }, [enabled, credentials])

  return { lnurl, active, error }
}
