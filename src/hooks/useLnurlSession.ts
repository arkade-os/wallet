import { useCallback, useEffect, useRef, useState } from 'react'
import { lnurlServerUrl } from '../lib/constants'
import { consoleError } from '../lib/logs'

interface LnurlSession {
  /** LNURL bech32 string to display/share */
  lnurl: string
  /** Whether the SSE session is active */
  active: boolean
  /** Error message if session failed */
  error: string | undefined
}

interface InvoiceRequest {
  amountMsat: number
  comment?: string
}

/**
 * Hook that manages an LNURL session with the lnurl-server.
 *
 * Opens an SSE stream to receive invoice requests from payers.
 * When a payer requests an invoice, calls `onInvoiceRequest` so the wallet
 * can create a reverse swap and return the bolt11.
 *
 * The session (and LNURL) is active as long as the component is mounted.
 */
export function useLnurlSession(
  enabled: boolean,
  onInvoiceRequest: (req: InvoiceRequest) => Promise<string>,
): LnurlSession {
  const [lnurl, setLnurl] = useState('')
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const sessionIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const onInvoiceRequestRef = useRef(onInvoiceRequest)
  onInvoiceRequestRef.current = onInvoiceRequest

  const postInvoice = useCallback(async (sessionId: string, pr: string) => {
    try {
      await fetch(`${lnurlServerUrl}/lnurl/session/${sessionId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pr }),
      })
    } catch (err) {
      consoleError(err, 'Failed to post invoice to lnurl-server')
    }
  }, [])

  useEffect(() => {
    if (!enabled || !lnurlServerUrl) return

    const abort = new AbortController()
    abortRef.current = abort

    const connect = async () => {
      try {
        const response = await fetch(`${lnurlServerUrl}/lnurl/session`, {
          method: 'POST',
          signal: abort.signal,
        })

        if (!response.ok || !response.body) {
          setError('Failed to open LNURL session')
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (!abort.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() ?? ''

          let eventType = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ') && eventType) {
              const data = JSON.parse(line.slice(6))

              if (eventType === 'session_created') {
                sessionIdRef.current = data.sessionId
                setLnurl(data.lnurl)
                setActive(true)
                setError(undefined)
              } else if (eventType === 'invoice_request') {
                const req: InvoiceRequest = {
                  amountMsat: data.amountMsat,
                  comment: data.comment,
                }
                try {
                  const pr = await onInvoiceRequestRef.current(req)
                  if (sessionIdRef.current) {
                    await postInvoice(sessionIdRef.current, pr)
                  }
                } catch (err) {
                  consoleError(err, 'Failed to handle invoice request')
                }
              }

              eventType = ''
            }
          }
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          consoleError(err, 'LNURL session error')
          setError('LNURL session disconnected')
        }
      } finally {
        setActive(false)
        sessionIdRef.current = null
      }
    }

    connect()

    return () => {
      abort.abort()
      abortRef.current = null
    }
  }, [enabled, postInvoice])

  return { lnurl, active, error }
}
