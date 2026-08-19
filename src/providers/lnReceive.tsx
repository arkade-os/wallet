import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { RestArkProvider } from '@arkade-os/sdk'
import { RfqSwapManager, swapSecretsToRecord, type RfqSwapState } from '@arkade-os/swap'
import { hex } from '@scure/base'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { claimReceive, toReceiveSwap, type LnReceiveRequest, type ReceiveClaimRecord } from '../lib/lnReceive'
import { Indexer } from '../lib/indexer'
import { consoleError } from '../lib/logs'
import { extractError } from '../lib/error'

/**
 * Drives every negotiated Lightning receive to its end, for as long as the
 * wallet is open.
 *
 * The claim used to live in the receive screen's effect, which meant a payment
 * was lost the moment the user navigated away — and lost for good on the first
 * throw, since nothing re-armed it. `RfqSwapManager` re-runs the whole decision
 * every pass, so a provider that owns one turns "stay on this screen" into
 * "keep the tab open". A reload still loses the swap: nothing here is
 * persisted, which is Stage 2's job (arkade-os/ts-sdk#746).
 *
 * It runs page-side rather than in the service worker on the precedent of
 * `watchOfferSwaps` in `AssetSwapsProvider`: the worker hosts `MessageBus` and
 * the wallet reaches this side as a `ServiceWorkerWallet` proxy, so moving the
 * manager in would mean standing a second wallet up inside it.
 */
interface LnReceiveContextProps {
  /** Begin monitoring a negotiated receive. Idempotent per `rfqId`. */
  track: (request: LnReceiveRequest) => Promise<void>
  /** Where this receive stands, or undefined when it is not monitored. */
  status: (rfqId: string) => RfqSwapState | undefined
  /** The last error reported for this receive, cleared when it ends. */
  error: (rfqId: string) => string | undefined
}

export const LnReceiveContext = createContext<LnReceiveContextProps>({
  track: async () => {},
  status: () => undefined,
  error: () => undefined,
})

/**
 * What a claim needs and `RfqSwapCommon` does not carry: the payout address the
 * claimed sats land at, and the secrets projection `P` is recovered from.
 *
 * Session-scoped and in memory only — a `useRef`, since nothing renders from
 * it — which is precisely the Stage 1 limitation: another tab cannot see these,
 * and a reload drops them. Stage 2 replaces the map with the persisted record's
 * corridor profile.
 */
interface TrackedReceive {
  payoutAddress: string
  record: ReceiveClaimRecord
}

export const LnReceiveProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet, reloadWallet } = useContext(WalletContext)

  const [states, setStates] = useState<Map<string, RfqSwapState>>(new Map())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  const tracked = useRef<Map<string, TrackedReceive>>(new Map())
  // Set synchronously by the effect below so `track` can await a manager that
  // is still being constructed, rather than dropping the swap it was handed.
  const manager = useRef<Promise<RfqSwapManager>>()

  const setState = useCallback((rfqId: string, state: RfqSwapState) => {
    setStates((prev) => new Map(prev).set(rfqId, state))
  }, [])

  useEffect(() => {
    if (!svcWallet || !aspInfo.url) return
    let stopped = false

    const started = (async () => {
      const rfqManager = new RfqSwapManager(
        {
          indexer: new Indexer(aspInfo).provider,
          // Optional to the manager, but it is what registers the lockup in the
          // wallet's contract set and turns the indexer's funding and spend
          // sightings into pushed events instead of poll-interval latency.
          contracts: await svcWallet.getContractManager(),
        },
        {
          pollIntervalMs: 5000,
          events: {
            onSwapUpdate: (swap) => setState(swap.rfqId, swap.state),
            onSwapCompleted: (swap) => {
              setState(swap.rfqId, swap.state)
              // `settled` and `refunded` are both terminal, and on this leg they
              // are opposites: the first is our own claim landing, the second is
              // the solver taking back a lockup we failed to claim — a LOSS, not
              // a neutral end. The screen reads `status` to tell them apart.
              setErrors((prev) => {
                if (!prev.has(swap.rfqId)) return prev
                const next = new Map(prev)
                next.delete(swap.rfqId)
                return next
              })
              tracked.current.delete(swap.rfqId)
              // The claim lands through this page's own `RestArkProvider`, so
              // the service worker never emits the VTXO_UPDATE the wallet's
              // balance listener waits for. Nothing else would refresh it.
              reloadWallet().catch(consoleError)
            },
            onSwapFailed: (swap, err) => {
              const error = extractError(err)
              consoleError(error, `lightning receive ${swap.rfqId} failed`)
              setErrors((prev) => new Map(prev).set(swap.rfqId, error))
              // Fired for every throwing action, including ones the next pass
              // will retry — so only a swap the manager has given up on may
              // drop its claim secrets.
              if (swap.state === 'failed') {
                setState(swap.rfqId, swap.state)
                tracked.current.delete(swap.rfqId)
              }
            },
          },
        },
      )

      rfqManager.setCallbacks({
        claimLockup: async (swap, vtxos, { partiallyClaimed }) => {
          const entry = tracked.current.get(swap.rfqId)
          if (!entry) throw new Error(`no claim secrets held for receive ${swap.rfqId}`)
          const lockup = swap.lockup
          if (!lockup) throw new Error(`receive ${swap.rfqId} carries no covenant to claim`)
          return claimReceive({
            wallet: svcWallet,
            ark: new RestArkProvider(aspInfo.url),
            swap: { ...swap, lockup },
            payoutAddress: entry.payoutAddress,
            record: entry.record,
            vtxos,
            partiallyClaimed,
          })
        },
        // Required by the interface, unreachable for this corridor. Throwing
        // stubs rather than no-ops: a silent one would turn "we monitored the
        // wrong kind of swap" into a swap that quietly does nothing.
        claimOnchain: async () => {
          throw new Error('onchain-send swaps are not monitored here')
        },
        refundArkade: async () => {
          throw new Error('a receive leg has no trader refund')
        },
        // Stage 2. Wiring a wallet-local record format now would be thrown away
        // when the SDK lands `saveRfqSwap` / `rebuildRfqSwap`.
        saveSwap: async () => {},
      })

      await rfqManager.start()
      if (stopped) await rfqManager.stop()
      return rfqManager
    })()

    manager.current = started
    started.catch((err) => consoleError(extractError(err), 'error starting the lightning receive manager'))

    // A tab that slept has passes to catch up on, and every deadline here is
    // absolute — the package's own suggestion for a process that sleeps.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      started.then((rfqManager) => rfqManager.poll()).catch(consoleError)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      manager.current = undefined
      document.removeEventListener('visibilitychange', onVisible)
      started.then((rfqManager) => rfqManager.stop()).catch(consoleError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcWallet, aspInfo.url])

  const track = useCallback(async (request: LnReceiveRequest) => {
    const pending = manager.current
    if (!pending) throw new Error('lightning receive manager is not running')
    // Idempotent per rfqId: `addSwap` replaces a monitored record, so a second
    // call for a swap already in flight would reset its state to `pending` and
    // un-say a claim that has already gone out.
    if (tracked.current.has(request.rfqId)) return
    // Our own `H`, never the quote's `payment_hash`: on a receive leg the wallet
    // generated `P`, so the quote is the solver echoing our hash back. Reading
    // the echo would let the solver name the claim we watch for.
    const paymentHash = hex.encode(request.secrets.paymentHash)
    const swap = toReceiveSwap(request, paymentHash)
    // Held before the swap is monitored: the manager polls it immediately, and a
    // claim callback that cannot find its secrets is a failure it would report.
    tracked.current.set(request.rfqId, {
      payoutAddress: request.payoutAddress,
      record: { ...swapSecretsToRecord(request.secrets), paymentHash },
    })
    setStates((prev) => new Map(prev).set(swap.rfqId, swap.state))
    try {
      await (await pending).addSwap(swap)
    } catch (err) {
      // The manager never took the swap, so no `onSwap*` callback will ever run
      // for this rfqId and nothing else would clear these. Undoing both keeps
      // the invariant that `tracked` and `states` only hold swaps the manager
      // knows about — the caller retries by negotiating afresh, which is a new
      // rfqId, so leaving them would strand an entry nobody reads again.
      tracked.current.delete(request.rfqId)
      setStates((prev) => {
        const next = new Map(prev)
        next.delete(swap.rfqId)
        return next
      })
      throw err
    }
  }, [])

  const status = useCallback((rfqId: string) => states.get(rfqId), [states])
  const error = useCallback((rfqId: string) => errors.get(rfqId), [errors])

  const value = useMemo(() => ({ track, status, error }), [track, status, error])

  return <LnReceiveContext.Provider value={value}>{children}</LnReceiveContext.Provider>
}
