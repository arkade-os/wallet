import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { NetworkName } from '@arkade-os/sdk'
import type { OpenRfqOffer, Quote } from '@arkade-os/swap'
import { extractError } from '../../../lib/error'
import {
  assertAssetPaymentQuote,
  assertOpenPaymentQuote,
  paymentQuoteExpiry,
  type PaymentQuoteRequest,
} from '../../../lib/paymentQuotes'
import { SwapsContext } from '../../../providers/swaps'

export type ReviewedQuote = { quote: Quote; offer?: OpenRfqOffer; solverId?: string }

export default function usePaymentQuoteReview(
  request: PaymentQuoteRequest | undefined,
  network: NetworkName,
  quoteInitially = true,
) {
  const { quotePaymentRoute, paymentRouteCandidates } = useContext(SwapsContext)
  const api = useRef({ quotePaymentRoute, paymentRouteCandidates })
  api.current = { quotePaymentRoute, paymentRouteCandidates }
  const generation = useRef(0)
  const previous = useRef<Quote>()
  const [reviewed, setReviewed] = useState<ReviewedQuote>()
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(Boolean(request && quoteInitially))
  const [quoteError, setQuoteError] = useState('')
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
      setLoading(true)
      setQuoteError('')
      setReviewed(undefined)
      try {
        const quote = await api.current.quotePaymentRoute(request, solverId)
        if (started !== generation.current) return
        validate(quote)
        publish({ quote, solverId })
      } catch (error) {
        if (started === generation.current) setQuoteError(extractError(error))
      } finally {
        if (started === generation.current) setLoading(false)
      }
    },
    [request, validate, publish],
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
    if (quoteInitially) void load()
    return () => {
      active = false
      generation.current += 1
    }
  }, [request, load, quoteInitially])

  const chooseOpenQuote = (quote: Quote, offer: OpenRfqOffer) => {
    validate(quote)
    generation.current += 1
    setLoading(false)
    setQuoteError('')
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

  return { reviewed, candidates, loading, quoteError, expired, termsChanged, load, validate, chooseOpenQuote }
}
