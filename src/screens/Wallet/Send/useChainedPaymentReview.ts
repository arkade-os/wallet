import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Quote, Swap } from '@arkade-os/swap'
import type { ChainedPaymentStatus } from '../../../lib/chainedPayments'
import { extractError } from '../../../lib/error'
import { paymentQuoteExpiry, type LightningPaymentRequest } from '../../../lib/paymentQuotes'
import { SwapsContext } from '../../../providers/swaps'

type Scope = { request: LightningPaymentRequest; walletKey: string }
type Approved = { scope: Scope; quote: Quote }
type QuoteState = {
  scope: Scope
  lightningId: string
  assetId: string
  quote?: Quote
  failed?: boolean
  lightningUnavailable?: boolean
}

const live = (quote: Quote) => paymentQuoteExpiry(quote) * 1000 > Date.now()
const quoteUnavailable = (error: unknown) => error instanceof Error && error.name === 'QuoteUnavailable'

export default function useChainedPaymentReview(
  request: LightningPaymentRequest | undefined,
  walletKey: string,
  lightning: Quote | undefined,
  onFunded: (swap: Swap, quote: Quote) => void,
  onFundingError: (error: unknown) => void,
) {
  const { getChainedPayment, quoteChainedPayment, startChainedPayment, finishChainedPayment } = useContext(SwapsContext)
  const api = useRef({ getChainedPayment, quoteChainedPayment, startChainedPayment, finishChainedPayment })
  api.current = { getChainedPayment, quoteChainedPayment, startChainedPayment, finishChainedPayment }
  const callbacks = useRef({ onFunded, onFundingError })
  callbacks.current = { onFunded, onFundingError }

  const scope = useMemo(() => request && { request, walletKey }, [request, walletKey])
  const current = useRef(scope)
  const mounted = useRef(false)
  current.current = scope
  const [picker, setPicker] = useState<{ scope: Scope; assetId?: string; retry?: number }>()
  const [quoted, setQuoted] = useState<QuoteState>()
  const [snapshot, setSnapshot] = useState<{ scope: Scope; status?: ChainedPaymentStatus; failed?: boolean }>()
  const [running, setRunning] = useState<Scope>()
  const inFlight = useRef<Scope>()
  const [approved, setApproved] = useState<Approved>()
  const [startFailureState, setStartFailureState] = useState<{
    scope: Scope
    message?: string
    lightningUnavailable: boolean
  }>()
  const startFailure = startFailureState?.scope === scope ? startFailureState : undefined
  const [expiredQuoteId, setExpiredQuoteId] = useState<string>()

  const selection = picker?.scope === scope ? picker : undefined
  const status = snapshot?.scope === scope ? snapshot?.status : undefined
  const enabled = Boolean(scope && typeof getChainedPayment === 'function')
  const checking = enabled && snapshot?.scope !== scope
  const blocking = status?.phase === 'converting' || status?.phase === 'recovery'
  const canPick = enabled && !checking && !snapshot?.failed && !status && typeof navigator.locks?.request === 'function'
  const selectedId = selection?.assetId
  const result =
    quoted?.scope === scope && quoted?.assetId === selectedId && quoted?.lightningId === lightning?.id
      ? quoted
      : undefined
  const conversion = result?.quote
  const busy = Boolean(scope && running === scope)
  const awaitingFill = Boolean(scope && approved?.scope === scope)
  const [pollVersion, setPollVersion] = useState(0)

  useEffect(() => {
    if (!scope || !enabled) return
    let active = true
    let timer: number
    const poll = async () => {
      let pollAgain = awaitingFill
      try {
        const status = await api.current.getChainedPayment(scope.request)
        if (active) setSnapshot({ scope, status })
        pollAgain ||= status?.phase === 'converting' || status?.phase === 'recovery'
      } catch {
        pollAgain = true
        if (active)
          setSnapshot((previous) => ({
            scope,
            status: previous?.scope === scope ? previous.status : undefined,
            failed: true,
          }))
      }
      if (active && pollAgain) timer = window.setTimeout(poll, 1_500)
    }
    void poll()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [scope, enabled, pollVersion, awaitingFill])

  useEffect(() => {
    if (!scope || !selectedId || !lightning || !live(lightning) || !canPick || startFailure) return
    let active = true
    const state = { scope, lightningId: lightning.id, assetId: selectedId }
    setQuoted(undefined)
    void api.current.quoteChainedPayment(selectedId, lightning, scope.request).then(
      (quote) => {
        if (active) setQuoted({ ...state, quote })
      },
      (error) => {
        if (active) setQuoted({ ...state, failed: true, lightningUnavailable: quoteUnavailable(error) })
      },
    )
    return () => {
      active = false
    }
  }, [scope, selectedId, lightning, selection?.retry, canPick, startFailure])

  const expiry = lightning && conversion && Math.min(paymentQuoteExpiry(lightning), paymentQuoteExpiry(conversion))
  useEffect(() => {
    if (!expiry || !conversion) return
    const timer = window.setTimeout(() => setExpiredQuoteId(conversion.id), Math.max(0, expiry * 1000 - Date.now()))
    return () => window.clearTimeout(timer)
  }, [conversion, expiry])

  useEffect(() => {
    if (!scope || approved?.scope !== scope) return
    if (
      lightning?.id !== approved.quote.id ||
      !live(approved.quote) ||
      status?.phase === 'returned' ||
      status?.phase === 'recovery'
    ) {
      setApproved(undefined)
      return
    }
    if (status?.phase !== 'credited' || status.spendable !== true || inFlight.current) return
    inFlight.current = scope
    setApproved(undefined)
    setRunning(scope)
    void api.current
      .finishChainedPayment(approved.quote, scope.request)
      .then((swap) => {
        if (mounted.current && current.current === scope) callbacks.current.onFunded(swap, approved.quote)
      })
      .catch((error) => {
        if (mounted.current && current.current === scope) callbacks.current.onFundingError(error)
      })
      .finally(() => {
        inFlight.current = undefined
        if (mounted.current && current.current === scope) setRunning(undefined)
      })
  }, [approved, lightning, scope, status])

  useEffect(() => {
    if (!approved) return
    const timer = window.setTimeout(
      () => setApproved((previous) => (previous === approved ? undefined : previous)),
      Math.max(0, paymentQuoteExpiry(approved.quote) * 1_000 - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [approved])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const begin = async () => {
    if (!scope || !selectedId || !conversion || !lightning || !canPick || inFlight.current) return
    if (!live(conversion) || !live(lightning)) return
    inFlight.current = scope
    setRunning(scope)
    setStartFailureState(undefined)
    try {
      await api.current.startChainedPayment(selectedId, conversion, lightning, scope.request)
      if (mounted.current && current.current === scope) {
        if (live(lightning)) setApproved({ scope, quote: lightning })
        setPicker(undefined)
      }
    } catch (error) {
      if (mounted.current && current.current === scope) {
        const message = error instanceof Error && error.name === 'PaymentNotSubmitted' ? extractError(error) : undefined
        setStartFailureState({ scope, message, lightningUnavailable: quoteUnavailable(error) })
      }
    } finally {
      inFlight.current = undefined
      if (mounted.current && current.current === scope) {
        setRunning(undefined)
        setSnapshot(undefined)
        setPollVersion((version) => version + 1)
      }
    }
  }

  return {
    begin,
    busy,
    awaitingFill,
    blocking,
    checking,
    canPick,
    status,
    choosing: Boolean(selection),
    selectedId,
    conversion,
    quoteFailed: result?.failed,
    startFailure,
    lightningUnavailable: Boolean(result?.lightningUnavailable || startFailure?.lightningUnavailable),
    expired: Boolean(
      conversion && (conversion.id === expiredQuoteId || !live(conversion) || !lightning || !live(lightning)),
    ),
    select: (assetId?: string) => {
      if (!scope) return
      if (selection && selectedId === assetId && !result?.failed) return
      setQuoted(undefined)
      setPicker({ scope, assetId })
      setStartFailureState(undefined)
    },
    close: () => setPicker(undefined),
    retry: () => {
      setQuoted(undefined)
      setStartFailureState(undefined)
      setPicker((previous) => previous && { ...previous, retry: (previous.retry ?? 0) + 1 })
    },
  }
}
