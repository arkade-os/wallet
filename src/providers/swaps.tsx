/**
 * Every swap this wallet makes, driven by one `@arkade-os/swap` client.
 *
 * What this replaces: three providers that each stood up their own machinery —
 * `AssetSwapsProvider` with `createOffer` + `watchOfferSwaps`, `LnSwapsProvider`
 * with an `RfqSwapManager` and hand-wired refund callbacks, `LnReceiveProvider`
 * with a SECOND `RfqSwapManager` and a claim callback. v2's `createSwapClient`
 * owns one manager, one offer watcher, and both money-moving callbacks
 * (`arkadeRefunder` for the send leg's refund, an internal `claimLockup` reading
 * the stored record for the receive leg's claim), so what is left here is
 * wiring, the wallet's own UI state, and the two things the client does not do:
 * the restore scan, and the quote snapshot the activity list renders.
 *
 * **One tab drives.** The receive leg was already single-tab — two tabs
 * restoring the same records would race `pushClaim` over one lockup, one landing
 * and one failing as a double-spend — and the client claims on behalf of every
 * corridor, so the Web Lock now covers the whole client rather than one
 * manager. A tab without the lock still reads: markets, history and swap rows
 * all come from the registry and the repository, neither of which is the
 * client's. What it cannot do is act, and `SwapsHeldElsewhere` is what it says
 * so with.
 *
 * It runs page-side rather than in the service worker on the precedent
 * `watchOfferSwaps` set: the worker hosts `MessageBus` and the wallet reaches
 * this side as a `ServiceWorkerWallet` proxy, so moving the client in would mean
 * standing a second wallet up inside it.
 */
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { hex } from '@scure/base'
import { RestIndexerProvider, type NetworkName } from '@arkade-os/sdk'
import {
  BTC_ASSET_ID,
  addAssetSwap,
  decodeOffer,
  findMarket,
  getAssetSwaps,
  restoreAssetSwaps,
  updateAssetSwap,
  type AssetSwap,
  type LightningReceiveQuote,
  type LightningSendQuote,
  type RfqSwap,
  type RfqSwapState,
  type UnifiedSwap,
} from '@arkade-os/swap'
import { DiscoveredMarket, OfferPlan } from '@arkade-os/solver-discovery'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { discoverMarkets } from '../lib/swapMarkets'
import { makeSwapClient, SwapsHeldElsewhere, type WalletSwapClient } from '../lib/swapClient'
import { assetSwapRepository, type AssetSwapQuoteSnapshot, type WalletAssetSwap } from '../lib/swapRepository'
import { isCancelSpend } from '../lib/swapSpend'
import { lnReceiveCorridor, lnSendCorridor, lockupSpenderTxid, toInvoiceFacts } from '../lib/lnSwap'
import { fundingTxidOf, readRecord, recordSpendTxid, spendTxidOf } from '../lib/lnSendRecords'
import { friendlyRfqError } from '../lib/nostrRfq'
import { getTxHistory } from '../lib/asp'
import { getEmulatorPubkeyForNetwork } from '../lib/constants'
import { consoleError } from '../lib/logs'
import { extractError } from '../lib/error'
import { prettyNumber } from '../lib/format'
import { toast } from '../components/Toast'

/** What the receive screen needs from a negotiated and admitted receive. */
export interface AcceptedLnReceive {
  rfqId: string
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
  createSwap: (market: DiscoveredMarket, plan: OfferPlan, quote?: AssetSwapQuoteSnapshot) => Promise<WalletAssetSwap>
  cancelSwap: (id: string) => Promise<void>
  /** Negotiate a Lightning send. Nothing is funded: the pay screen accepts. */
  quoteLnSend: (invoice: string) => Promise<LightningSendQuote>
  /** Fund the lockup — which IS the acceptance. Resolves with its txid. */
  acceptLnSend: (quote: LightningSendQuote) => Promise<string>
  /** Negotiate a Lightning receive and begin driving it, in that order. */
  receiveLightning: (amountSats: number) => Promise<AcceptedLnReceive>
  /** Where a driven RFQ swap stands, or undefined when it is not monitored. */
  lnStatus: (rfqId: string) => RfqSwapState | undefined
  /** The last error reported for one, cleared when it ends. */
  lnError: (rfqId: string) => string | undefined
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
  createSwap: notInitialized,
  cancelSwap: notInitialized,
  quoteLnSend: notInitialized,
  acceptLnSend: notInitialized,
  receiveLightning: notInitialized,
  lnStatus: () => undefined,
  lnError: () => undefined,
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

export const SwapsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { dataReady, svcWallet, reloadWallet, setAssetSwaps, txs } = useContext(WalletContext)

  const [markets, setMarkets] = useState<DiscoveredMarket[]>([])
  const [emulatorPubkey, setEmulatorPubkey] = useState<Uint8Array>()
  const [swaps, setSwaps] = useState<WalletAssetSwap[]>([])
  const [lnStates, setLnStates] = useState<Map<string, RfqSwapState>>(new Map())
  const [lnErrors, setLnErrors] = useState<Map<string, string>>(new Map())

  // the watcher and the reconciliation both read the current list from outside
  // a render, where `swaps` would be the value captured when they were created
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
  const held = useRef<Promise<WalletSwapClient>>()
  // Resolves when this tab's own request is granted, so an action can wait out
  // the grant rather than mistake it for a lock held elsewhere.
  const granted = useRef<Promise<void>>()

  const readSwaps = async (): Promise<WalletAssetSwap[]> =>
    (await getAssetSwaps(assetSwapRepository)) as WalletAssetSwap[]

  /** Adopt a list the repository just returned, keeping the ref in step. */
  const applySwaps = (list: AssetSwap[]): WalletAssetSwap[] => {
    const next = list as WalletAssetSwap[]
    swapsRef.current = next
    setSwaps(next)
    return next
  }

  // The store is async, so the list arrives after the first render rather than
  // with it. Re-read on every dataReady transition: a wallet reset clears the
  // repository, and the emptied list has to reach the UI.
  useEffect(() => {
    readSwaps()
      .then(applySwaps)
      .catch((err) => consoleError(err, 'failed to read asset swaps'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady])

  // publish to the wallet provider, which merges swaps into the activity list;
  // it owns `txs`, so the list travels up rather than being read back down
  useEffect(() => setAssetSwaps(swaps), [swaps, setAssetSwaps])

  // ---------------------------------------------------------------- discovery
  //
  // Deliberately outside the lock. Discovery is a registry read through the
  // shared repository cache, and a tab that cannot drive still has to render
  // the swap screen and say why it cannot act.
  //
  // The co-signer key is read from config, not fetched: clients have no network
  // path to the emulator, so a reachability probe would fail in any correct
  // deployment and hide swaps entirely. Config presence is the honest gate — it
  // answers the question the UI actually needs ("can we derive a covenant at
  // all?") rather than one about the client's own connectivity.

  // Corridor (RFQ) markets are kept for the Lightning legs and hidden from the
  // offer composer: `createSwap` builds offers, and a corridor is negotiated
  // with a solver instead. Keeping them in `markets` would let one Lightning
  // card turn the whole swap surface on with nothing behind it.
  const allMarketsRef = useRef<DiscoveredMarket[]>([])
  const setAllMarkets = (all: DiscoveredMarket[]) => {
    allMarketsRef.current = all
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
  // funding vtxo to the tx that spent it (fill or cancel). The scan is
  // incremental — answered txids persist, so late-synced history is picked up by
  // later runs and nothing is fetched twice.
  //
  // Still the wallet's: the client restores the RFQ half from its own records
  // and has no equivalent for rebuilding offer records off chain.
  const scanningRef = useRef(false)
  useEffect(() => {
    if (!aspInfo.url || !aspInfo.signerPubkey || !dataReady || txs.length === 0 || scanningRef.current) return
    let cancelled = false
    scanningRef.current = true
    const scan = async () => {
      const [existing, scanned] = await Promise.all([readSwaps(), assetSwapRepository.getScannedTxids()])
      const { restored, scannedTxids } = await restoreAssetSwaps(
        new RestIndexerProvider(aspInfo.url),
        txs,
        new Set(existing.map((s) => s.id)),
        // x-only, matching the key the covenants were funded against
        { operatorPubkey: hex.decode(aspInfo.signerPubkey).slice(1), scanned },
      )
      // a wallet reset may have cleared the repository while the scan ran —
      // never write the old profile's records into it. The repository clears
      // asynchronously, so this is re-checked before every write below rather
      // than once.
      if (cancelled) return
      await assetSwapRepository.markTxidsScanned(scannedTxids)
      if (restored.length === 0) return
      let next: WalletAssetSwap[] = []
      for (const swap of restored) {
        if (cancelled) return
        // quote-time facts are not on chain; the fee rate is the one fact a
        // restore can backfill, from the pair's current market card — an
        // approximation if the solver changed its fee since the swap.
        // TODO: delete this backfill once fee bps rides in a packet inside
        // the funding tx — restoreAssetSwaps will then decode the actual
        // historic rate from chain, like it already does the offer.
        const feeBps = findMarket(marketsRef.current, swap.fromAsset, swap.toAsset)?.market?.fee_bps
        next = (await addAssetSwap(
          assetSwapRepository,
          feeBps === undefined ? swap : ({ ...swap, quote: { feeBps } } as AssetSwap),
        )) as WalletAssetSwap[]
      }
      applySwaps(next)
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

  const tickerFor = (assetId: string): string => {
    if (assetId === BTC_ASSET_ID) return 'sats'
    for (const market of allMarketsRef.current) {
      if (market.quote_asset.id === assetId) return market.quote_asset.ticker
      if (market.base_asset.id === assetId) return market.base_asset.ticker
    }
    return assetId.slice(0, 8)
  }

  /** An offer status the client persisted. It writes before it notifies, so the
   * record is durable by the time this runs — all that is left is telling the
   * user and refreshing balances. */
  const announceOffer = (updated: WalletAssetSwap) => {
    const before = swapsRef.current.find((s) => s.id === updated.id)
    applySwaps(
      before
        ? swapsRef.current.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
        : [updated, ...swapsRef.current],
    )
    if (before?.status === updated.status) return
    if (updated.status === 'fulfilled') {
      toast.success(`Swap completed, ${tickerFor(updated.toAsset)} received`)
      reloadRef.current().catch(consoleError)
    } else if (updated.status === 'cancelled') {
      toast.success('Swap cancelled, funds returned')
      reloadRef.current().catch(consoleError)
    }
  }

  const announceRfq = (swap: RfqSwap) => {
    setLnStates((prev) => new Map(prev).set(swap.rfqId, swap.state))
  }

  const onUpdate = (update: UnifiedSwap) => {
    if (update.family === 'offer') announceOffer(update.swap as WalletAssetSwap)
    else announceRfq(update.swap)
  }

  // ------------------------------------------------------------ the client

  useEffect(() => {
    if (!dataReady || !svcWallet || !aspInfo.url || !aspInfo.network) return
    const network = aspInfo.network as NetworkName
    let stopped = false
    // The lock is released by RETURNING from the callback, never by aborting:
    // per the spec a signal drops a lock request only while it is still
    // pending, so an abort-only cleanup would hold the lock forever and queue
    // the next mount behind it. `svcWallet` changes identity on reinit and
    // unlock (`wallet.tsx`), and StrictMode would double-mount, so this
    // teardown is a live path rather than a page-close curiosity.
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
      // Cleanup ran while the request was still queued and the abort did not
      // beat it. Returning now hands the lock straight on.
      if (stopped) return

      const started = (async () => {
        // One provider for the two reads that are not the client's: the spend
        // lookup below and the cancel reconciliation.
        const indexer = new RestIndexerProvider(aspInfo.url)
        const wrapped = makeSwapClient(svcWallet, network)
        const { client } = wrapped

        client.onUpdate(onUpdate)

        // Fired for every throwing action, including ones the next pass will
        // retry, so the state is only moved for a swap that actually failed.
        client.manager.onSwapFailed((swap, err) => {
          const error = extractError(err)
          consoleError(error, `swap ${swap.rfqId} failed`)
          setLnErrors((prev) => new Map(prev).set(swap.rfqId, error))
          if (swap.state === 'failed') announceRfq(swap)
        })

        client.manager.onSwapCompleted((swap) => {
          announceRfq(swap)
          setLnErrors((prev) => {
            if (!prev.has(swap.rfqId)) return prev
            const next = new Map(prev)
            next.delete(swap.rfqId)
            return next
          })
          // The claim and the refund land through the client's own broadcaster,
          // so the service worker never emits the VTXO_UPDATE the wallet's
          // balance listener waits for. Nothing else would refresh it.
          reloadRef.current().catch(consoleError)
          void recordEnding(indexer, swap)
            .then((spendTxid) => (spendTxid ? reloadRef.current() : undefined))
            .catch((err) => consoleError(err, `error resolving the spend of swap ${swap.rfqId}`))
        })

        // Restores the RFQ half from its own records, arms the offer watcher,
        // and runs the first pass. A record it cannot rebuild is reported by the
        // manager and dropped by the facade rather than stranding the others.
        await client.start()
        return wrapped
      })()

      held.current = started
      grant()
      started.catch((err) => consoleError(extractError(err), 'error starting the swap client'))

      await holding
      await started.then((wrapped) => wrapped.close()).catch(consoleError)
    }

    if (navigator.locks) {
      navigator.locks.request(CLIENT_LOCK, { signal: controller.signal }, drive).catch((err) => {
        // The abort earns its place for exactly one case: a tab that unmounts
        // while its request is still queued. That rejection is the expected
        // outcome, not a failure.
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

    // A tab that slept has passes to catch up on, and every deadline here is
    // absolute — the package's own suggestion for a process that sleeps. A tab
    // still waiting for the lock has no client and polls nothing.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      held.current?.then(({ client }) => client.manager.poll()).catch(consoleError)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      held.current = undefined
      granted.current = undefined
      document.removeEventListener('visibilitychange', onVisible)
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
  const driving = useCallback(async (): Promise<WalletSwapClient> => {
    let pending = held.current
    if (!pending && granted.current) {
      // Waited out rather than answered on the spot: a request of ours that is
      // merely young is indistinguishable from one queued behind another tab,
      // and only one of the two is worth telling the user about.
      await Promise.race([granted.current, new Promise((resolve) => setTimeout(resolve, LOCK_GRACE_MS))])
      pending = held.current
    }
    if (!pending) {
      if (granted.current) throw new SwapsHeldElsewhere()
      throw new Error('the swap client is not running')
    }
    return pending
  }, [])

  // ----------------------------------------------------------- offer swaps

  const createSwap = async (
    market: DiscoveredMarket,
    plan: OfferPlan,
    quote?: AssetSwapQuoteSnapshot,
  ): Promise<WalletAssetSwap> => {
    if (!emulatorPubkey) throw new Error('swap service unavailable')
    const { client } = await driving()
    // The plan the composer has been quoting live is the order; handing it
    // straight to `accept` is what keeps the price the user confirmed and the
    // price funded the same one. `client.quote` would re-price at confirm time.
    const accepted = await client.accept({ kind: 'spot', market, plan })
    if (accepted.family !== 'offer') throw new Error('expected an offer swap')
    const swap = accepted.swap as WalletAssetSwap
    // The one fact the client does not persist, because it does not own it:
    // tickers, decimals, the fee rate and the fiat amount frozen at quote time,
    // which is all the activity row has to render a swap whose market card may
    // have changed since. Written after the record rather than into it — the
    // repository stores records whole, so this merge survives package-side
    // writes (the watcher, cancel) untouched.
    if (quote) {
      const merged = { ...swap, quote }
      applySwaps(await updateAssetSwap(assetSwapRepository, swap.id, { quote } as Partial<Omit<AssetSwap, 'id'>>))
      reloadRef.current().catch(consoleError)
      return merged
    }
    applySwaps(await readSwaps())
    reloadRef.current().catch(consoleError)
    return swap
  }

  const cancelSwap = async (id: string): Promise<void> => {
    const swap = (await readSwaps()).find((s) => s.id === id)
    if (!swap) throw new Error('swap not found')
    const { client } = await driving()
    // leave 'pending' before spending so the watcher can't read the cancel
    // spend as a fulfillment (`cancelOffer` writes the same status through the
    // repository; this one is what the UI sees immediately)
    applySwaps(await updateAssetSwap(assetSwapRepository, id, { status: 'cancelling' }))
    try {
      // ponytail(arkade-os/ts-sdk): the facade calls `cancelOffer` without the
      // record's `swapAddress`, which is what pins the operator key the covenant
      // was built with. Cancel therefore reports a rotated signer key as a
      // rebuild mismatch instead of working through it. Diagnosis, not
      // capability — but the record carries the address and the facade could
      // forward it.
      await client.cancel(swap.fundingTxid)
      // `cancelOffer` records its own outcome when it can match the record,
      // which is what lets the watcher leave our own cancels alone; write it
      // here only if it did not.
      const after = await readSwaps()
      const stored = after.find((candidate) => candidate.id === id)
      if (stored?.status === 'cancelling') {
        applySwaps(await updateAssetSwap(assetSwapRepository, id, { status: 'cancelled' }))
      } else {
        applySwaps(after)
      }
      if (stored?.status !== 'fulfilled') {
        toast.success('Swap cancelled, funds returned')
        reloadRef.current().catch(consoleError)
      }
    } catch (err) {
      // the cancel tx may have broadcast before the failure surfaced; only
      // revert while the deposit is provably unspent, otherwise stay
      // 'cancelling' and let the watcher resolve what the spend was
      try {
        const { vtxos } = await new RestIndexerProvider(aspInfo.url).getVtxos({ scripts: [swap.swapPkScript] })
        const deposit = vtxos.find((v) => v.txid === swap.fundingTxid)
        const state = deposit?.virtualStatus.state
        if (deposit && state === 'spent') {
          if (await resolveCancellingSpend(swap, deposit.arkTxId ?? deposit.spentBy)) return
        } else if (state === 'swept') {
          applySwaps(await updateAssetSwap(assetSwapRepository, id, { status: 'recoverable' }))
          return
        } else if (state && (await readSwaps()).find((c) => c.id === id)?.status === 'cancelling') {
          applySwaps(await updateAssetSwap(assetSwapRepository, id, { status: swap.status }))
        }
      } catch {
        // indexer unreachable: keep 'cancelling'; the watcher resolves it later
      }
      throw err
    }
  }

  const resolveCancellingSpend = async (swap: WalletAssetSwap, spentTxid?: string): Promise<boolean> => {
    if (!svcWallet || !spentTxid) return false
    const spend = (await getTxHistory(svcWallet)).find((tx) =>
      [tx.boardingTxid, tx.redeemTxid, tx.roundTxid].includes(spentTxid),
    )
    if (!spend) return false

    // Re-read after the async history lookup so a completed cancel or the
    // watcher always wins over this reconciliation.
    if ((await readSwaps()).find((candidate) => candidate.id === swap.id)?.status !== 'cancelling') return true
    const cancelled = isCancelSpend(decodeOffer(hex.decode(swap.offerHex)), spend)
    applySwaps(
      await updateAssetSwap(assetSwapRepository, swap.id, {
        status: cancelled ? 'cancelled' : 'fulfilled',
        spentTxid,
        ...(cancelled ? {} : { completedAt: Date.now() }),
      }),
    )
    if (cancelled) toast.success('Swap cancelled, funds returned')
    else toast.success(`Swap completed, ${tickerFor(swap.toAsset)} received`)
    reloadRef.current().catch(consoleError)
    return true
  }

  // ------------------------------------------------------------- lightning

  /** The card's own bounds, checked before a quote is burned and the invoice or
   * the amount is handed to a third party. */
  const withinBounds = (sats: number, corridor: { minSats: number; maxSats: number }) => {
    if (sats < corridor.minSats || sats > corridor.maxSats) {
      throw new Error(
        `Amount outside solver bounds (${prettyNumber(corridor.minSats)}-${prettyNumber(corridor.maxSats)} sats)`,
      )
    }
  }

  const quoteLnSend = async (invoice: string): Promise<LightningSendQuote> => {
    const network = aspInfo.network as NetworkName
    // No emulator URL is looked up here: this corridor needs the co-signer's
    // x-only KEY, never an endpoint. It rides the solver's own card; the
    // per-network pin is passed as the fallback for cards that predate the
    // field (see lnSendCorridor). Neither available yields no corridor.
    const corridor = lnSendCorridor(allMarketsRef.current, getEmulatorPubkeyForNetwork(network))
    if (!corridor) throw new Error('No Lightning solver available')
    // Decoded here rather than inside the client: the wallet's own gates name
    // the reason an invoice is unusable (`InvoiceRejected`), and refusing before
    // the round trip is what keeps an unpayable invoice off a solver's desk.
    const facts = toInvoiceFacts(invoice, network)
    withinBounds(facts.amountSats, corridor)
    const { client } = await driving()
    try {
      const quote = await client.quote(corridor.market, { give: 'base', invoice: facts })
      if (quote.kind !== 'ln_send') throw new Error('expected a lightning send quote')
      return quote
    } catch (err) {
      throw friendlyRfqError(err)
    }
  }

  /**
   * Fund the covenant. That is the whole of the wallet's job.
   *
   * Funding IS acceptance — the protocol has no accept message — so once the
   * covenant is funded the payment is committed and under way: the solver pays
   * the invoice and claims, and if it cannot, the covenant refunds without
   * needing anything further from us.
   */
  const acceptLnSend = async (quote: LightningSendQuote): Promise<string> => {
    const { client, acceptFunding } = await driving()
    const { fundingTxid } = await acceptFunding(() => client.accept(quote))
    if (!fundingTxid) throw new Error('the lockup was not funded')
    return fundingTxid
  }

  const receiveLightning = async (amountSats: number): Promise<AcceptedLnReceive> => {
    const network = aspInfo.network as NetworkName
    // per-network pin as the fallback co-signer key, for solver cards that
    // predate `emulator_pubkey` — the card's own value wins where it has one.
    const corridor = lnReceiveCorridor(allMarketsRef.current, getEmulatorPubkeyForNetwork(network))
    if (!corridor) throw new Error('No Lightning solver available')
    withinBounds(amountSats, corridor)
    const { client } = await driving()
    let quote: LightningReceiveQuote
    try {
      // `amountOn: 'receive'` because the amount the user typed is what they
      // want to RECEIVE; the solver solves the invoice up from it and its fee,
      // so the payer is asked for `payAmount`, which is the larger number.
      const negotiated = await client.quote(corridor.market, {
        give: 'quote',
        amount: amountSats,
        amountOn: 'receive',
      })
      if (negotiated.kind !== 'ln_receive') throw new Error('expected a lightning receive quote')
      quote = negotiated
    } catch (err) {
      throw friendlyRfqError(err)
    }
    // Driven BEFORE the invoice reaches the screen. The payer cannot pay an
    // invoice they have not seen, so this cannot be late — but the ordering is
    // what keeps the monitored set a superset of what is payable.
    const accepted = await client.accept(quote)
    if (accepted.family === 'rfq') announceRfq(accepted.swap)
    const { request } = quote
    return {
      rfqId: request.rfqId,
      invoice: request.invoice,
      payAmount: request.payAmount,
      invoiceExpiresAt: request.invoiceExpiresAt,
    }
  }

  const lnStatus = useCallback((rfqId: string) => lnStates.get(rfqId), [lnStates])
  const lnError = useCallback((rfqId: string) => lnErrors.get(rfqId), [lnErrors])

  const swapAvailable = markets.length > 0 && Boolean(emulatorPubkey)
  const value = useMemo(
    () => ({
      markets,
      swapAvailable,
      swaps,
      runDiscovery,
      createSwap,
      cancelSwap,
      quoteLnSend,
      acceptLnSend,
      receiveLightning,
      lnStatus,
      lnError,
    }),
    // the actions close over these
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markets, swapAvailable, swaps, svcWallet, emulatorPubkey, aspInfo.url, aspInfo.network, lnStatus, lnError],
  )

  return <SwapsContext.Provider value={value}>{children}</SwapsContext.Provider>
}

/** Name the tx that ended a swap, when it is one of ours. Returns it, so the
 * caller refreshes only on something the history can actually show. */
const recordEnding = async (
  indexer: Pick<RestIndexerProvider, 'getVtxos'>,
  swap: RfqSwap,
): Promise<string | undefined> => {
  const record = await readRecord(swap.rfqId)
  if (!record) return undefined
  // The manager stamps `lockupSpendTxids` at finalization, from the chain read
  // that ended the swap, so a terminal record usually answers for itself — and
  // this whole lookup is a network round trip for a permanent fact someone
  // already fetched. The indexer path stays for the record that has no stamp:
  // one written before #773, or a swap whose end we saw some other way.
  const stamped = spendTxidOf(record)
  if (stamped) return stamped
  const fundingTxid = fundingTxidOf(record)
  if (!fundingTxid) return undefined
  const spendTxid = await lockupSpenderTxid(indexer, {
    fundingTxid,
    swapPkScript: hex.encode(swap.lockupPkScript),
  })
  if (!spendTxid) return undefined
  await recordSpendTxid(swap.rfqId, spendTxid)
  return spendTxid
}
