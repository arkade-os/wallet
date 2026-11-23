import { useContext, useEffect, useRef, useState } from 'react'
import { extractError } from '../../../lib/error'
import { paymentQuoteExpiry } from '../../../lib/paymentQuotes'
import type { SwapRouteProgress } from '../../../lib/swapRouteExecution'
import type { SwapRoutePlan, SwapRouteRequest } from '../../../lib/swapRoutePlan'
import { useTranslation } from '../../../providers/language'
import { SwapsContext } from '../../../providers/swaps'

type Operation = 'quote' | 'start' | 'advance' | 'resume'
type Review = { scope: string; inputKey?: string; id?: string; plan?: SwapRoutePlan; progress?: SwapRouteProgress }

const pointerKey = (scope: string) => `active-swap-route:${scope}`
const funding = (kind: Operation | undefined) => kind === 'start' || kind === 'advance'

export function canAdvanceRoute(plan: SwapRoutePlan, progress: SwapRouteProgress): boolean {
  const next = plan.quotes[progress.step]
  if (progress.phase !== 'ready' || !next) return false
  const deadline = progress.step === 0 ? plan.expiresAt : paymentQuoteExpiry(next)
  return deadline * 1_000 > Date.now()
}

export default function useSwapRouteReview(scope: string | undefined, inputKey: string) {
  const { t } = useTranslation()
  const { quoteSwapRoute, startSwapRoute, advanceSwapRoute, getSwapRoute } = useContext(SwapsContext)
  const api = useRef({ quoteSwapRoute, startSwapRoute, advanceSwapRoute, getSwapRoute })
  api.current = { quoteSwapRoute, startSwapRoute, advanceSwapRoute, getSwapRoute }
  const supported =
    Boolean(scope) && typeof quoteSwapRoute === 'function' && typeof navigator.locks?.request === 'function'
  const [saved, setSaved] = useState<{ scope: string; id: string }>()
  const [review, setReview] = useState<Review>()
  const [operation, setOperation] = useState<Operation>()
  const [error, setError] = useState('')
  const [statusUnavailable, setStatusUnavailable] = useState(false)
  const [routeMissing, setRouteMissing] = useState(false)
  const [revision, setRevision] = useState(0)
  const generation = useRef(0)
  const inFlight = useRef<{ kind: Operation; started: number }>()
  const autoAdvance = useRef<string>()
  const current = useRef<{ scope?: string; inputKey: string }>({ scope, inputKey })
  current.current = { scope, inputKey }

  const activeId = saved?.scope === scope ? saved?.id : undefined
  const shown = review?.scope === scope && (!review?.inputKey || review.inputKey === inputKey) ? review : undefined
  const routeId = shown?.id
  const progress = shown?.progress

  useEffect(() => {
    if (!scope) return
    const read = () => {
      try {
        const id = localStorage.getItem(pointerKey(scope))
        setSaved(id ? { scope, id } : undefined)
      } catch {
        setSaved(undefined)
      }
    }
    read()
    const storageChanged = (event: StorageEvent) => {
      if (event.key === pointerKey(scope) || event.key === null) read()
    }
    window.addEventListener('storage', storageChanged)
    return () => window.removeEventListener('storage', storageChanged)
  }, [scope])

  useEffect(
    () => () => {
      generation.current += 1
      autoAdvance.current = undefined
    },
    [],
  )

  const clearPointer = (id: string) => {
    if (!scope || activeId !== id) return
    try {
      if (localStorage.getItem(pointerKey(scope)) === id) localStorage.removeItem(pointerKey(scope))
      setSaved((previous) => (previous?.id === id ? undefined : previous))
    } catch {
      return
    }
  }

  const close = () => {
    if (funding(inFlight.current?.kind)) return
    autoAdvance.current = undefined
    generation.current += 1
    inFlight.current = undefined
    setOperation(undefined)
    setReview(undefined)
    setError('')
    setStatusUnavailable(false)
    setRouteMissing(false)
  }

  const checkCurrent = (started: number, next: Review) =>
    generation.current === started &&
    current.current.scope === next.scope &&
    (!next.inputKey || current.current.inputKey === next.inputKey)

  const run = async (kind: Operation, next: Review, perform: (started: number) => Promise<void>) => {
    if (inFlight.current) return
    const started = ++generation.current
    inFlight.current = { kind, started }
    setOperation(kind)
    setReview(next)
    setError('')
    setStatusUnavailable(false)
    setRouteMissing(false)
    try {
      await perform(started)
    } catch (failure) {
      if (checkCurrent(started, next)) {
        autoAdvance.current = undefined
        setError(extractError(failure))
      }
    } finally {
      if (inFlight.current?.started === started) inFlight.current = undefined
      if (generation.current === started) {
        setOperation(undefined)
        setRevision((previous) => previous + 1)
      }
    }
  }

  const quote = (request: SwapRouteRequest) => {
    if (!supported || !scope || activeId) return
    const next = { scope, inputKey }
    void run('quote', next, async (started) => {
      const plan = await api.current.quoteSwapRoute(request)
      if (checkCurrent(started, next)) setReview({ ...next, plan })
    })
  }

  const resume = () => {
    if (!scope || !activeId || typeof getSwapRoute !== 'function') return
    const next = { scope, id: activeId }
    void run('resume', next, async (started) => {
      const status = await api.current.getSwapRoute(activeId)
      if (!checkCurrent(started, next)) return
      if (status) setReview({ ...next, ...status })
      else {
        setStatusUnavailable(true)
        setRouteMissing(true)
      }
    })
  }

  const start = () => {
    const plan = shown?.plan
    if (!supported || !scope || activeId || !plan || routeId || plan.expiresAt * 1_000 <= Date.now()) return
    const next = { scope, id: plan.id, plan }
    void run('start', next, async (started) => {
      await navigator.locks.request(pointerKey(scope), { ifAvailable: true }, async (lock) => {
        if (!lock || localStorage.getItem(pointerKey(scope))) {
          throw new Error(t('swap.routeActiveElsewhere'))
        }
        localStorage.setItem(pointerKey(scope), plan.id)
        setSaved({ scope, id: plan.id })
        autoAdvance.current = plan.id
        const progress = await api.current.startSwapRoute(plan.id)
        if (checkCurrent(started, next)) setReview({ ...next, progress })
      })
    })
  }

  const advance = useRef<() => void>()
  advance.current = () => {
    if (!routeId || !shown?.plan || !progress || !canAdvanceRoute(shown.plan, progress)) return
    void run('advance', shown, async (started) => {
      const progress = await api.current.advanceSwapRoute(routeId)
      if (checkCurrent(started, shown)) setReview({ ...shown, progress })
    })
  }

  const poll = Boolean(shown && routeId && (!progress || progress.phase === 'waiting') && !operation)
  useEffect(() => {
    if (!scope || !routeId || !poll) return
    const started = generation.current
    let active = true
    let timer: number
    const read = async () => {
      try {
        const status = await api.current.getSwapRoute(routeId)
        if (active && started === generation.current) {
          if (status) setReview({ scope, id: routeId, ...status })
          setStatusUnavailable(!status)
          setRouteMissing(!status)
        }
      } catch {
        if (active && started === generation.current) setStatusUnavailable(true)
      }
      if (active && started === generation.current) timer = window.setTimeout(read, 1_500)
    }
    void read()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [scope, routeId, poll, revision])

  useEffect(() => {
    if (!routeId || !shown?.plan || !progress || operation || autoAdvance.current !== routeId) return
    if (progress.phase === 'stopped' || progress.phase === 'complete') autoAdvance.current = undefined
    if (canAdvanceRoute(shown.plan, progress)) advance.current?.()
  }, [routeId, shown?.plan, progress, operation])

  return {
    supported,
    activeId,
    shown,
    operation,
    funding: funding(operation),
    error,
    statusUnavailable,
    quote,
    resume,
    start,
    advance: () => advance.current?.(),
    close,
    discardable: routeMissing || progress?.phase === 'stopped' || progress?.phase === 'complete',
    dismiss: () => {
      if (routeId && scope) {
        void navigator.locks
          .request(pointerKey(scope), { ifAvailable: true }, async (lock) => {
            if (!lock) return
            if (progress?.phase === 'complete' || progress?.phase === 'stopped') {
              clearPointer(routeId)
              return
            }
            const status = await api.current.getSwapRoute(routeId)
            if (!status || status.progress.phase === 'stopped' || status.progress.phase === 'complete')
              clearPointer(routeId)
          })
          .catch(() => undefined)
      }
      close()
    },
  }
}
