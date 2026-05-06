import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { lnurlServerUrl as rawLnurlServerUrl } from '../lib/constants'
import { consoleError } from '../lib/logs'
import { deriveLnurlCredentials, type LnurlSessionCredentials } from '../lib/lnurl'
import { WalletContext } from './wallet'
import { SwapsContext } from './swaps'
import { NotificationsContext } from './notifications'

const lnurlServerBaseUrl = rawLnurlServerUrl?.replace(/\/+$/, '')

interface LnurlContextProps {
  lnurl: string
  active: boolean
  error: string | undefined
}

export const LnurlContext = createContext<LnurlContextProps>({
  lnurl: '',
  active: false,
  error: undefined,
})

export const LnurlProvider = ({ children }: { children: ReactNode }) => {
  const { svcWallet } = useContext(WalletContext)
  const { arkadeSwaps, connected, swapsInitError, createReverseSwap } = useContext(SwapsContext)
  const { notifyPaymentReceived } = useContext(NotificationsContext)

  const [lnurl, setLnurl] = useState('')
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const sessionIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const swapsRef = useRef(arkadeSwaps)
  const createReverseSwapRef = useRef(createReverseSwap)
  const notifyRef = useRef(notifyPaymentReceived)
  useEffect(() => {
    swapsRef.current = arkadeSwaps
  }, [arkadeSwaps])
  useEffect(() => {
    createReverseSwapRef.current = createReverseSwap
  }, [createReverseSwap])
  useEffect(() => {
    notifyRef.current = notifyPaymentReceived
  }, [notifyPaymentReceived])

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

  const handleInvoiceRequest = useCallback(async (amountMsat: number) => {
    const sats = Math.floor(amountMsat / 1000)
    const pendingSwap = await createReverseSwapRef.current(sats)
    if (!pendingSwap) throw new Error('Failed to create reverse swap')
    const swaps = swapsRef.current
    if (swaps) {
      swaps
        .waitAndClaim(pendingSwap)
        .then(() => notifyRef.current(pendingSwap.response.onchainAmount ?? 0))
        .catch((err) => consoleError(err, 'Error claiming LNURL reverse swap'))
    }
    return pendingSwap.response.invoice
  }, [])

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
    (credentials?: LnurlSessionCredentials) => {
      if (!lnurlServerBaseUrl) return

      stopSession()

      const abort = new AbortController()
      abortRef.current = abort

      const connect = async () => {
        try {
          const fetchOptions: RequestInit = {
            method: 'POST',
            signal: abort.signal,
          }
          if (credentials) {
            fetchOptions.headers = { 'Content-Type': 'application/json' }
            fetchOptions.body = JSON.stringify({ token: credentials.token })
          }

          const response = await fetch(`${lnurlServerBaseUrl}/lnurl/session`, fetchOptions)

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
                    const pr = await handleInvoiceRequest(amountMsat)
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
    [stopSession, postInvoice, postError, handleInvoiceRequest],
  )

  const privateKeyHex = (svcWallet?.identity as { toHex?: () => string } | undefined)?.toHex?.()
  const credentials = useMemo(
    () => (privateKeyHex ? deriveLnurlCredentials(privateKeyHex) : undefined),
    [privateKeyHex],
  )

  useEffect(() => {
    const ready = !!lnurlServerBaseUrl && !!credentials && connected && !!arkadeSwaps && !swapsInitError

    if (ready) {
      startSession(credentials)
    } else if (abortRef.current) {
      stopSession()
    }

    return () => stopSession()
  }, [credentials, connected, !!arkadeSwaps, swapsInitError])

  return <LnurlContext.Provider value={{ lnurl, active, error }}>{children}</LnurlContext.Provider>
}
