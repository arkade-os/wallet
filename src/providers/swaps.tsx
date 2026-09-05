/**
 * Every swap this wallet makes, driven by one v2 `@arkade-os/swap` client.
 *
 * What this replaces: three providers that each stood up their own machinery —
 * `AssetSwapsProvider` with `createOffer` + `watchOfferSwaps`, `LnSwapsProvider`
 * with an `RfqSwapManager` and hand-wired refund callbacks, `LnReceiveProvider`
 * with a SECOND `RfqSwapManager` and a claim callback — and, after that, the v1
 * facade this wallet passed through on the way here.
 *
 * The v2 client takes a route and returns an outcome. It resolves the market,
 * parses the destination, decodes the invoice, picks the corridor, funds with
 * the right packet, persists before anything irreversible, watches, claims and
 * refunds. So the three product paths are one verb each — `pay`, `receive`,
 * `exchange` — and what is left here is the wiring, the wallet's own UI state,
 * and the two things the client does not own: the chain restore scan for offer
 * records, and the quote snapshot the activity list renders.
 *
 * **One tab drives.** The receive leg was already single-tab — two tabs
 * restoring the same records would race `pushClaim` over one lockup, one landing
 * and one failing as a double-spend — and the client claims on behalf of every
 * corridor, so the Web Lock covers the whole client. A tab without the lock
 * still reads: markets come from the registry and swap rows from the repository,
 * neither of which is the client's. What it cannot do is act, and
 * `SwapsHeldElsewhere` is what it says so with.
 *
 * It runs page-side rather than in the service worker on the precedent
 * `watchOfferSwaps` set: the worker hosts `MessageBus` and the wallet reaches
 * this side as a `ServiceWorkerWallet` proxy, so moving the client in would mean
 * standing a second wallet up inside it.
 */
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { hex } from '@scure/base'
import { asset, RestIndexerProvider, type NetworkName } from '@arkade-os/sdk'
import { BTC_ASSET_ID, addAssetSwap, findMarket, restoreAssetSwaps, type AssetSwap } from '@arkade-os/swap'
import {
  arkadeAsset,
  btcOn,
  type AssetId,
  type AssetSwapId,
  type Outcome,
  type Quote,
  type Swap,
  type SwapClient,
} from '@arkade-os/swap/client'
import { sideLimits, type DiscoveredMarket, type OfferPlan, type Side } from '@arkade-os/solver-discovery'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { discoverMarkets } from '../lib/swapMarkets'
import { toInvoiceFacts } from '../lib/lnSwap'
import { makeSwapClient, SwapsHeldElsewhere } from '../lib/swapClient'
import {
  assetSwapRepository,
  saveQuoteSnapshot,
  type AssetSwapQuoteSnapshot,
  type WalletAssetSwap,
} from '../lib/swapRepository'
import { displayAssetOf, offerSwaps } from '../lib/swapRecords'
import { getEmulatorPubkeyForNetwork } from '../lib/constants'
import { consoleError } from '../lib/logs'
import { extractError } from '../lib/error'
import { prettyNumber } from '../lib/format'
import { toast } from '../components/Toast'

/** What the receive screen needs from a negotiated and driven receive. */
export interface AcceptedLnReceive {
  /** The swap's tagged public id, for status lookups. */
  id: AssetSwapId
  /** The solver's hold invoice — what the payer pays. */
  invoice: string
  /** What the payer is asked for, sats — larger than the amount received. */
  payAmount: number
  /** Last moment the invoice can be paid, unix seconds. */
  invoiceExpiresAt: number
}

interface SwapsContextProps {
  /** Spot markets — the ones this wallet builds offers on. */
  markets: DiscoveredMarket[]
  /** True when there are markets and the covenant co-signer's key is known. */
  swapAvailable: boolean
  swaps: WalletAssetSwap[]
  runDiscovery: (useCache?: boolean) => void
  /** Fund an arkade↔arkade asset swap for the plan the composer quoted. */
  exchange: (market: DiscoveredMarket, plan: OfferPlan, quote?: AssetSwapQuoteSnapshot) => Promise<Swap>
  cancelSwap: (id: string) => Promise<void>
  /** Negotiate a payment. Nothing is funded: the pay screen accepts. */
  quotePay: (destination: string) => Promise<Quote>
  /** Fund it — which IS the acceptance. Resolves with the funding txid. */
  acceptPay: (quote: Quote) => Promise<string>
  /** Negotiate a Lightning receive and begin driving it, in that order. */
  receiveLightning: (amountSats: number) => Promise<AcceptedLnReceive>
  /** Where a driven swap stands, or undefined when it is not monitored. */
  outcomeOf: (id: string) => Outcome | undefined
  /** The last error reported for one, cleared when it ends. */
  errorOf: (id: string) => string | undefined
}

const notInitialized = async (): Promise<never> => {
  throw new Error('swaps not initialized')
}

export const SwapsContext = createContext<SwapsContextProps>({
  markets: [],
  swapAvailable: false,
  swaps: [],
  runDiscovery: () => {
    throw new Error('swaps not initialized')
  },
  exchange: notInitialized,
  cancelSwap: notInitialized,
  quotePay: notInitialized,
  acceptPay: notInitialized,
  receiveLightning: notInitialized,
  outcomeOf: () => undefined,
  errorOf: () => undefined,
})

/** One name per origin, so two tabs of this wallet contend and a tab of an
 * unrelated origin cannot. */
const CLIENT_LOCK = 'swap-client'

/**
 * How long an action gives THIS tab's own lock request before it concludes the
 * holder is someone else.
 *
 * Pending on the lock says nothing on its own about who holds it: this tab's
 * request is pending too in the moments before it is granted, and "another tab
 * is handling swaps" would be a lie told to the only tab open. The window that
 * can actually bite is a remount — `svcWallet` changes identity on reinit and
 * unlock — where the request queues behind this same tab's previous client
 * while it stops. A grant that is coming lands well inside this; one that is not
 * was never ours to wait for.
 */
const LOCK_GRACE_MS = 500

/** Outcomes worth telling the user about, and what they mean to them. */
const ENDED: Partial<Record<Outcome, 'received' | 'returned' | 'lost'>> = {
  filled: 'received',
  claimed: 'received',
  paid: 'received',
  cancelled: 'returned',
  refunded: 'returned',
  lapsed: 'lost',
}

export const SwapsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { dataReady, svcWallet, reloadWallet, setAssetSwaps, txs } = useContext(WalletContext)

  const [markets, setMarkets] = useState<DiscoveredMarket[]>([])
  const [emulatorPubkey, setEmulatorPubkey] = useState<Uint8Array>()
  const [swaps, setSwaps] = useState<WalletAssetSwap[]>([])
  const [outcomes, setOutcomes] = useState<Map<string, Outcome>>(new Map())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  // the reconciliation reads the current list from outside a render, where
  // `swaps` would be the value captured when it was created
  const swapsRef = useRef(swaps)
  swapsRef.current = swaps

  // read through a ref so the update listener (which deliberately does not
  // rebind on market refreshes) always names assets from the current list
  const marketsRef = useRef(markets)
  marketsRef.current = markets

  // The listeners outlive the render that made them, so they reach the current
  // reload through a ref rather than the value captured at start.
  const reloadRef = useRef(reloadWallet)
  reloadRef.current = reloadWallet

  // Assigned only once the Web Lock is HELD, which is what lets an action tell
  // "another tab owns this" from "the client is not running" — see `driving`.
  const held = useRef<Promise<SwapClient>>()
  // Resolves when this tab's own request is granted, so an action can wait out
  // the grant rather than mistake it for a lock held elsewhere.
  const granted = useRef<Promise<void>>()

  /** Re-read both keyspaces. Cheap, and the only way a v1 row the restore scan
   * just wrote reaches the list. */
  const refreshSwaps = useCallback(async () => {
    try {
      const next = await offerSwaps()
      swapsRef.current = next
      setSwaps(next)
      return next
    } catch (err) {
      consoleError(err, 'failed to read swaps')
      return swapsRef.current
    }
  }, [])

  // The store is async, so the list arrives after the first render rather than
  // with it. Re-read on every dataReady transition: a wallet reset clears the
  // repository, and the emptied list has to reach the UI.
  useEffect(() => {
    void refreshSwaps()
  }, [dataReady, refreshSwaps])

  // publish to the wallet provider, which merges swaps into the activity list;
  // it owns `txs`, so the list travels up rather than being read back down
  useEffect(() => setAssetSwaps(swaps), [swaps, setAssetSwaps])

  // ---------------------------------------------------------------- discovery
  //
  // Deliberately outside the lock. Discovery is a registry read through the
  // shared repository cache, and a tab that cannot drive still has to render
  // the swap screen and say why it cannot act. The client routes against the
  // same options (`discoveryOptions`), so the two never disagree about which
  // registry answered.
  //
  // The co-signer key is read from config, not fetched: clients have no network
  // path to the emulator, so a reachability probe would fail in any correct
  // deployment and hide swaps entirely. Config presence is the honest gate.

  const allMarketsRef = useRef<DiscoveredMarket[]>([])
  const setAllMarkets = (all: DiscoveredMarket[]) => {
    allMarketsRef.current = all
    // Corridor (RFQ) markets are hidden from the offer composer: `exchange`
    // builds offers, and a corridor is negotiated with a solver instead.
    // Keeping them here would let one Lightning card turn the whole swap
    // surface on with nothing behind it.
    setMarkets(all.filter((m) => !m.quote_corridor))
  }

  const runDiscovery = (useCache = true) => {
    if (!aspInfo.network) return
    const network = aspInfo.network as NetworkName
    discoverMarkets(network, useCache)
      .then(setAllMarkets)
      .catch((err) => consoleError(err, 'solver discovery failed'))
    setEmulatorPubkey(getEmulatorPubkeyForNetwork(network))
  }

  useEffect(() => {
    setEmulatorPubkey(undefined)
    setAllMarkets([])
    runDiscovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.network])

  // ------------------------------------------------------------- restore scan
  //
  // After a restore the swap store is empty while the funding/fill txs are back
  // in history, so swaps would show as bare sent/received rows. Scan the sent
  // virtual txs for offer packets and rebuild the lost records by binding each
  // funding vtxo to the tx that spent it (fill or cancel).
  //
  // Still the wallet's, and still writing V1 records: the v2 client restores its
  // own records from the repository and has no chain rebuild for offers. Those
  // rows are read back by `offerSwaps`, which merges both keyspaces.
  const scanningRef = useRef(false)
  useEffect(() => {
    if (!aspInfo.url || !aspInfo.signerPubkey || !dataReady || txs.length === 0 || scanningRef.current) return
    let cancelled = false
    scanningRef.current = true
    const scan = async () => {
      const [existing, scanned] = await Promise.all([offerSwaps(), assetSwapRepository.getScannedTxids()])
      const { restored, scannedTxids } = await restoreAssetSwaps(
        new RestIndexerProvider(aspInfo.url),
        txs,
        new Set(existing.map((s) => s.id)),
        // x-only, matching the key the covenants were funded against
        { operatorPubkey: hex.decode(aspInfo.signerPubkey).slice(1), scanned },
      )
      // a wallet reset may have cleared the repository while the scan ran —
      // never write the old profile's records into it.
      if (cancelled) return
      await assetSwapRepository.markTxidsScanned(scannedTxids)
      if (restored.length === 0) return
      for (const swap of restored) {
        if (cancelled) return
        // quote-time facts are not on chain; the fee rate is the one fact a
        // restore can backfill, from the pair's current market card.
        const feeBps = findMarket(marketsRef.current, swap.fromAsset, swap.toAsset)?.market?.fee_bps
        await addAssetSwap(
          assetSwapRepository,
          feeBps === undefined ? swap : ({ ...swap, quote: { feeBps } } as AssetSwap),
        )
      }
      await refreshSwaps()
      // re-merge the activity list so the tx couple collapses into Swap rows
      reloadRef.current().catch(consoleError)
    }
    scan()
      .catch((err) => consoleError(err, 'swap restore scan failed'))
      .finally(() => {
        scanningRef.current = false
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.url, aspInfo.signerPubkey, dataReady, txs])

  // ------------------------------------------------------------- the announcer

  const tickerFor = (assetId: AssetId): string => {
    const display = displayAssetOf(assetId)
    if (display === BTC_ASSET_ID) return 'sats'
    for (const market of allMarketsRef.current) {
      if (market.quote_asset.id === display) return market.quote_asset.ticker
      if (market.base_asset.id === display) return market.base_asset.ticker
    }
    return display.slice(0, 8)
  }

  /**
   * One outcome vocabulary for both families, which is what the two status
   * ternaries this wallet used to carry collapse into.
   *
   * `lapsed` is the one that has to be said out loud: on a receive leg every
   * non-claim leaf of the covenant is the solver's, so a lockup spent any other
   * way means the incoming payment never arrived. The v1 vocabulary called that
   * `refunded` — the same word it used for the trader's own money coming back.
   */
  const announce = (swap: Swap) => {
    setOutcomes((prev) => (prev.get(swap.id) === swap.outcome ? prev : new Map(prev).set(swap.id, swap.outcome)))
    const ended = ENDED[swap.outcome]
    if (!ended) return
    setErrors((prev) => {
      if (!prev.has(swap.id)) return prev
      const next = new Map(prev)
      next.delete(swap.id)
      return next
    })
    if (ended === 'received') toast.success(`Swap completed, ${tickerFor(swap.take.asset)} received`)
    else if (ended === 'returned') toast.success('Swap cancelled, funds returned')
    else toast.error('Lightning payment was not received')
    // The claim and the refund land through the client's own broadcaster, so
    // the service worker never emits the VTXO_UPDATE the balance listener waits
    // for. Nothing else would refresh it.
    void refreshSwaps()
    reloadRef.current().catch(consoleError)
  }

  // ------------------------------------------------------------ the client

  useEffect(() => {
    if (!dataReady || !svcWallet || !aspInfo.url || !aspInfo.network) return
    const network = aspInfo.network as NetworkName
    let stopped = false
    // The lock is released by RETURNING from the callback, never by aborting:
    // per the spec a signal drops a lock request only while it is still
    // pending, so an abort-only cleanup would hold the lock forever and queue
    // the next mount behind it.
    let release = () => {}
    const holding = new Promise<void>((resolve) => {
      release = resolve
    })
    let grant = () => {}
    granted.current = new Promise<void>((resolve) => {
      grant = resolve
    })
    const controller = new AbortController()

    const drive = async () => {
      if (stopped) return

      const started = (async () => {
        const client = makeSwapClient(svcWallet, network)
        client.onUpdate((update) => {
          announce(update.swap)
          if (update.outcome === 'needs_recovery' || update.outcome === 'failed') {
            const reason = update.swap.failure ?? update.swap.blockedReason
            if (reason) setErrors((prev) => new Map(prev).set(update.swap.id, reason))
          }
        })
        // `drive: "auto"`: construction restores and arms only when the read
        // finds live swaps. `ready` is that read, and it rejects only when the
        // repository itself is unreadable — a client that cannot read its own
        // records cannot drive them safely.
        await client.ready
        await refreshSwaps()
        return client
      })()

      held.current = started
      grant()
      started.catch((err) => consoleError(extractError(err), 'error starting the swap client'))

      await holding
      // Terminal cleanup: drops timers, streams, listeners and loop state while
      // leaving every durable record and contract registration in place, so the
      // next mount restores and resumes from them.
      await started.then((client) => client[Symbol.asyncDispose]()).catch(consoleError)
    }

    if (navigator.locks) {
      navigator.locks.request(CLIENT_LOCK, { signal: controller.signal }, drive).catch((err) => {
        // The abort earns its place for exactly one case: a tab that unmounts
        // while its request is still queued. That rejection is expected.
        if ((err as Error)?.name === 'AbortError') return
        consoleError(extractError(err), 'error acquiring the swap client lock')
      })
    } else {
      // No Web Locks — an insecure context, or a browser without them. Falling
      // through to today's behaviour is right: single-tab is the common case
      // and refusing to run would lose every live swap to protect against a
      // race that may never happen.
      drive().catch((err) => consoleError(extractError(err), 'error driving swaps'))
    }

    return () => {
      stopped = true
      held.current = undefined
      granted.current = undefined
      controller.abort()
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady, svcWallet, aspInfo.url, aspInfo.network])

  /**
   * The client, if this tab is the one driving.
   *
   * Two different answers when it is not, and the screens say different things
   * about them. Nothing is unavailable when another tab holds the lock — it is
   * driving these swaps perfectly well, just not here.
   */
  const driving = useCallback(async (): Promise<SwapClient> => {
    let pending = held.current
    if (!pending && granted.current) {
      // Waited out rather than answered on the spot: a request of ours that is
      // merely young is indistinguishable from one queued behind another tab.
      await Promise.race([granted.current, new Promise((resolve) => setTimeout(resolve, LOCK_GRACE_MS))])
      pending = held.current
    }
    if (!pending) {
      if (granted.current) throw new SwapsHeldElsewhere()
      throw new Error('the swap client is not running')
    }
    return pending
  }, [])

  // ----------------------------------------------------------- asset swaps

  /** The composer's asset ids are discovery's; the client's are CAIP-19. */
  const assetIdFor = (network: NetworkName, discoveryId: string): AssetId =>
    discoveryId === BTC_ASSET_ID
      ? btcOn('arkade', network)
      : arkadeAsset(network, asset.AssetId.fromString(discoveryId))

  const exchange = async (
    _market: DiscoveredMarket,
    plan: OfferPlan,
    quote?: AssetSwapQuoteSnapshot,
  ): Promise<Swap> => {
    if (!emulatorPubkey) throw new Error('swap service unavailable')
    const network = aspInfo.network as NetworkName
    const client = await driving()
    const give = assetIdFor(network, plan.deposit.asset.id)
    const take = assetIdFor(network, plan.receive.asset.id)
    // Quote and accept rather than `client.exchange`, for one reason: the
    // composer has been pricing this plan live and the user confirmed a number.
    // `exchange` re-quotes internally and would fund whatever came back.
    // Quoting here lets the confirmed amount be a floor — the swap is refused
    // rather than funded at a worse rate than the one on screen. The market is
    // the client's to select; it is taken here only so the caller's own
    // pair lookup and the client's cannot silently disagree about the pair.
    const quoted = await client.quote({ give, take, amount: plan.deposit.atomic, amountOn: 'give' })
    if (quoted.take.amount < plan.receive.atomic) {
      throw new Error('The rate moved while you were confirming — go back and try again')
    }
    const swap = await client.accept(quoted)
    // The one fact the client does not persist, because it does not own it:
    // tickers, decimals, the fee rate and the fiat amount frozen at quote time,
    // which is all the activity row has to render a swap whose market card may
    // have changed since.
    // Best effort: the swap is funded either way, and a lost snapshot costs
    // the row its tickers, never its money.
    if (quote) {
      try {
        saveQuoteSnapshot(swap.id, quote)
      } catch (err) {
        consoleError(err, 'failed to store the swap quote snapshot')
      }
    }
    announce(swap)
    await refreshSwaps()
    reloadRef.current().catch(consoleError)
    return swap
  }

  /**
   * v1's cancel threw when the fill won the race, and its own docs said the
   * throw meant the swap had completed — a trap this wallet reconciled by hand,
   * from the wallet's history, after the fact. v2 reads the spending
   * transaction and classifies it by the covenant leaf it took, so all three
   * answers are returns and none of them is an exception.
   */
  const reportCancel = (outcome: Awaited<ReturnType<SwapClient['cancel']>>['outcome']) => {
    if (outcome === 'cancelled') toast.success('Swap cancelled, funds returned')
    else if (outcome === 'filled') toast.success('Swap completed before it could be cancelled')
    else toast.error('The deposit moved and could not be classified — recovery is needed')
  }

  const cancelSwap = async (id: string): Promise<void> => {
    const client = await driving()
    const { outcome } = await client.cancel(id as AssetSwapId)
    await refreshSwaps()
    reportCancel(outcome)
    reloadRef.current().catch(consoleError)
  }

  // ------------------------------------------------------------- payments

  /**
   * The card's own bounds, checked before a quote is burned.
   *
   * The client selects the market and refuses a route it cannot serve, but it
   * does no size check against the card: an out-of-range amount reaches the
   * solver and comes back a refusal, one round trip and one disclosed invoice
   * later. This is the pre-flight that was lost with the corridor pickers, kept
   * because the message it produces is the only one a user can act on.
   *
   * A side bounds what the SOLVER pays out on it, so the corridor's two
   * directions are the two sides of one market: quote (Lightning) is the send
   * leg, base (arkade) the receive leg.
   */
  const assertWithinBounds = (sats: number, side: Side) => {
    const market = allMarketsRef.current.find((m) => m.quote_corridor === 'lightning')
    // No card, or a disabled side: leave it to the client, which answers
    // "no route" rather than an invented range.
    const bounds = market && sideLimits(market, side)
    if (!bounds) return
    const [min, max] = [Number(bounds.min), Number(bounds.max)]
    if (sats < min || sats > max) {
      throw new Error(`Amount outside solver bounds (${prettyNumber(min)}-${prettyNumber(max)} sats)`)
    }
  }

  const quotePay = async (destination: string): Promise<Quote> => {
    const client = await driving()
    // No corridor to pick, no market to find: `to` is parsed once at the client
    // boundary and the corridor pair it yields selects the route. The wallet's
    // own BOLT11 gates still run — they are the lightning corridor's `decode`
    // override — and they are what the bounds check reads the amount from,
    // which is why an invoice is decoded here and nowhere else.
    if (destination.toLowerCase().startsWith('ln')) {
      assertWithinBounds(toInvoiceFacts(destination, aspInfo.network as NetworkName).amountSats, 'quote')
    }
    return client.quote({ to: destination })
  }

  const acceptPay = async (quote: Quote): Promise<string> => {
    const client = await driving()
    const swap = await client.accept(quote)
    announce(swap)
    if (!swap.fundingTxid) throw new Error('the lockup was not funded')
    return swap.fundingTxid
  }

  const receiveLightning = async (amountSats: number): Promise<AcceptedLnReceive> => {
    const client = await driving()
    assertWithinBounds(amountSats, 'base')
    // `receive` pins the TAKE leg: the trader is credited `amount` and the
    // payer is shown `amount + fee`, which is what `give` carries below.
    // Driving starts before the invoice comes back, so the monitored set is
    // always a superset of what is payable.
    const request = await client.receive({ amount: BigInt(amountSats), via: 'lightning' })
    announce(request)
    if (request.artifact.kind !== 'invoice') throw new Error('the receive produced no invoice')
    return {
      id: request.id,
      invoice: request.artifact.bolt11,
      payAmount: Number(request.give.amount),
      invoiceExpiresAt: request.expiresAt,
    }
  }

  const outcomeOf = useCallback((id: string) => outcomes.get(id), [outcomes])
  const errorOf = useCallback((id: string) => errors.get(id), [errors])

  const swapAvailable = markets.length > 0 && Boolean(emulatorPubkey)
  const value = useMemo(
    () => ({
      markets,
      swapAvailable,
      swaps,
      runDiscovery,
      exchange,
      cancelSwap,
      quotePay,
      acceptPay,
      receiveLightning,
      outcomeOf,
      errorOf,
    }),
    // the actions close over these
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markets, swapAvailable, swaps, svcWallet, emulatorPubkey, aspInfo.url, aspInfo.network, outcomeOf, errorOf],
  )

  return <SwapsContext.Provider value={value}>{children}</SwapsContext.Provider>
}
