import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { RestArkProvider } from '@arkade-os/sdk'
import { RfqSwapManager, rfqClaimSecretOf, type LightningReceiveProfile, type RfqSwapState } from '@arkade-os/swap'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import {
  LnReceiveHeldElsewhere,
  claimReceive,
  toReceiveOrigin,
  toReceiveSwap,
  type LnReceiveRequest,
} from '../lib/lnReceive'
import { assetSwapRepository } from '../lib/swapRepository'
import { Indexer } from '../lib/indexer'
import { consoleError } from '../lib/logs'
import { extractError } from '../lib/error'

/**
 * Drives every negotiated Lightning receive to its end, across reloads.
 *
 * The claim used to live in the receive screen's effect, which meant a payment
 * was lost the moment the user navigated away — and lost for good on the first
 * throw, since nothing re-armed it. `RfqSwapManager` re-runs the whole decision
 * every pass, so a provider that owns one turned "stay on this screen" into
 * "keep the tab open"; wiring the repository turns that into "open the wallet
 * again". The manager is the canonical sink — it writes every dirty pass itself
 * and reads the records back at boot — so nothing here assembles a record and
 * nothing keeps a session-scoped copy of the claim secrets.
 *
 * It runs page-side rather than in the service worker on the precedent of
 * `watchOfferSwaps` in `AssetSwapsProvider`: the worker hosts `MessageBus` and
 * the wallet reaches this side as a `ServiceWorkerWallet` proxy, so moving the
 * manager in would mean standing a second wallet up inside it.
 *
 * Which is also why only ONE tab may drive it. The records live in shared
 * IndexedDB, so every open tab would otherwise restore every swap and race the
 * others to claim it — two `pushClaim`s over the same VTXOs, one landing, the
 * other failing as a double-spend, and two records disagreeing about
 * `claimArkTxid`. The manager's own guards are per-instance and say nothing
 * about a second one, so the coordination is a Web Lock here.
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

/** One name per origin, so two tabs of this wallet contend and a tab of an
 * unrelated origin cannot. */
const MANAGER_LOCK = 'lnreceive-manager'

/**
 * How long `track` gives THIS tab's own lock request before it concludes the
 * holder is someone else.
 *
 * Pending on the lock says nothing on its own about who holds it: this tab's
 * request is pending too in the moments before it is granted, and "another tab
 * is handling Lightning receives" would be a lie told to the only tab open. The
 * window that can actually bite is a remount — `svcWallet` changes identity on
 * reinit and unlock — where the request queues behind this same tab's previous
 * drive while it stops its manager. A grant that is coming lands well inside
 * this; one that is not was never ours to wait for.
 */
const LOCK_GRACE_MS = 500

export const LnReceiveProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet, reloadWallet } = useContext(WalletContext)

  const [states, setStates] = useState<Map<string, RfqSwapState>>(new Map())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  // The manager's callbacks outlive the render that made them — the effect
  // re-runs only on `svcWallet` or `aspInfo.url` — so they reach the current
  // reload through a ref rather than the value captured when the effect ran.
  const reloadRef = useRef(reloadWallet)
  reloadRef.current = reloadWallet

  // Assigned only once the Web Lock is HELD, which is what lets `track` tell
  // "another tab owns this" from "the manager is not running" — see `track`.
  const manager = useRef<Promise<RfqSwapManager>>()
  // Resolves when this tab's own request is granted, so `track` can wait out
  // the grant rather than mistake it for a lock held elsewhere.
  const granted = useRef<Promise<void>>()
  /**
   * Which rfqIds this tab has already handed to the manager.
   *
   * Not the session-scoped secrets map this replaced — it holds nothing but
   * ids, and the record is the durable copy of everything else. It exists
   * because `addSwap` REPLACES a monitored swap: a second call for one already
   * in flight would reset its state to `pending` and un-say a claim that has
   * already gone out.
   */
  const admitted = useRef<Set<string>>(new Set())

  const setState = useCallback((rfqId: string, state: RfqSwapState) => {
    setStates((prev) => new Map(prev).set(rfqId, state))
  }, [])

  useEffect(() => {
    if (!svcWallet || !aspInfo.url) return
    let stopped = false
    // The lock is released by RETURNING from the callback, never by aborting:
    // per the spec a signal drops a lock request only while it is still
    // pending, so an abort-only cleanup would hold the lock forever and queue
    // the next mount behind it. `svcWallet` changes identity on reinit and
    // unlock (`wallet.tsx`), and StrictMode would double-mount, so this
    // teardown is a live path rather than a page-close curiosity.
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let grant = () => {}
    granted.current = new Promise<void>((resolve) => {
      grant = resolve
    })
    const controller = new AbortController()

    const drive = async () => {
      // Cleanup ran while the request was still queued and the abort did not
      // beat it. Returning now hands the lock straight on.
      if (stopped) return

      const started = (async () => {
        const rfqManager = new RfqSwapManager(
          {
            indexer: new Indexer(aspInfo).provider,
            // Optional to the manager, but it is what registers the lockup in the
            // wallet's contract set and turns the indexer's funding and spend
            // sightings into pushed events instead of poll-interval latency. It
            // is also where the covenant comes from at restore.
            contracts: await svcWallet.getContractManager(),
            // The canonical sink. With it wired the manager composes and writes
            // every record itself, which is why there is no `saveSwap` below: a
            // second sink would double-write, and a no-op stub would be a lie.
            repository: assetSwapRepository,
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
                // The claim lands through this page's own `RestArkProvider`, so
                // the service worker never emits the VTXO_UPDATE the wallet's
                // balance listener waits for. Nothing else would refresh it.
                reloadRef.current().catch(consoleError)
              },
              onSwapFailed: (swap, err) => {
                const error = extractError(err)
                consoleError(error, `lightning receive ${swap.rfqId} failed`)
                setErrors((prev) => new Map(prev).set(swap.rfqId, error))
                // Fired for every throwing action, including ones the next pass
                // will retry.
                if (swap.state === 'failed') setState(swap.rfqId, swap.state)
              },
            },
          },
        )

        // `claimOnchain` is deliberately absent rather than stubbed: the two
        // claims are optional at installation now, a receive leg never reaches
        // that one, and a throwing stub would be a lie the compiler waves
        // through — the manager refuses a kind whose claim is missing at
        // runtime instead. `refundArkade` is NOT optional in the same way and
        // stays a stub for now; a receive leg has no trader refund, so the
        // throw is the true answer rather than a placeholder.
        rfqManager.setCallbacks({
          refundArkade: async () => {
            throw new Error('a receive leg has no trader refund')
          },
          claimLockup: async (swap, vtxos, { partiallyClaimed }) => {
            // The repository, not a session map: this is what a restored swap
            // claims from, and it is the same read whether the swap was
            // negotiated in this page or three reloads ago.
            const record = await assetSwapRepository.getRfqSwap(swap.rfqId)
            if (!record) throw new Error(`no stored record for receive ${swap.rfqId}`)
            // Validates and throws `PreimageNotRecoverableError` rather than
            // handing `preimageForSwapRecord` a partial projection whose
            // missing `paymentHash` would skip its own hash check.
            const secrets = rfqClaimSecretOf(record)
            if (!secrets) throw new Error(`receive ${swap.rfqId} carries no claim secret`)
            const { payoutAddress } = record.profile as LightningReceiveProfile
            const lockup = swap.lockup
            if (!lockup) throw new Error(`receive ${swap.rfqId} carries no covenant to claim`)
            return claimReceive({
              wallet: svcWallet,
              ark: new RestArkProvider(aspInfo.url),
              swap: { ...swap, lockup },
              payoutAddress,
              record: secrets,
              vtxos,
              partiallyClaimed,
            })
          },
        })

        // Prunes retired records, rebuilds the rest from their contract rows,
        // and reports the ones it could not — a covenant mismatch or a missing
        // contract row says something true about that one record and is never a
        // reason to strand the others. A restore that fails outright must not
        // stop `start` for the swaps that did rebuild.
        try {
          const { restored, failed } = await rfqManager.restoreFromRepository()
          if (restored.length) {
            setStates((prev) => {
              const next = new Map(prev)
              for (const swap of restored) next.set(swap.rfqId, swap.state)
              return next
            })
            for (const swap of restored) admitted.current.add(swap.rfqId)
          }
          for (const { rfqId, error } of failed) {
            const message = extractError(error)
            consoleError(message, `lightning receive ${rfqId} could not be restored`)
            setErrors((prev) => new Map(prev).set(rfqId, message))
          }
        } catch (err) {
          consoleError(extractError(err), 'error restoring lightning receives')
        }

        await rfqManager.start()
        return rfqManager
      })()

      manager.current = started
      grant()
      started.catch((err) => consoleError(extractError(err), 'error starting the lightning receive manager'))

      await held
      await started.then((rfqManager) => rfqManager.stop()).catch(consoleError)
    }

    if (navigator.locks) {
      navigator.locks.request(MANAGER_LOCK, { signal: controller.signal }, drive).catch((err) => {
        // The abort earns its place for exactly one case: a tab that unmounts
        // while its request is still queued. That rejection is the expected
        // outcome, not a failure.
        if ((err as Error)?.name === 'AbortError') return
        consoleError(extractError(err), 'error acquiring the lightning receive lock')
      })
    } else {
      // No Web Locks — an insecure context, or a browser without them. Falling
      // through to today's behaviour is right: single-tab is the common case
      // and refusing to run would lose every receive to protect against a race
      // that may never happen.
      drive().catch((err) => consoleError(extractError(err), 'error driving lightning receives'))
    }

    // A tab that slept has passes to catch up on, and every deadline here is
    // absolute — the package's own suggestion for a process that sleeps. A tab
    // still waiting for the lock has no manager and polls nothing.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      manager.current?.then((rfqManager) => rfqManager.poll()).catch(consoleError)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      manager.current = undefined
      granted.current = undefined
      admitted.current.clear()
      document.removeEventListener('visibilitychange', onVisible)
      controller.abort()
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcWallet, aspInfo.url])

  const track = useCallback(async (request: LnReceiveRequest) => {
    let pending = manager.current
    if (!pending && granted.current) {
      // Waited out rather than answered on the spot: a request of ours that is
      // merely young is indistinguishable from one queued behind another tab,
      // and only one of the two is worth telling the user about.
      await Promise.race([granted.current, new Promise((resolve) => setTimeout(resolve, LOCK_GRACE_MS))])
      pending = manager.current
    }
    if (!pending) {
      // Two different answers, and the screen says different things about
      // them. Nothing is unavailable when another tab holds the lock — it is
      // driving these swaps perfectly well, just not here.
      if (granted.current) throw new LnReceiveHeldElsewhere()
      throw new Error('lightning receive manager is not running')
    }
    if (admitted.current.has(request.rfqId)) return
    // Both read `paymentHash` off `treeParams` — what the wallet derived the
    // covenant from — so there is no hash for this side to pick, and no way to
    // hand the two mappings different ones.
    const swap = toReceiveSwap(request)
    const origin = toReceiveOrigin(request)
    admitted.current.add(request.rfqId)
    setStates((prev) => new Map(prev).set(swap.rfqId, swap.state))
    try {
      // The origin is what lets the manager write this swap's FIRST record —
      // admission marks it dirty, so the record is on disk a pass later while
      // the swap is still `pending`, rather than first appearing at settlement.
      // Omitting it would throw `RfqSwapOriginRequired` at the door.
      await (await pending).addSwap(swap, origin)
    } catch (err) {
      // The manager never took the swap, so no `onSwap*` callback will ever run
      // for this rfqId and nothing else would clear these. The idempotency
      // guard is keyed on the same id, so an orphan would turn the retry into a
      // silent no-op if the rfqId were ever reused.
      admitted.current.delete(request.rfqId)
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
