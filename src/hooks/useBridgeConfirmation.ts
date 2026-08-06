import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConfirmationRequest } from '../lib/appRequest'

/**
 * Gate for actions an embedded app asks the wallet to perform. At most one
 * request is live at a time, and it never outlives the screen that opened it.
 */
export function useBridgeConfirmation() {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null)
  const pending = useRef<((approved: boolean) => void) | null>(null)

  const settle = useCallback((approved: boolean) => {
    const resolve = pending.current
    pending.current = null
    setRequest(null)
    resolve?.(approved)
  }, [])

  const requestConfirmation = useCallback((next: ConfirmationRequest): Promise<boolean> => {
    if (pending.current) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      pending.current = resolve
      setRequest(next)
    })
  }, [])

  useEffect(
    () => () => {
      const resolve = pending.current
      pending.current = null
      resolve?.(false)
    },
    [],
  )

  const approve = useCallback(() => settle(true), [settle])
  const reject = useCallback(() => settle(false), [settle])

  return { approve, reject, request, requestConfirmation }
}
