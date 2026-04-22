import { ReactNode, createContext, useCallback, useRef, useState } from 'react'
import { lnurlServerUrl as rawLnurlServerUrl } from '../lib/constants'
import { consoleError } from '../lib/logs'

const lnurlServerBaseUrl = rawLnurlServerUrl?.replace(/\/+$/, '')

interface InvoiceRequest {
  amountMsat: number
  comment?: string
}

type InvoiceRequestHandler = (req: InvoiceRequest) => Promise<string>

interface LnurlContextProps {
  lnurl: string
  active: boolean
  error: string | undefined
  startSession: (onInvoiceRequest: InvoiceRequestHandler) => void
  stopSession: () => void
  updateHandler: (handler: InvoiceRequestHandler) => void
}

export const LnurlContext = createContext<LnurlContextProps>({
  lnurl: '',
  active: false,
  error: undefined,
  startSession: () => {},
  stopSession: () => {},
  updateHandler: () => {},
})

export const LnurlProvider = ({ children }: { children: ReactNode }) => {
  const [lnurl, setLnurl] = useState('')
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const sessionIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const handlerRef = useRef<InvoiceRequestHandler | null>(null)

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
    }),
    [],
  )

  const postInvoice = useCallback(
    async (sessionId: string, pr: string, signal?: AbortSignal) => {
      const response = await fetch(`${lnurlServerBaseUrl}/lnurl/session/${sessionId}/invoice`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ pr }),
        signal,
      })
      if (!response.ok) {
        throw new Error(`Failed to post invoice: ${response.status}`)
      }
    },
    [authHeaders],
  )

  const postError = useCallback(
    async (sessionId: string, reason: string, signal?: AbortSignal) => {
      try {
        const response = await fetch(`${lnurlServerBaseUrl}/lnurl/session/${sessionId}/invoice`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ error: reason }),
          signal,
        })
        if (!response.ok) {
          consoleError(
            `Failed to post error to lnurl-server: ${response.status} ${await response.text().catch(() => '')}`,
          )
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          consoleError(err, 'Failed to post error to lnurl-server')
        }
      }
    },
    [authHeaders],
  )

  const stopSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setActive(false)
    setLnurl('')
    setError(undefined)
    sessionIdRef.current = null
    tokenRef.current = null
  }, [])

  const startSession = useCallback(
    (onInvoiceRequest: InvoiceRequestHandler) => {
      if (!lnurlServerBaseUrl) return

      stopSession()

      handlerRef.current = onInvoiceRequest
      const abort = new AbortController()
      abortRef.current = abort

      const connect = async () => {
        try {
          const response = await fetch(`${lnurlServerBaseUrl}/lnurl/session`, {
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
          let eventType = ''

          while (!abort.signal.aborted) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim()
              } else if (line.startsWith('data: ') && eventType) {
                let data: Record<string, unknown>
                try {
                  data = JSON.parse(line.slice(6))
                } catch {
                  consoleError('Failed to parse SSE data:', line)
                  eventType = ''
                  continue
                }

                if (eventType === 'session_created') {
                  sessionIdRef.current = data.sessionId as string
                  tokenRef.current = data.token as string
                  setLnurl(data.lnurl as string)
                  setActive(true)
                  setError(undefined)
                } else if (eventType === 'invoice_request') {
                  const sessionId = sessionIdRef.current
                  if (!sessionId) break

                  const amountMsat = Number(data.amountMsat)
                  if (!amountMsat || amountMsat <= 0) {
                    consoleError('Invalid amountMsat in invoice request:', String(data.amountMsat))
                    await postError(sessionId, 'Invalid amount', abort.signal)
                    eventType = ''
                    continue
                  }
                  try {
                    const handler = handlerRef.current
                    if (!handler) throw new Error('No invoice request handler registered')
                    const pr = await handler({ amountMsat, comment: data.comment as string | undefined })
                    await postInvoice(sessionId, pr, abort.signal)
                  } catch (err) {
                    const reason = err instanceof Error ? err.message : 'Failed to create invoice'
                    consoleError(err, 'Failed to handle invoice request')
                    await postError(sessionId, reason, abort.signal)
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
          if (abortRef.current === abort) {
            setActive(false)
            setLnurl('')
            sessionIdRef.current = null
            tokenRef.current = null
          }
        }
      }

      connect()
    },
    [stopSession, postInvoice, postError],
  )

  const updateHandler = useCallback((handler: InvoiceRequestHandler) => {
    handlerRef.current = handler
  }, [])

  return (
    <LnurlContext.Provider value={{ lnurl, active, error, startSession, stopSession, updateHandler }}>
      {children}
    </LnurlContext.Provider>
  )
}
