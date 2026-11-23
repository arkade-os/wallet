import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { NetworkName } from '@arkade-os/sdk'
import type { OpenRfqOffer, Quote } from '@arkade-os/swap'
import {
  assertAssetPaymentQuote,
  assertOpenPaymentQuote,
  paymentQuoteExpiry,
  type PaymentQuoteRequest,
} from '../../../lib/paymentQuotes'
import { SwapsContext } from '../../../providers/swaps'

export type ReviewedQuote = { quote: Quote; offer?: OpenRfqOffer; solverId?: string }

type QuoteReviewError = 'expired' | 'unverified' | 'unavailable'

function classifyQuoteError(error: unknown, quote?: Quote): QuoteReviewError {
  const name = error instanceof Error ? error.name : undefined
  if (name === 'QuoteExpired' || (quote && paymentQuoteExpiry(quote) * 1000 <= Date.now())) return 'expired'
  if (quote || name === 'QuoteVerificationFailed') return 'unverified'
  return 'unavailable'
}

export default function usePaymentQuoteReview(request: PaymentQuoteRequest | undefined, network: NetworkName) {
  const { quotePaymentRoute, paymentRouteCandidates } = useContext(SwapsContext)
  const api = useRef({ quotePaymentRoute, paymentRouteCandidates })
  api.current = { quotePaymentRoute, paymentRouteCandidates }
  const scope = useMemo(() => ({ request, network }), [request, network])
  const currentScope = useRef(scope)
  currentScope.current = scope
  const [reviewScope, setReviewScope] = useState(scope)
  const generation = useRef(0)
  const previous = useRef<Quote>()
  const [reviewed, setReviewed] = useState<ReviewedQuote>()
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(Boolean(request))
  const [quoteError, setQuoteError] = useState<QuoteReviewError>()
  const [termsChanged, setTermsChanged] = useState(false)

  const publish = useCallback((next: ReviewedQuote) => {
    const prior = previous.current
    previous.current = next.quote
    setTermsChanged(
      Boolean(
        prior &&
          (prior.give.amount !== next.quote.give.amount ||
            prior.take.amount !== next.quote.take.amount ||
            prior.fee.amount !== next.quote.fee.amount ||
            prior.solver !== next.quote.solver),
      ),
    )
    setReviewed(next)
  }, [])

  const validate = useCallback(
    (quote: Quote) => {
      if (!request) throw new Error('Missing payment request')
      if (request.kind === 'asset') assertAssetPaymentQuote(quote, request, network)
      else assertOpenPaymentQuote(quote, request, network)
    },
    [request, network],
  )

  const load = useCallback(
    async (solverId?: string) => {
      if (!request) return
      const started = ++generation.current
      const isCurrent = () => started === generation.current && currentScope.current === scope
      setReviewScope(scope)
      setLoading(true)
      setQuoteError(undefined)
      setReviewed(undefined)
      let quote: Quote | undefined
      try {
        quote = await api.current.quotePaymentRoute(request, solverId)
        if (!isCurrent()) return
        validate(quote)
        publish({ quote, solverId })
      } catch (error) {
        if (isCurrent()) setQuoteError(classifyQuoteError(error, quote))
      } finally {
        if (isCurrent()) setLoading(false)
      }
    },
    [request, scope, validate, publish],
  )

  useEffect(() => {
    if (!request) return
    let active = true
    previous.current = undefined
    setCandidates([])
    void api.current
      .paymentRouteCandidates(request)
      .then((routes) => {
        if (active) setCandidates(routes)
      })
      .catch(() => undefined)
    void load()
    return () => {
      active = false
      generation.current += 1
    }
  }, [request, load])

  const chooseOpenQuote = (quote: Quote, offer: OpenRfqOffer) => {
    validate(quote)
    generation.current += 1
    setReviewScope(scope)
    setLoading(false)
    setQuoteError(undefined)
    publish({ quote, offer })
  }

  const expiresAt = reviewed ? paymentQuoteExpiry(reviewed.quote) : undefined
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    setExpired(false)
    if (!expiresAt) return
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, expiresAt * 1000 - Date.now()))
    return () => window.clearTimeout(timer)
  }, [reviewed, expiresAt])

  const sameScope = reviewScope === scope
  return {
    reviewed: sameScope ? reviewed : undefined,
    candidates: sameScope ? candidates : [],
    loading: Boolean(request) && (!sameScope || loading),
    quoteError: sameScope ? quoteError : undefined,
    expired: sameScope && expired,
    termsChanged: sameScope && termsChanged,
    load,
    validate,
    chooseOpenQuote,
  }
}
