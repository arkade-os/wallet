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
 * **One tab drives; every tab acts.** Two clients over one repository would
 * race `pushClaim` over the same lockup, and while that particular race heals
 * itself on the next pass — the loser reads the winner's preimage out of the
 * spending witness and settles — the record writes around it do not: state and
 * failure are rewritten from whichever tab wrote last, with no version to
 * compare, and the service worker's contract repository is shared. The client
 * claims on behalf of every corridor, so the Web Lock covers the whole client.
 *
 * None of which is a reason to refuse the other tab. Starting a swap is not a
 * race at all — a fresh receive mints its own preimage, rfq id and lockup — so
 * a follower posts the action to the holder over `swapDriverChannel` and the
 * holder runs it against the one live client. `SwapsHeldElsewhere` survives as
 * the last resort, for when no tab answers as the driver at all.
 *
 * It runs page-side rather than in the service worker on the precedent
 * `watchOfferSwaps` set: the worker hosts `MessageBus` and the wallet reaches
 * this side as a `ServiceWorkerWallet` proxy, so moving the client in would mean
 * standing a second wallet up inside it.
 */
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  btcTarget,
  type Asset,
  type ExtendedVirtualCoin,
  type IntentFeeConfig,
  type NetworkName,
  type PaymentRouter,
} from '@arkade-os/sdk'
import { generateSecretKey } from 'nostr-tools'
import { BTC_ASSET_ID, findMarket, ONCHAIN_DUST_SATS } from '@arkade-os/swap/protocol'
import {
  assetSwapIdOf,
  btcOn,
  claimFeeSats,
  isSwapError,
  parseAssetId,
  type AssetId,
  type AssetSwapId,
  type Outcome,
  type OpenRfqAuction,
  type Quote,
  type QuoteInput,
  type Swap,
  type SwapClient,
} from '@arkade-os/swap'
import { fundingWasNotSubmitted, recordOutcome, swapOf, walletLockupIndexer } from '@arkade-os/swap/advanced'
import {
  isRfqMarket,
  marketCorridor,
  sideLimits,
  solverId,
  type DiscoveredMarket,
  type OfferPlan,
} from '@arkade-os/solver-discovery'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { discoverMarkets, marketAssetDisplay, marketLegId, swapAssetId, watchSwapMarkets } from '../lib/swapMarkets'
import { swapRouteEdges } from '../lib/swapRouteMarkets'
import { getSolverCardsVersion, subscribeSolverCards } from '../lib/solverCards'
import { createSendRouter, isLightningMarket } from '../lib/sendRouter'
import { claimFeeRate } from '../lib/claimFee'
import { onchainClaimEndpoint } from '../lib/onchainPayout'
import { toInvoiceFacts } from '../lib/lnSwap'
import { nostrRelayUrls } from '../lib/nostr'
import { newRequestId } from '../lib/requestId'
import { makeSwapClient, SwapsHeldElsewhere } from '../lib/swapClient'
import { isSolverEnabled, subscribeSolverRouting } from '../lib/solverRouting'
import { readOnchainSendPreference, readOpenOfferPolicy } from '../lib/openOfferPolicy'
import {
  assertAssetPaymentQuote,
  assertOpenPaymentQuote,
  lookupLightningPaymentKey,
  paymentAttemptKey,
  paymentQuoteExpiry,
  paymentQuoteInput,
  quoteProviderMarket,
  type AssetPaymentRequest,
  type LightningPaymentRequest,
  type PaymentQuoteRequest,
} from '../lib/paymentQuotes'
import {
  canReplaceMissingPaymentRecord,
  claimPaymentFunding,
  hasConfirmedPaymentRefund,
  PaymentNotSubmitted,
  PaymentRequiresNewInvoice,
  PaymentSubmissionPending,
  type PaymentFundingAttempt,
  readPaymentFunding,
  releasePaymentFunding,
  withPaymentFundingCheckpoint,
  withPaymentFundingLock,
  withPaymentFundingStatus,
} from '../lib/paymentFunding'
import {
  assertConversionQuote,
  conversionFundingKey,
  conversionQuoteInput,
  conversionStatus,
  findConversionPayout,
  selectConversionInputs,
  type ChainedPaymentStatus,
} from '../lib/chainedPayments'
import { assertJoinedQuotes, planSwapRoute, type SwapRoutePlan, type SwapRouteRequest } from '../lib/swapRoutePlan'
import {
  findSwapRoutePayout,
  routeFundingInvoice,
  routeLegStatus,
  routeQuoteLive,
  selectRouteBitcoinInputs,
  swapRouteFamily,
  swapRouteFundingKey,
  swapRouteLegKey,
  swapRoutePointerKey,
  swapRouteScope,
  type SwapRouteProgress,
} from '../lib/swapRouteExecution'
import {
  DriverPromoted,
  DriverUnavailable,
  openDriverChannel,
  type DriverChannel,
  type DriverOp,
  type DriverUpdate,
} from '../lib/swapDriverChannel'
import {
  assetSwapRepository,
  saveQuoteSnapshot,
  type AssetSwapQuoteSnapshot,
  type WalletAssetSwap,
} from '../lib/swapRepository'
import { displayAssetOf, offerSwaps } from '../lib/swapRecords'
import { isValidAssetId } from '../lib/assets'
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
  allMarkets: DiscoveredMarket[]
  /** Spot markets — the ones this wallet builds offers on. */
  markets: DiscoveredMarket[]
  discoveryReady: boolean
  /** True when a supported swap can be composed and its co-signer is configured. */
  swapAvailable: boolean
  swaps: WalletAssetSwap[]
  runDiscovery: (useCache?: boolean) => void
  /** The solver's firm quote for the plan the composer estimated; fund it with `acceptSwapQuote`. */
  quoteExchange: (plan: OfferPlan) => Promise<Quote>
  openSwapQuotes: (
    from: string,
    to: string,
    amount: bigint,
    requestId?: string,
    destination?: string,
  ) => Promise<OpenRfqAuction>
  openPaymentQuotes: (request: PaymentQuoteRequest, requestId: string, consent?: boolean) => Promise<OpenRfqAuction>
  cancelOpenSwapQuotes: (requestId: string) => Promise<void>
  chooseSwapQuote: (auctionId: string, bidId: string) => Promise<Quote>
  acceptSwapQuote: (quote: Quote, snapshot?: AssetSwapQuoteSnapshot) => Promise<Swap>
  quoteAssetPayment: (request: AssetPaymentRequest) => Promise<Quote>
  quotePaymentRoute: (request: PaymentQuoteRequest, solverId?: string) => Promise<Quote>
  paymentRouteCandidates: (request: PaymentQuoteRequest) => Promise<{ id: string; name: string }[]>
  onchainPaymentRouteCandidates: (address: string, amount: number) => Promise<{ id: string; name: string }[]>
  acceptPaymentQuote: (quote: Quote, request: PaymentQuoteRequest, reviewId?: string) => Promise<Swap>
  quoteChainedPayment: (assetId: string, lightning: Quote, request: LightningPaymentRequest) => Promise<Quote>
  startChainedPayment: (
    assetId: string,
    conversion: Quote,
    lightning: Quote,
    request: LightningPaymentRequest,
  ) => Promise<void>
  getChainedPayment: (request: LightningPaymentRequest) => Promise<ChainedPaymentStatus | undefined>
  finishChainedPayment: (lightning: Quote, request: LightningPaymentRequest) => Promise<Swap>
  quoteSwapRoute: (request: SwapRouteRequest) => Promise<SwapRoutePlan>
  startSwapRoute: (id: string) => Promise<SwapRouteProgress>
  advanceSwapRoute: (id: string) => Promise<SwapRouteProgress>
  getSwapRoute: (id: string) => Promise<{ plan: SwapRoutePlan; progress: SwapRouteProgress } | undefined>
  cancelSwap: (id: string) => Promise<void>
  /** Run a recovery round for a swept offer deposit. Resolves with whether THIS
   * deposit went home; throws `SwapDriveRefusedError` (by `name` across tabs) or
   * the round's own error. */
  recoverSwap: (id: string) => Promise<boolean>
  /** Negotiate a payment. Nothing is funded: the pay screen accepts. */
  quotePay: (destination: string) => Promise<Quote>
  /** Fund it — which IS the acceptance. Resolves with the funding txid. */
  acceptPay: (quote: Quote) => Promise<string>
  /** Negotiate a Lightning receive and begin driving it, in that order. */
  receiveLightning: (amountSats: number) => Promise<AcceptedLnReceive>
  /** The send path's router. Throws `SwapsHeldElsewhere` rather than dropping
   * the solver rails and offboarding through the costlier exit. `swapsOptional`
   * opts out for a caller with no exit rail to fall to (LNURL): a tab not driving
   * the swap client gets a router without the solver rails instead.
   * `exitOnly` prepares the explicitly selected collaborative exit. */
  sendRouter: (deps?: {
    outputFee?: () => number
    intentFee?: () => IntentFeeConfig | undefined
    assets?: Asset[]
    swapsOptional?: boolean
    exitOnly?: boolean
    onchainSolverId?: string
  }) => Promise<PaymentRouter>
  /** Where a driven swap stands, or undefined when it is not monitored. */
  outcomeOf: (id: string) => Outcome | undefined
  /** The last error reported for one, cleared when it ends. */
  errorOf: (id: string) => string | undefined
}

const notInitialized = async (): Promise<never> => {
  throw new Error('swaps not initialized')
}

export const SwapsContext = createContext<SwapsContextProps>({
  allMarkets: [],
  markets: [],
  discoveryReady: false,
  swapAvailable: false,
  swaps: [],
  runDiscovery: () => {
    throw new Error('swaps not initialized')
  },
  quoteExchange: notInitialized,
  openSwapQuotes: notInitialized,
  openPaymentQuotes: notInitialized,
  cancelOpenSwapQuotes: notInitialized,
  chooseSwapQuote: notInitialized,
  acceptSwapQuote: notInitialized,
  quoteAssetPayment: notInitialized,
  quotePaymentRoute: notInitialized,
  paymentRouteCandidates: notInitialized,
  onchainPaymentRouteCandidates: notInitialized,
  acceptPaymentQuote: notInitialized,
  quoteChainedPayment: notInitialized,
  startChainedPayment: notInitialized,
  getChainedPayment: async () => undefined,
  finishChainedPayment: notInitialized,
  quoteSwapRoute: notInitialized,
  startSwapRoute: notInitialized,
  advanceSwapRoute: notInitialized,
  getSwapRoute: async () => undefined,
  cancelSwap: notInitialized,
  recoverSwap: notInitialized,
  quotePay: notInitialized,
  acceptPay: notInitialized,
  receiveLightning: notInitialized,
  sendRouter: notInitialized,
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

/**
 * How long the first history load waits on this tab's swap client before going
 * ahead without it. Usually the lock is granted and the restore is a local read
 * well inside this; neither holds when another tab owns the client, or on the
 * first restore after an upgrade.
 */
const FIRST_LOAD_GRACE_MS = 3_000

/** Matched by `name`, the part that crosses tabs, so the swap screen re-quotes instead of retrying it. */
class QuoteUnavailable extends Error {
  constructor() {
    super('This quote is no longer available — refresh to try again')
    this.name = 'QuoteUnavailable'
  }
}

/** Whether the trader is paying OUT. `paid` and `claimed` are how BOTH
 *  directions succeed, so every send announced itself as money received; only a
 *  receive takes delivery inside Arkade. Optional so `announce` cannot throw. */
const isSendLeg = (swap: Swap): boolean => {
  const takes = swap.route?.take
  return Boolean(takes && (takes.corridor !== 'arkade' || (swap.assetPayment && takes.instrument.kind === 'address')))
}

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
  const {
    dataReady,
    svcWallet,
    wallet,
    reloadWallet,
    setAssetSwaps,
    isVerifiedAsset,
    availableAssetBalances,
    availableBalance,
    assetMetadataCache,
    setCacheEntry,
  } = useContext(WalletContext)

  const [markets, setMarkets] = useState<DiscoveredMarket[]>([])
  const cardsVersion = useSyncExternalStore(subscribeSolverCards, getSolverCardsVersion, getSolverCardsVersion)
  const discoveryScope = useMemo(() => ({ network: aspInfo.network, cardsVersion }), [aspInfo.network, cardsVersion])
  const discoveryScopeRef = useRef(discoveryScope)
  discoveryScopeRef.current = discoveryScope
  const [settledDiscoveryScope, setSettledDiscoveryScope] = useState<typeof discoveryScope>()
  const discoveryReady = Boolean(aspInfo.network && settledDiscoveryScope === discoveryScope)
  const [emulatorPubkey, setEmulatorPubkey] = useState<Uint8Array>()
  const [swaps, setSwaps] = useState<WalletAssetSwap[]>([])
  const [outcomes, setOutcomes] = useState<Map<string, Outcome>>(new Map())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  /** False until the running client's restore has finished, reset per client. */
  const restoredRef = useRef(false)

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
  const dataReadyRef = useRef(dataReady)
  dataReadyRef.current = dataReady

  // Assigned only once the Web Lock is HELD, which is what lets an action tell
  // "another tab owns this" from "the client is not running" — see `driving`.
  const held = useRef<Promise<SwapClient>>()
  // Resolves when this tab's own request is granted, so an action can wait out
  // the grant rather than mistake it for a lock held elsewhere.
  const granted = useRef<Promise<void>>()

  // One channel per provider, not per module: a BroadcastChannel never delivers
  // to the instance that posted, so two providers standing in for two tabs need
  // two of them. Lazily built, and closed with the provider.
  const channelRef = useRef<DriverChannel>()
  const channel = (channelRef.current ??= openDriverChannel())
  useEffect(() => () => channel.close(), [channel])

  /**
   * Quotes this tab has issued, for the accept that follows.
   *
   * `client.accept` resolves the quote's *preparation* from an in-memory map
   * the client fills during `quote()`, so a quote that crossed the channel
   * carries a valid id and nothing the accept can use. The holder therefore
   * accepts its OWN quote object and a follower sends only the id — which also
   * keeps the one path that spends money clear of any question about what
   * survives a structured clone.
   *
   * Pruned on the quote's own deadline: an expired quote cannot be accepted, so
   * holding it would only grow the map.
   */
  const issued = useRef(new Map<string, Quote>())
  const plannedRoutes = useRef(new Map<string, SwapRoutePlan>())
  const auctions = useRef(new Map<string, OpenRfqAuction>())
  const auctionRequests = useRef(new Map<string, AbortController>())
  useEffect(
    () => () => {
      for (const controller of auctionRequests.current.values()) controller.abort()
      auctionRequests.current.clear()
      auctions.current.clear()
      issued.current.clear()
      plannedRoutes.current.clear()
    },
    [aspInfo.network, svcWallet],
  )

  /** Re-read the client's records. Cheap, and the only way a record written
   * outside a React update reaches the list. */
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
  const discoveryNetworkRef = useRef<string>()
  const discoveryRequest = useRef(0)
  const setAllMarkets = (all: DiscoveredMarket[]) => {
    allMarketsRef.current = all
    // Corridor (RFQ) markets are hidden from the offer composer: `quoteExchange`
    // builds offers, and a corridor is negotiated with a solver instead.
    // Keeping them here would let one Lightning card turn the whole swap
    // surface on with nothing behind it. `isRfqMarket` reads the rail off the
    // asset id, so a canonical card with no `quote_corridor` field still hides.
    // Left in, it also breaks pairing for the rest: `findMarket` resolves the
    // wallet's `btc` against the first BTC leg it meets, and the bundled card's
    // canonical `arkade:bitcoin/slip44:0` then misses every legacy `btc` market.
    setMarkets(all.filter((m) => !isRfqMarket(m)))
  }

  const runDiscovery = (useCache = true) => {
    if (!aspInfo.network) return
    const network = aspInfo.network as NetworkName
    const scope = discoveryScope
    const request = ++discoveryRequest.current
    setSettledDiscoveryScope(undefined)
    discoverMarkets(network, useCache)
      .then((all) => {
        if (discoveryScopeRef.current !== scope || discoveryRequest.current !== request) return
        setAllMarkets(all)
        setSettledDiscoveryScope(scope)
      })
      .catch((err) => consoleError(err, 'solver discovery failed'))
    setEmulatorPubkey(getEmulatorPubkeyForNetwork(network))
  }

  useEffect(() => {
    if (discoveryNetworkRef.current !== aspInfo.network) {
      discoveryNetworkRef.current = aspInfo.network
      setEmulatorPubkey(undefined)
      setAllMarkets([])
    }
    if (!aspInfo.network) return
    const network = aspInfo.network as NetworkName
    const scope = discoveryScope
    let active = true
    setEmulatorPubkey(getEmulatorPubkeyForNetwork(network))
    const stop = watchSwapMarkets(network, (all) => {
      if (!active || discoveryScopeRef.current !== scope) return
      setAllMarkets(all)
      setSettledDiscoveryScope(scope)
    })
    return () => {
      active = false
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveryScope])

  // Reload names the assets the wallet holds or has traded; a market can offer
  // one it has never seen, and its card's own name for it is solver-written.
  // ponytail: one request per leg per session, no retry; master's bounded prefetch (#1152) should own this on merge.
  const metadataRequested = useRef(new Set<string>())
  useEffect(() => {
    const assets = svcWallet?.assetManager
    if (!assets) return
    const legs = new Set(markets.flatMap((market) => [market.base_asset, market.quote_asset].map(marketLegId)))
    for (const id of legs) {
      if (!isValidAssetId(id) || assetMetadataCache.get(id) || metadataRequested.current.has(id)) continue
      metadataRequested.current.add(id)
      assets.getAssetDetails(id).then(
        (details) => details && setCacheEntry(id, details),
        (err) => consoleError(err, `error fetching metadata for ${id}`),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcWallet, markets])

  // ------------------------------------------------------------- the announcer

  const tickerFor = (assetId: AssetId): string => {
    const display = displayAssetOf(assetId)
    if (display === BTC_ASSET_ID) return 'sats'
    const leg = allMarketsRef.current
      .flatMap((market) => [market.base_asset, market.quote_asset])
      .find((asset) => marketLegId(asset) === display)
    const unknown = { id: display, name: display.slice(0, 8), ticker: display.slice(0, 8), decimals: 0 }
    return marketAssetDisplay(
      leg ?? unknown,
      aspInfo.network,
      (id) => assetMetadataCache.get(id)?.metadata,
      isVerifiedAsset,
    ).ticker
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
  const announce = (swap: Swap, replay = false) => {
    setOutcomes((prev) => (prev.get(swap.id) === swap.outcome ? prev : new Map(prev).set(swap.id, swap.outcome)))
    const ended = ENDED[swap.outcome]
    if (!ended) return
    setErrors((prev) => {
      if (!prev.has(swap.id)) return prev
      const next = new Map(prev)
      next.delete(swap.id)
      return next
    })
    // `restore()` ends by emitting every record it read, and this subscribes
    // before `client.ready`, so each load replayed the whole history terminal.
    if (replay) return
    if (ended === 'received')
      toast.success(isSendLeg(swap) ? 'Payment complete' : `Swap completed, ${tickerFor(swap.take.asset)} received`)
    else if (ended === 'returned') toast.success('Swap cancelled, funds returned')
    else toast.error(isSendLeg(swap) ? 'Payment did not complete' : 'Lightning payment was not received')
    // The claim and the refund land through the client's own broadcaster, so
    // the service worker never emits the VTXO_UPDATE the balance listener waits
    // for. Nothing else would refresh it. Behind the same gate: a restore
    // reporting fifty old swaps would otherwise reload the wallet fifty times.
    void refreshSwaps()
    reloadRef.current().catch(consoleError)
  }

  /**
   * Announce a swap this tab just drove, and tell the other tabs about it.
   *
   * The three actions that create or move a swap learn its first outcome from
   * their own return value rather than from `onUpdate`, so without this the
   * tab that ASKED for the swap would see nothing until the client's next
   * update — on the one swap it is most likely to be watching. Only the driver
   * reaches these, which is what makes publishing from here safe: a follower
   * applies what it receives and never re-posts it.
   */
  const announceHere = (swap: Swap) => {
    announce(swap)
    channel.publish({ swap, outcome: swap.outcome })
  }

  /**
   * What one update does to this tab, wherever it came from.
   *
   * The holder learns these from its client and every other tab from the
   * channel, and both have the same work to do: `outcomes` and `errors` are
   * per-tab in-memory maps, and they are what the receive screen renders a lost
   * payment and a failing claim from. A follower that could start a receive but
   * never hear how it ended would be a worse place to be paid than the one this
   * replaces.
   *
   * Every tab announces, deliberately. The tab that started a receive is
   * usually not the tab holding the lock, and it is the one being looked at.
   */
  const applyUpdate = ({ swap, outcome, replay }: DriverUpdate) => {
    announce(swap, replay)
    if (outcome !== 'needs_recovery' && outcome !== 'failed') return
    const reason = swap.failure ?? swap.blockedReason
    if (reason) setErrors((prev) => new Map(prev).set(swap.id, reason))
  }

  // Read through a ref for the same reason the reload is: the subscription is
  // made once and must reach the current maps and market list.
  const applyRef = useRef(applyUpdate)
  applyRef.current = applyUpdate

  useEffect(() => channel.subscribe((update) => applyRef.current(update)), [channel])

  // ------------------------------------------------------------ the client

  useEffect(() => {
    if (!svcWallet || !aspInfo.url || !aspInfo.network) return
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
    let stopServing = () => {}
    const controller = new AbortController()

    // The first history load lives in `drive`, which runs only once the lock is
    // granted — and while another tab holds it, that is never. Nor is the
    // restore it waits on bounded: the first one after an upgrade scans the
    // whole history against the indexer. Past the grace, load without it; the
    // load in `drive` still runs whenever the restore lands.
    const firstLoad = setTimeout(() => {
      if (!stopped && !dataReadyRef.current) reloadRef.current().catch(consoleError)
    }, FIRST_LOAD_GRACE_MS)

    const drive = async () => {
      if (stopped) return
      // Per CLIENT, not per tab: a network switch builds a new one that replays.
      restoredRef.current = false

      const started = (async () => {
        const client = makeSwapClient(svcWallet, network)
        client.onUpdate(({ swap, outcome }) => {
          const replay = !restoredRef.current
          applyRef.current({ swap, outcome, replay })
          // Only the holder has a client, so this is the only place the other
          // tabs can learn an outcome from.
          channel.publish({ swap, outcome, replay })
        })
        // `drive: "auto"`: construction restores and arms only when the read
        // finds live swaps. `ready` is that read, and it rejects only when the
        // repository itself is unreadable — a client that cannot read its own
        // records cannot drive them safely. History still loads in `finally`
        // so a failed restore cannot pin the app on the loading screen.
        try {
          await client.ready
          restoredRef.current = true
        } finally {
          await reloadRef.current().catch(consoleError)
        }
        return client
      })()

      held.current = started
      grant()
      started.catch((err) => consoleError(extractError(err), 'error starting the swap client'))

      // Serving starts HERE, before `client.ready` has resolved, and that is
      // the point: the ack a follower waits on is what tells it a driver
      // exists, and it must not be gated on how long this tab takes to restore
      // its records. The action itself still awaits the client through
      // `driving()`, so an early request waits rather than races.
      stopServing = channel.serve((op, args) => serveRef.current(op, args))

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
      clearTimeout(firstLoad)
      for (const pending of auctionRequests.current.values()) pending.abort()
      auctionRequests.current.clear()
      auctions.current.clear()
      issued.current.clear()
      held.current = undefined
      granted.current = undefined
      // Stop answering BEFORE the lock is released, so the window where this
      // tab has given up the client but would still ack for a new request does
      // not exist. An answer already in flight is not cancelled — it was acked,
      // and the asker is waiting on it — so it finishes and reports, which for
      // an action that had not reached the client yet is the honest "not
      // running". Whichever lands first, the asker's own grant is racing it.
      stopServing()
      controller.abort()
      release()
    }
    // `cardsVersion` too: the client takes its discovery options once, pinned
    // cards included, so one built before a card was pinned routes without it,
    // and its cache writes overwrite the entry the market read above serves
    // from. Rebuilding is the same stop and restore an unlock goes through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcWallet, aspInfo.url, aspInfo.network, cardsVersion])

  /**
   * The client, for the tab that holds it.
   *
   * Only ever reached from `runHere`, which has already established that this
   * tab is the driver, so the throws below are guards rather than paths the UI
   * takes: `runOnDriver` is where "another tab has it" is answered, and it
   * answers by delegating rather than by failing.
   */
  const driving = useCallback(async (): Promise<SwapClient> => {
    const pending = held.current
    if (!pending) throw new Error('the swap client is not running')
    return pending
  }, [])

  // ------------------------------------------------------- who runs an action

  /**
   * Run an action on whichever tab holds the client.
   *
   * The three answers, in the order they are told apart:
   *
   * 1. **We hold it** — run here, exactly as before, no channel involved. The
   *    grace wait is what makes this the answer for the common case: a request
   *    of ours that is merely young is indistinguishable from one queued behind
   *    another tab, and a remount queues behind this same tab's previous client
   *    while it stops.
   * 2. **Nobody can hold it** — no Web Locks, so every tab drives its own
   *    client and there is no holder to ask.
   * 3. **Another tab holds it** — post the action and wait. Racing the ask
   *    against our own grant is what covers the holder closing mid-request:
   *    the queued lock request we already have is granted, this tab becomes the
   *    driver, and the action re-runs here rather than waiting on a tab that is
   *    gone.
   *
   * `here` exists for the one action whose local and remote forms differ: an
   * accept passes the quote object when it runs here and only its id when it
   * does not. Everything else runs from `args` either way.
   */
  const runOnDriver = async <T,>(op: DriverOp, args: unknown[], here?: () => Promise<T>): Promise<T> => {
    const locally = () => (here ? here() : (runHere(op, args) as Promise<T>))
    if (!navigator.locks) return locally()
    if (!held.current && granted.current) {
      await Promise.race([granted.current, new Promise((resolve) => setTimeout(resolve, LOCK_GRACE_MS))])
    }
    if (held.current) return locally()
    if (!granted.current) throw new Error('the swap client is not running')
    try {
      return await channel.ask<T>(op, args, granted.current)
    } catch (err) {
      if (err instanceof DriverPromoted) return locally()
      // The one case left: no tab answered at all. Nothing is driving these
      // swaps, which is the only thing `SwapsHeldElsewhere` still means.
      if (err instanceof DriverUnavailable) throw new SwapsHeldElsewhere()
      throw err
    }
  }

  /** The other side of the same seam: what the holder does with a request,
   * whether it came from this tab or over the channel. */
  const runHere = (op: DriverOp, args: unknown[]): Promise<unknown> => {
    switch (op) {
      case 'quoteExchange':
        return quoteExchangeHere(args[0] as OfferPlan)
      case 'openSwapQuotes':
        return openSwapQuotesHere(
          args[0] as string,
          args[1] as string,
          args[2] as bigint,
          args[3] as string,
          args[4] as string | undefined,
        )
      case 'cancelOpenSwapQuotes':
        auctionRequests.current.get(args[0] as string)?.abort()
        return Promise.resolve()
      case 'openPaymentQuotes':
        return openPaymentQuotesHere(args[0] as PaymentQuoteRequest, args[1] as string, args[2] === true)
      case 'chooseSwapQuote':
        return chooseSwapQuoteHere(args[0] as string, args[1] as string)
      case 'acceptSwapQuote':
        return acceptSwapQuoteHere(args[0] as string, args[1] as AssetSwapQuoteSnapshot | undefined)
      case 'quoteAssetPayment':
        return quotePaymentRouteHere({ ...(args[0] as AssetPaymentRequest), kind: 'asset' })
      case 'quotePaymentRoute':
        return quotePaymentRouteHere(args[0] as PaymentQuoteRequest, args[1] as string | undefined)
      case 'paymentRouteCandidates':
        return paymentRouteCandidatesHere(args[0] as PaymentQuoteRequest)
      case 'acceptPaymentQuote':
        return acceptPaymentQuoteHere(args[0] as string, args[1] as PaymentQuoteRequest, args[2] as string | undefined)
      case 'quoteChainedPayment':
        return quoteChainedPaymentHere(args[0] as string, args[1] as string, args[2] as LightningPaymentRequest)
      case 'startChainedPayment':
        return startChainedPaymentHere(
          args[0] as string,
          args[1] as string,
          args[2] as string,
          args[3] as LightningPaymentRequest,
        )
      case 'finishChainedPayment':
        return finishChainedPaymentHere(args[0] as string, args[1] as LightningPaymentRequest)
      case 'quoteSwapRoute':
        return quoteSwapRouteHere(args[0] as SwapRouteRequest)
      case 'startSwapRoute':
        return runSwapRouteHere(args[0] as string, true)
      case 'advanceSwapRoute':
        return runSwapRouteHere(args[0] as string, false)
      case 'cancelSwap':
        return cancelSwapHere(args[0] as string)
      case 'recoverSwap':
        return recoverSwapHere(args[0] as string)
      case 'quotePay':
        return quotePayHere(args[0] as string)
      case 'acceptPay':
        return acceptPayHere(args[0] as string)
      case 'receiveLightning':
        return receiveLightningHere(args[0] as number)
      default:
        // Unreachable from our own code, and the point is that it stays that
        // way for a message off the channel too: same origin is not the same
        // build, so a tab running an older bundle can name an op this one has
        // never heard of. Refusing says so instead of resolving with nothing.
        return Promise.reject(new Error(`unknown swap action: ${String(op)}`))
    }
  }

  // The serving handler is installed once, inside the lock, and must reach the
  // current actions rather than the ones the first render closed over.
  const serveRef = useRef(runHere)
  serveRef.current = runHere

  // ----------------------------------------------------------- asset swaps

  /** The market is the client's to select, so only the plan reaches the tab that will fund this. */
  const quoteExchange = (plan: OfferPlan): Promise<Quote> => runOnDriver('quoteExchange', [plan])

  const openSwapQuotes = (
    from: string,
    to: string,
    amount: bigint,
    requestId: string = newRequestId(),
    destination?: string,
  ): Promise<OpenRfqAuction> => runOnDriver('openSwapQuotes', [from, to, amount, requestId, destination])

  const openPaymentQuotes = (
    request: PaymentQuoteRequest,
    requestId: string,
    consent = false,
  ): Promise<OpenRfqAuction> => runOnDriver('openPaymentQuotes', [request, requestId, consent])

  const cancelOpenSwapQuotes = (requestId: string): Promise<void> => runOnDriver('cancelOpenSwapQuotes', [requestId])

  const openSwapQuotesHere = async (
    from: string,
    to: string,
    amount: bigint,
    requestId: string,
    destination?: string,
  ): Promise<OpenRfqAuction> => {
    if (amount <= 0n) throw new Error('Enter an amount greater than zero')
    const network = aspInfo.network as NetworkName
    return openAuction(
      {
        give: swapAssetId(network, from),
        take: swapAssetId(network, to),
        amount,
        amountOn: 'give',
        ...(destination ? { to: destination } : {}),
      },
      requestId,
      from,
      to,
      true,
    )
  }

  const openPaymentQuotesHere = async (
    request: PaymentQuoteRequest,
    requestId: string,
    consent: boolean,
  ): Promise<OpenRfqAuction> => {
    const network = aspInfo.network as NetworkName
    const input = paymentQuoteInput(request, network)
    return openAuction(input, requestId, btcOn('arkade', network), input.take ?? btcOn('bolt11', network), consent)
  }

  const openAuction = async (
    input: QuoteInput,
    requestId: string,
    from: string,
    to: string,
    consent: boolean,
  ): Promise<OpenRfqAuction> => {
    const canSearch = () => {
      const policy = readOpenOfferPolicy(aspInfo.network)
      return policy !== 'off' && (policy === 'when-needed' || consent)
    }
    if (!canSearch()) throw new Error('Allow open offers before searching')
    auctionRequests.current.get(requestId)?.abort()
    const controller = new AbortController()
    auctionRequests.current.set(requestId, controller)
    const unsubscribe = subscribeSolverRouting(() => {
      if (!canSearch()) controller.abort()
    })
    try {
      const client = await driving()
      controller.signal.throwIfAborted()
      if (!canSearch()) throw new Error('Allow open offers before searching')
      const serves = (market: DiscoveredMarket) => Boolean(findMarket([market], from, to)?.market)
      // The pair's own cards go first so unrelated ones cannot use up the 16 slots.
      const cards = [...allMarketsRef.current.filter(serves), ...allMarketsRef.current.filter((m) => !serves(m))]
      const relays = [
        ...new Set(
          [...nostrRelayUrls, ...cards.flatMap((market) => market.transports?.nostr?.relays ?? [])].flatMap((value) => {
            // Cards are solver-written: one malformed relay must not cancel the request.
            try {
              const url = new URL(value)
              if (url.protocol === 'http:') url.protocol = 'ws:'
              if (url.protocol === 'https:') url.protocol = 'wss:'
              return url.protocol === 'ws:' || url.protocol === 'wss:' ? [url.href] : []
            } catch {
              return []
            }
          }),
        ),
      ].slice(0, 16)
      const auction = await client.openRfq(input, { secretKey: generateSecretKey(), signal: controller.signal, relays })
      controller.signal.throwIfAborted()
      const now = Math.floor(Date.now() / 1000)
      for (const [id, kept] of auctions.current) {
        if (kept.bids.every((bid) => bid.expiresAt <= now)) auctions.current.delete(id)
      }
      if (auctions.current.size >= 16) auctions.current.delete(auctions.current.keys().next().value!)
      auctions.current.set(auction.id, auction)
      return auction
    } finally {
      unsubscribe()
      if (auctionRequests.current.get(requestId) === controller) auctionRequests.current.delete(requestId)
    }
  }

  const chooseSwapQuote = (auctionId: string, bidId: string): Promise<Quote> =>
    runOnDriver('chooseSwapQuote', [auctionId, bidId])

  const chooseSwapQuoteHere = async (auctionId: string, bidId: string): Promise<Quote> => {
    const issuer = held.current
    const client = await driving()
    if (readOpenOfferPolicy(aspInfo.network) === 'off') throw new Error('Open offers are turned off')
    const auction = auctions.current.get(auctionId)
    const bid = auction?.bids.find((offer) => offer.id === bidId)
    if (!auction || !bid) throw new Error('These offers are no longer available — refresh to try again')
    const quote = await client.quoteBid(auction, bid)
    if (held.current !== issuer) throw new QuoteUnavailable()
    remember(quote)
    return quote
  }

  const acceptSwapQuote = (quote: Quote, snapshot?: AssetSwapQuoteSnapshot): Promise<Swap> =>
    runOnDriver('acceptSwapQuote', [quote.id, snapshot])

  const acceptPaymentQuote = (quote: Quote, request: PaymentQuoteRequest, reviewId?: string): Promise<Swap> =>
    runOnDriver('acceptPaymentQuote', [quote.id, request, reviewId])

  const quoteChainedPayment: SwapsContextProps['quoteChainedPayment'] = (assetId, lightning, request) =>
    runOnDriver('quoteChainedPayment', [assetId, lightning.id, request])

  const startChainedPayment: SwapsContextProps['startChainedPayment'] = (assetId, conversion, lightning, request) =>
    runOnDriver('startChainedPayment', [assetId, conversion.id, lightning.id, request])

  const finishChainedPayment: SwapsContextProps['finishChainedPayment'] = (lightning, request) =>
    runOnDriver('finishChainedPayment', [lightning.id, request])

  const quoteSwapRoute: SwapsContextProps['quoteSwapRoute'] = (request) => runOnDriver('quoteSwapRoute', [request])
  const startSwapRoute: SwapsContextProps['startSwapRoute'] = (id) => runOnDriver('startSwapRoute', [id])
  const advanceSwapRoute: SwapsContextProps['advanceSwapRoute'] = (id) => runOnDriver('advanceSwapRoute', [id])

  const acceptSwapQuoteHere = async (id: string, snapshot?: AssetSwapQuoteSnapshot): Promise<Swap> => {
    const client = await driving()
    const quote = issued.current.get(id)
    // Deliberate: a quote lives only in the client that derived it, which refuses to accept
    // another's. After a lock handoff the user quotes again; it is short-lived, so little is lost.
    if (!quote) throw new QuoteUnavailable()
    if (quote.auction && readOpenOfferPolicy(aspInfo.network) === 'off') throw new Error('Open offers are turned off')
    const swap = await client.accept(quote, { validUntil: paymentQuoteExpiry(quote) })
    issued.current.delete(id)
    if (snapshot) {
      try {
        saveQuoteSnapshot(swap.id, snapshot)
      } catch (err) {
        consoleError(err, 'failed to store the swap quote snapshot')
      }
    }
    announceHere(swap)
    await refreshSwaps()
    reloadRef.current().catch(consoleError)
    return swap
  }

  const quoteAssetPayment = (request: AssetPaymentRequest): Promise<Quote> =>
    runOnDriver('quoteAssetPayment', [request])

  const assertPaymentQuote = (quote: Quote, request: PaymentQuoteRequest, network: NetworkName): void => {
    if (quote.auction && readOpenOfferPolicy(network) === 'off') throw new Error('Open offers are turned off')
    if (request.kind === 'asset') assertAssetPaymentQuote(quote, request, network)
    else assertOpenPaymentQuote(quote, request, network)
  }

  const quotePaymentRoute = (request: PaymentQuoteRequest, preferredId?: string): Promise<Quote> =>
    runOnDriver('quotePaymentRoute', [request, preferredId])

  const paymentRouteCandidates = (request: PaymentQuoteRequest): Promise<{ id: string; name: string }[]> =>
    runOnDriver('paymentRouteCandidates', [request])

  const routeCandidates = async (client: SwapClient, input: QuoteInput) => {
    const candidates = await client.candidates(input)
    const ranked = candidates.filter(({ backend }) => backend === 'rfq')
    return [...new Map(ranked.map(({ solverId: id, card }) => [id, { id, name: card.solver }])).values()]
  }

  const paymentRouteCandidatesHere = async (request: PaymentQuoteRequest) =>
    routeCandidates(await driving(), paymentQuoteInput(request, aspInfo.network as NetworkName))

  const onchainPaymentRouteCandidates = async (address: string, amount: number) => {
    const to = btcTarget(address)
    const issuer = held.current
    if (!to || !Number.isSafeInteger(amount) || BigInt(amount) < ONCHAIN_DUST_SATS || !issuer) return []
    const [client, claimFeeRateSatVb] = await Promise.all([
      issuer,
      claimFeeRate(onchainClaimEndpoint(aspInfo.network as NetworkName)),
    ])
    if (!claimFeeRateSatVb || held.current !== issuer) return []
    const candidates = await routeCandidates(client, {
      to,
      amount: BigInt(amount) + claimFeeSats({ claimFeeRateSatVb }),
      amountOn: 'take',
    })
    return held.current === issuer ? candidates : []
  }

  const quotePaymentRouteHere = async (request: PaymentQuoteRequest, preferredId?: string): Promise<Quote> => {
    const network = aspInfo.network as NetworkName
    const issuer = held.current
    const client = await driving()
    const input = paymentQuoteInput(request, network)
    const quote = await (preferredId ? client.quote(input, { solverId: preferredId }) : client.quote(input))
    if (held.current !== issuer) throw new QuoteUnavailable()
    assertPaymentQuote(quote, request, network)
    if (preferredId) {
      const provider = quoteProviderMarket(quote)
      if (!provider || solverId(provider, network) !== preferredId)
        throw new Error('The selected provider did not quote this payment')
    }
    remember(quote)
    return quote
  }

  const reviewedLightning = (id: string, request: LightningPaymentRequest, network: NetworkName) => {
    const quote = issued.current.get(id)
    if (!quote) throw new QuoteUnavailable()
    assertPaymentQuote(quote, request, network)
    return quote
  }

  const quoteSwapRouteHere = async (request: SwapRouteRequest) => {
    if (!navigator.locks || !wallet.pubkey) throw new Error('Swap routes are unavailable for this wallet')
    const network = aspInfo.network as NetworkName
    const issuer = held.current
    const client = await driving()
    const plan = await planSwapRoute(newRequestId(), request, swapRouteEdges(allMarketsRef.current, network), (input) =>
      client.quote(input),
    )
    if (held.current !== issuer) throw new QuoteUnavailable()
    plan.quotes.forEach(remember)
    const now = Math.floor(Date.now() / 1000)
    for (const [id, previous] of plannedRoutes.current) {
      if (previous.expiresAt <= now) plannedRoutes.current.delete(id)
    }
    plannedRoutes.current.set(plan.id, plan)
    return plan
  }

  const routeKeys = (id: string) => {
    if (!wallet.pubkey || !id) throw new Error('Swap route wallet is unavailable')
    const scope = swapRouteScope(aspInfo.network, wallet.pubkey)
    return { scope, key: swapRouteFundingKey(scope, id), ownerKey: swapRouteFundingKey(scope, 'active') }
  }

  const readSwapRouteProgress = async (key: string, plan: SwapRoutePlan, guarded: boolean) => {
    for (let step = plan.quotes.length - 1; step >= 0; step -= 1) {
      const quote = plan.quotes[step]
      const attempt = await readPaymentFunding(swapRouteLegKey(key, step))
      if (!attempt) continue
      const record = await assetSwapRepository.getSwapRecord(quote.id)
      let progress: SwapRouteProgress = { phase: 'waiting', step, swapId: attempt.swapId }
      if (!record) {
        if (canReplaceMissingPaymentRecord(attempt, guarded)) continue
        if (!routeQuoteLive(quote))
          return { progress: { ...progress, phase: 'stopped' as const, reason: 'recovery' as const } }
        return { progress }
      }
      if (
        record.id !== quote.id ||
        record.take.asset !== quote.take.asset ||
        record.take.amount !== String(quote.take.amount)
      ) {
        return { progress: { ...progress, phase: 'stopped' as const, reason: 'recovery' as const } }
      }
      const state = routeLegStatus(record)
      if (state === 'waiting') {
        if (record.family === 'rfq' && plan.expiresAt <= Math.floor(Date.now() / 1000)) {
          return { progress: { ...progress, phase: 'stopped' as const, reason: 'expired' as const } }
        }
        if (record.family === 'offer' && !record.fundingTxid && !routeQuoteLive(quote)) {
          return { progress: { ...progress, phase: 'stopped' as const, reason: 'recovery' as const } }
        }
        return { progress: { ...progress, invoice: routeFundingInvoice(record, plan) } }
      }
      if (state !== 'settled') return { progress: { ...progress, phase: 'stopped' as const, reason: state } }
      const next = plan.quotes[step + 1]
      if (!next) return { progress: { ...progress, phase: 'complete' as const } }
      if (!routeQuoteLive(next)) {
        return { progress: { ...progress, phase: 'stopped' as const, reason: 'expired' as const } }
      }
      const payout =
        svcWallet && (await findSwapRoutePayout(svcWallet, record, next, aspInfo.vtxoMinAmount).catch(() => undefined))
      if (payout) progress = { ...progress, phase: 'ready', step: step + 1 }
      return { progress, payout }
    }
    const progress: SwapRouteProgress =
      plan.expiresAt > Math.floor(Date.now() / 1000)
        ? { phase: 'ready', step: 0 }
        : { phase: 'stopped', step: 0, reason: 'expired' }
    return { progress }
  }

  const getSwapRoute: SwapsContextProps['getSwapRoute'] = async (id) => {
    const { key, ownerKey } = routeKeys(id)
    return withPaymentFundingStatus(ownerKey, async (guarded) => {
      const prior = await readPaymentFunding(key)
      if (!prior?.route) {
        if (!guarded && navigator.locks) throw new PaymentSubmissionPending(id)
        return undefined
      }
      const plan = prior.route
      const progress = prior.routeStop ?? (await readSwapRouteProgress(key, plan, guarded)).progress
      return { plan, progress }
    })
  }

  const runSwapRouteHere = async (id: string, start: boolean): Promise<SwapRouteProgress> => {
    const { scope, key, ownerKey } = routeKeys(id)
    return withPaymentFundingLock(ownerKey, async (guarded) => {
      if (!guarded) throw new Error('Swap routes require browser support for coordinating wallet tabs')
      const issuer = held.current
      const client = await driving()
      const previous = await readPaymentFunding(key)
      let owner = await readPaymentFunding(ownerKey)
      if (previous?.routeStop) return previous.routeStop
      let plan = previous?.route
      if (plan && owner?.quoteId !== id) return { phase: 'stopped', step: 0, reason: 'quote-unavailable' }
      if (!plan) {
        if (!start) throw new Error('Review and confirm the swap route before funding')
        if (localStorage.getItem(swapRoutePointerKey(scope)) !== id) throw new QuoteUnavailable()
        if (owner && owner.quoteId !== id) {
          const otherKey = swapRouteFundingKey(scope, owner.quoteId)
          const other = await readPaymentFunding(otherKey)
          if (other?.route && !other.routeStop) {
            const { progress } = await readSwapRouteProgress(otherKey, other.route, guarded)
            if (progress.phase === 'ready' || progress.phase === 'waiting')
              throw new PaymentSubmissionPending(owner.swapId)
          }
        }
        plan = plannedRoutes.current.get(id)
        if (!plan) throw new QuoteUnavailable()
        assertJoinedQuotes(plan.quotes)
        for (const quote of plan.quotes) {
          const give = parseAssetId(quote.give.asset)
          const take = parseAssetId(quote.take.asset)
          if (
            (take.assetNamespace === 'slip44' && quote.take.amount < aspInfo.dust) ||
            (give.rail === 'arkade' && give.assetNamespace === 'slip44' && quote.give.amount < aspInfo.dust) ||
            (give.rail === 'arkade' &&
              give.assetNamespace !== 'slip44' &&
              (!quote.carrierSats || quote.carrierSats < aspInfo.dust))
          ) {
            throw new Error('The swap route cannot fund one of its reviewed outputs')
          }
        }
        const first = plan.quotes[0]
        const swapId = assetSwapIdOf(swapRouteFamily(first), first.id)
        const nextOwner = { quoteId: id, swapId, guarded: true as const }
        const raced = await claimPaymentFunding(ownerKey, nextOwner, owner?.quoteId)
        if (raced) throw new PaymentSubmissionPending(raced.swapId)
        owner = nextOwner
        const prior = await claimPaymentFunding(key, {
          quoteId: id,
          swapId,
          route: plan,
        })
        if (prior) throw new PaymentSubmissionPending(prior.swapId)
      }
      const { progress, payout } = await readSwapRouteProgress(key, plan, guarded)
      if (progress.phase !== 'ready') return progress
      const reviewed = plan.quotes[progress.step]
      const quote = issued.current.get(reviewed.id)
      if (!quote || held.current !== issuer) {
        const stop = { ...progress, phase: 'stopped', reason: 'quote-unavailable' } as const
        if (owner?.quoteId === id)
          await claimPaymentFunding(key, { quoteId: id, swapId: owner.swapId, route: plan, routeStop: stop }, id)
        return stop
      }
      const legKey = swapRouteLegKey(key, progress.step)
      if (quote.route.give.corridor === 'lightning') {
        const previous = await readPaymentFunding(legKey)
        const swapId = assetSwapIdOf('rfq', quote.id)
        const raced = await claimPaymentFunding(legKey, { quoteId: quote.id, swapId, guarded: true }, previous?.quoteId)
        if (raced) throw new PaymentSubmissionPending(raced.swapId)
        const swap = await withPaymentFundingCheckpoint(legKey, quote.id, () => client.accept(quote))
        announceHere(swap)
      } else {
        await acceptReservedQuote(quote.id, legKey, guarded, {
          family: 'offer',
          validUntil: progress.step === 0 ? plan.expiresAt : undefined,
          validate: (candidate) => {
            if (candidate !== quote || !routeQuoteLive(quote)) throw new QuoteUnavailable()
          },
          selectInputs: async () => {
            if (!svcWallet) throw new Error('Swap funding wallet is unavailable')
            if (payout) return [payout]
            if (progress.step !== 0) throw new Error('The prior swap output is not spendable')
            const source = parseAssetId(quote.give.asset)
            if (source.assetNamespace === 'slip44') {
              return selectRouteBitcoinInputs(svcWallet, quote.give.amount, aspInfo.vtxoMinAmount)
            }
            if (!quote.carrierSats || quote.carrierSats < aspInfo.dust)
              throw new Error('The asset deposit carrier is unavailable')
            return selectConversionInputs(
              svcWallet,
              source.assetReference,
              quote.give.amount,
              quote.carrierSats,
              aspInfo.dust,
              aspInfo.vtxoMinAmount,
            )
          },
        }).catch(async (error) => {
          if (progress.step === 0 && error instanceof PaymentNotSubmitted) await releasePaymentFunding(key, id)
          throw error
        })
      }
      return (await readSwapRouteProgress(key, plan, guarded)).progress
    })
  }

  const quoteChainedPaymentHere = async (assetId: string, lightningId: string, request: LightningPaymentRequest) => {
    if (!navigator.locks) throw new Error('Asset payments require browser support for coordinating wallet tabs')
    const network = aspInfo.network as NetworkName
    const lightning = reviewedLightning(lightningId, request, network)
    const issuer = held.current
    const client = await driving()
    const quote = await client.quote(conversionQuoteInput(assetId, lightning.give.amount, network))
    if (held.current !== issuer) throw new QuoteUnavailable()
    assertPaymentQuote(lightning, request, network)
    assertConversionQuote(quote, assetId, lightning.give.amount, network, aspInfo.dust)
    assertJoinedQuotes([quote, lightning])
    remember(quote)
    return quote
  }

  const readConversion = async (key: string, guarded: boolean) => {
    const attempt = await readPaymentFunding(conversionFundingKey(key))
    const record = attempt && (await assetSwapRepository.getSwapRecord(attempt.quoteId))
    return { attempt, record, status: conversionStatus(attempt, record, guarded) }
  }

  const getChainedPayment: SwapsContextProps['getChainedPayment'] = async (request) => {
    const network = aspInfo.network as NetworkName
    const key = lookupLightningPaymentKey(request, network, wallet.pubkey)
    const { record, status } = await withPaymentFundingStatus(key, (guarded) => readConversion(key, guarded))
    if (status?.phase !== 'credited' || record?.family !== 'offer' || !svcWallet) return status
    const payout = await findConversionPayout(svcWallet, record, status.sats).catch(() => undefined)
    return { ...status, spendable: Boolean(payout) }
  }

  const startChainedPaymentHere = async (
    assetId: string,
    conversionId: string,
    lightningId: string,
    request: LightningPaymentRequest,
  ) => {
    const network = aspInfo.network as NetworkName
    const key = paymentAttemptKey(request, network, wallet.pubkey)
    await withPaymentFundingLock(key, async (guarded) => {
      if (!guarded) throw new Error('Asset payments require browser support for coordinating wallet tabs')
      const { attempt, status } = await readConversion(key, guarded)
      if (status) {
        if (attempt?.quoteId === conversionId && attempt.chain?.lightningQuoteId === lightningId) return
        throw new PaymentSubmissionPending(status.swapId)
      }
      const previous = await readPaymentFunding(key)
      if (previous) {
        const record = await assetSwapRepository.getSwapRecord(previous.quoteId)
        if (record ? !fundingWasNotSubmitted(record) : !canReplaceMissingPaymentRecord(previous, guarded)) {
          throw new PaymentSubmissionPending(previous.swapId)
        }
      }
      const lightning = reviewedLightning(lightningId, request, network)
      await acceptReservedQuote(conversionId, conversionFundingKey(key), guarded, {
        family: 'offer',
        chain: { lightningQuoteId: lightning.id, sats: lightning.give.amount },
        validUntil: paymentQuoteExpiry(lightning),
        validate: (quote) => {
          assertPaymentQuote(lightning, request, network)
          assertConversionQuote(quote, assetId, lightning.give.amount, network, aspInfo.dust)
        },
        selectInputs: async (quote) => {
          if (!svcWallet || quote.carrierSats === undefined) throw new Error('Asset funding is unavailable')
          return selectConversionInputs(
            svcWallet,
            assetId,
            quote.give.amount,
            quote.carrierSats,
            aspInfo.dust,
            aspInfo.vtxoMinAmount,
          )
        },
      })
    })
  }

  const finishChainedPaymentHere = async (id: string, request: LightningPaymentRequest) => {
    const network = aspInfo.network as NetworkName
    const key = paymentAttemptKey(request, network, wallet.pubkey)
    return withPaymentFundingLock(key, async (guarded) => {
      const { attempt, record, status } = await readConversion(key, guarded)
      if (
        !guarded ||
        attempt?.chain?.lightningQuoteId !== id ||
        status?.phase !== 'credited' ||
        record?.family !== 'offer'
      ) {
        throw new Error('The reviewed asset conversion is not ready to fund this payment')
      }
      return acceptReservedQuote(id, key, guarded, {
        family: 'rfq',
        validate: (quote) => {
          assertPaymentQuote(quote, request, network)
          if (quote.give.amount !== status.sats) throw new Error('The Lightning debit changed')
        },
        selectInputs: async () => {
          const payout = svcWallet && (await findConversionPayout(svcWallet, record, status.sats))
          if (!payout) throw new Error('The Bitcoin from the conversion is not spendable')
          return [payout]
        },
      })
    })
  }

  const acceptPaymentQuoteHere = async (id: string, request: PaymentQuoteRequest, reviewId?: string): Promise<Swap> => {
    const network = aspInfo.network as NetworkName
    const key = paymentAttemptKey(request, network, wallet.pubkey, reviewId)
    return withPaymentFundingLock(key, async (guarded) => {
      if (request.kind === 'lightning') {
        const { status } = await readConversion(key, guarded)
        if (status?.phase === 'converting' || status?.phase === 'recovery') {
          throw new PaymentSubmissionPending(status.swapId)
        }
      }
      return acceptReservedQuote(id, key, guarded, {
        family: request.kind === 'asset' ? 'offer' : 'rfq',
        validate: (quote) => assertPaymentQuote(quote, request, network),
      })
    })
  }

  const acceptReservedQuote = async (
    id: string,
    key: string,
    guarded: boolean,
    options: {
      family: 'offer' | 'rfq'
      validate: (quote: Quote) => void
      chain?: PaymentFundingAttempt['chain']
      validUntil?: number
      selectInputs?: (quote: Quote) => Promise<ExtendedVirtualCoin[]>
    },
  ): Promise<Swap> => {
    const issuer = held.current
    const client = await driving()
    const previous = await readPaymentFunding(key)
    if (previous) {
      const record = await assetSwapRepository.getSwapRecord(previous.quoteId)
      if (!record) {
        if (!canReplaceMissingPaymentRecord(previous, guarded)) throw new PaymentSubmissionPending(previous.swapId)
      } else if (!fundingWasNotSubmitted(record)) {
        if (!record.fundingTxid) throw new PaymentSubmissionPending(previous.swapId)
        if (record.family !== 'rfq' || record.kind !== 'lightning_send' || record.state !== 'refunded') {
          return swapOf(record, recordOutcome(record))
        }
        const refunded = svcWallet && (await hasConfirmedPaymentRefund(record, walletLockupIndexer(svcWallet)))
        // A refunded covenant cannot prove the payee never revealed the invoice's preimage.
        if (refunded) throw new PaymentRequiresNewInvoice(previous.swapId)
        throw new PaymentSubmissionPending(previous.swapId)
      }
      if (previous.quoteId === id) throw new QuoteUnavailable()
    }
    const quote = issued.current.get(id)
    if (!quote) throw new QuoteUnavailable()
    let selectedVtxos: ExtendedVirtualCoin[] | undefined
    try {
      options.validate(quote)
      selectedVtxos = await options.selectInputs?.(quote)
    } catch (error) {
      throw new PaymentNotSubmitted(error)
    }
    const swapId = assetSwapIdOf(options.family, id)
    const attempt: PaymentFundingAttempt = {
      quoteId: id,
      swapId,
      ...(guarded ? { guarded: true } : {}),
      ...(options.chain ? { chain: options.chain } : {}),
    }
    const raced = await claimPaymentFunding(key, attempt, previous?.quoteId)
    if (raced) throw new PaymentSubmissionPending(raced.swapId)
    try {
      if (held.current !== issuer) throw new QuoteUnavailable()
      options.validate(quote)
    } catch (error) {
      await releasePaymentFunding(key, id)
      if (error instanceof QuoteUnavailable) throw error
      throw new PaymentNotSubmitted(error)
    }

    let swap: Swap
    try {
      swap = await withPaymentFundingCheckpoint(key, id, () =>
        client.accept(quote, {
          validUntil: Math.min(paymentQuoteExpiry(quote), options.validUntil ?? Infinity),
          ...(selectedVtxos ? { selectedVtxos, maxChangeFee: 0 } : {}),
        }),
      )
    } catch (error) {
      const stored = await assetSwapRepository
        .getSwapRecord(id)
        .then((record) => ({ record }))
        .catch(() => undefined)
      const record = stored?.record
      if (record?.fundingTxid) return swapOf(record, recordOutcome(record))
      const reservation = stored && !record ? await readPaymentFunding(key).catch(() => undefined) : undefined
      if (
        record
          ? fundingWasNotSubmitted(record)
          : stored &&
            (isSwapError(error, 'InsufficientFunds') ||
              isSwapError(error, 'QuoteExpired') ||
              (reservation?.quoteId === id && canReplaceMissingPaymentRecord(reservation, guarded)))
      ) {
        await releasePaymentFunding(key, id)
        throw new PaymentNotSubmitted(error)
      }
      void refreshSwaps().catch(consoleError)
      throw new PaymentSubmissionPending(swapId)
    }
    issued.current.delete(id)
    announceHere(swap)
    void refreshSwaps().catch(consoleError)
    reloadRef.current().catch(consoleError)
    if (!swap.fundingTxid) {
      const record = await assetSwapRepository.getSwapRecord(id).catch(() => undefined)
      if (record && fundingWasNotSubmitted(record)) {
        await releasePaymentFunding(key, id)
        throw new PaymentNotSubmitted(new Error('The previous payment quote was not funded. Refresh to try again.'))
      }
      throw new PaymentSubmissionPending(swap.id)
    }
    return swap
  }

  // Not `client.exchange`, which re-quotes and funds whatever comes back. The
  // estimate and this firm quote are priced independently — a carrier the card
  // omits, a rounding unit — so the composer compares them and decides what the
  // user confirms; `acceptSwapQuote` then funds exactly this quote, fenced to its
  // deadline. Reuse live quotes because older solvers can refuse duplicate terms.
  const quoteExchangeHere = async (plan: OfferPlan): Promise<Quote> => {
    if (!emulatorPubkey) throw new Error('swap service unavailable')
    const network = aspInfo.network as NetworkName
    const issuer = held.current
    const client = await driving()
    const give = swapAssetId(network, plan.deposit.asset.id)
    const take = swapAssetId(network, plan.receive.asset.id)
    const quoted = await client.quote({ give, take, amount: plan.deposit.atomic, amountOn: 'give' })
    // A client replaced mid-quote was disposed with this quote's preparation.
    if (held.current !== issuer) throw new QuoteUnavailable()
    remember(quoted)
    return quoted
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

  const cancelSwap = (id: string): Promise<void> => runOnDriver('cancelSwap', [id])

  const cancelSwapHere = async (id: string): Promise<void> => {
    const client = await driving()
    const { outcome } = await client.cancel(id as AssetSwapId)
    await refreshSwaps()
    reportCancel(outcome)
    reloadRef.current().catch(consoleError)
  }

  const recoverSwap = (id: string): Promise<boolean> => runOnDriver('recoverSwap', [id])

  /**
   * No toast of its own: a deposit that went home is written `cancelled`, and
   * that update is announced like any other ended swap. What only the caller
   * can say — that the round left this deposit out — goes back as the value.
   */
  const recoverSwapHere = async (id: string): Promise<boolean> => {
    const client = await driving()
    const { recovered } = await client.recover(id as AssetSwapId)
    await refreshSwaps()
    reloadRef.current().catch(consoleError)
    return recovered
  }

  // ------------------------------------------------------------- payments

  /** Keep a quote for the accept that follows it, and drop the ones that can
   * no longer be accepted at all. */
  const remember = (quote: Quote) => {
    const now = Math.floor(Date.now() / 1000)
    for (const [id, kept] of issued.current) {
      if (kept.expiresAt <= now) issued.current.delete(id)
    }
    issued.current.set(quote.id, quote)
  }

  /**
   * The card's own bounds, checked before a quote is burned.
   *
   * The client selects the market and refuses a route it cannot serve, but it
   * does no size check against the card: an out-of-range amount reaches the
   * solver and comes back a refusal, one round trip and one disclosed invoice
   * later. This is the pre-flight that was lost with the corridor pickers, kept
   * because the message it produces is the only one a user can act on.
   *
   * Bounds apply to the payout rail: Lightning on a send, Arkade on a receive.
   */
  const assertWithinBounds = (sats: number, payout: 'bolt11' | 'arkade') => {
    const bounds = allMarketsRef.current.filter(isLightningMarket).flatMap((market) => {
      const side = marketCorridor(market, 'base') === payout ? 'base' : 'quote'
      if (!isSolverEnabled(market, side === 'base' ? 'quote' : 'base', aspInfo.network)) return []
      const limits = sideLimits(market, side)
      return limits ? [limits] : []
    })
    if (!bounds.length || bounds.some(({ min, max }) => BigInt(sats) >= min && BigInt(sats) <= max)) return
    const ranges = bounds.map(({ min, max }) => `${prettyNumber(Number(min))}-${prettyNumber(Number(max))}`).join(', ')
    throw new Error(`Amount outside solver bounds (${ranges} sats)`)
  }

  /**
   * The bounds run on THIS tab, before the hop.
   *
   * Discovery is deliberately outside the lock, so every tab has the cards and
   * can produce the one message a user can act on without a round trip. The
   * holder's own pre-flight still runs; this just refuses the obvious locally.
   */
  const quotePay = (destination: string): Promise<Quote> => {
    if (destination.toLowerCase().startsWith('ln')) {
      assertWithinBounds(toInvoiceFacts(destination, aspInfo.network as NetworkName).amountSats, 'bolt11')
    }
    return runOnDriver('quotePay', [destination])
  }

  const quotePayHere = async (destination: string): Promise<Quote> => {
    const client = await driving()
    // No corridor to pick, no market to find: `to` is parsed once at the client
    // boundary and the corridor pair it yields selects the route. The wallet's
    // own BOLT11 gates still run — they are the lightning corridor's `decode`
    // override — and they are what the bounds check reads the amount from,
    // which is why an invoice is decoded here and nowhere else.
    if (destination.toLowerCase().startsWith('ln')) {
      assertWithinBounds(toInvoiceFacts(destination, aspInfo.network as NetworkName).amountSats, 'bolt11')
    }
    const quote = await client.quote({ to: destination })
    remember(quote)
    return quote
  }

  /**
   * The quote itself when we run it, its id when another tab does.
   *
   * Only the id can cross the channel usefully. `client.accept` resolves the
   * quote's *preparation* from a map its own `quote()` filled, so a copy of the
   * quote carries a valid id and nothing the accept can use — the holder has to
   * reach for the object it issued. Running here needs none of that, and passes
   * the quote straight through as it always did.
   */
  const acceptPay = (quote: Quote): Promise<string> => runOnDriver('acceptPay', [quote.id], () => acceptPayHere(quote))

  const acceptPayHere = async (ref: Quote | string): Promise<string> => {
    const client = await driving()
    const quote = typeof ref === 'string' ? issued.current.get(ref) : ref
    // An id with no quote behind it: the tab that negotiated this one closed
    // and we were promoted into its place. Nothing is recoverable from the id
    // alone — the preparation went with that tab — and re-quoting silently
    // would fund a price nobody confirmed.
    if (!quote) throw new Error('This quote is no longer available — go back and try again')
    const swap = await client.accept(quote)
    announceHere(swap)
    if (!swap.fundingTxid) throw new Error('the lockup was not funded')
    return swap.fundingTxid
  }

  const receiveLightning = (amountSats: number): Promise<AcceptedLnReceive> => {
    assertWithinBounds(amountSats, 'arkade')
    return runOnDriver('receiveLightning', [amountSats])
  }

  const receiveLightningHere = async (amountSats: number): Promise<AcceptedLnReceive> => {
    const client = await driving()
    assertWithinBounds(amountSats, 'arkade')
    // `receive` pins the TAKE leg: the trader is credited `amount` and the
    // payer is shown `amount + fee`, which is what `give` carries below.
    // Driving starts before the invoice comes back, so the monitored set is
    // always a superset of what is payable.
    const request = await client.receive({ amount: BigInt(amountSats), via: 'lightning' })
    announceHere(request)
    if (request.artifact.kind !== 'invoice') throw new Error('the receive produced no invoice')
    return {
      id: request.id,
      invoice: request.artifact.bolt11,
      payAmount: Number(request.give.amount),
      invoiceExpiresAt: request.expiresAt,
    }
  }

  /** The fee rate is read per router, not pinned: the solver rail grosses the
   *  take leg up by it, so a stale one short-pays the recipient. */
  const sendRouter: SwapsContextProps['sendRouter'] = async ({
    swapsOptional,
    exitOnly,
    onchainSolverId,
    ...deps
  } = {}): Promise<PaymentRouter> => {
    if (exitOnly) return createSendRouter({ wallet: svcWallet!, dust: () => Number(aspInfo.dust), ...deps })
    if (!held.current && granted.current) {
      await Promise.race([granted.current, new Promise((resolve) => setTimeout(resolve, LOCK_GRACE_MS))])
    }
    // A router cannot cross to the driving tab, so without the client here it is built without it.
    if (swapsOptional && !held.current) return createSendRouter({ wallet: svcWallet!, ...deps })
    if (!held.current) throw new SwapsHeldElsewhere()
    // LNURL keeps the local Lightning client but needs no onchain claim fee, and no client that failed to start.
    if (swapsOptional) {
      const client = await driving().catch(() => undefined)
      return createSendRouter({ wallet: svcWallet!, client, ...deps })
    }
    const client = await driving()
    const claimFeeRateSatVb = await claimFeeRate(onchainClaimEndpoint(aspInfo.network as NetworkName))
    return createSendRouter({
      wallet: svcWallet!,
      client,
      claimFeeRateSatVb,
      onchainRouting: { network: aspInfo.network, preferredSolverId: onchainSolverId },
      dust: () => Number(aspInfo.dust),
      preferExit: readOnchainSendPreference(aspInfo.network) === 'exit',
      ...deps,
    })
  }

  const outcomeOf = useCallback((id: string) => outcomes.get(id), [outcomes])
  const errorOf = useCallback((id: string) => errors.get(id), [errors])

  const hasOnchainPayout = allMarketsRef.current.some((card) => {
    const side = marketCorridor(card, 'base') === 'arkade' ? 'base' : 'quote'
    if (marketCorridor(card, side) !== 'arkade') return false
    const from = side === 'base' ? card.base_asset.id : card.quote_asset.id
    return Boolean(findMarket([card], from, btcOn('bitcoin', aspInfo.network as NetworkName))?.market)
  })
  const hasAssetToDiscover = availableAssetBalances?.some(
    ({ assetId, amount }) => /^[0-9a-f]{68}$/.test(assetId) && BigInt(amount) > 0n,
  )
  const swapAvailable =
    (markets.length > 0 || hasOnchainPayout || Boolean(hasAssetToDiscover) || availableBalance > 0) &&
    Boolean(emulatorPubkey)
  const value = useMemo(
    () => ({
      allMarkets: allMarketsRef.current,
      markets,
      discoveryReady,
      swapAvailable,
      swaps,
      runDiscovery,
      quoteExchange,
      openSwapQuotes,
      openPaymentQuotes,
      cancelOpenSwapQuotes,
      chooseSwapQuote,
      acceptSwapQuote,
      quoteAssetPayment,
      quotePaymentRoute,
      paymentRouteCandidates,
      onchainPaymentRouteCandidates,
      acceptPaymentQuote,
      quoteChainedPayment,
      startChainedPayment,
      getChainedPayment,
      finishChainedPayment,
      quoteSwapRoute,
      startSwapRoute,
      advanceSwapRoute,
      getSwapRoute,
      cancelSwap,
      recoverSwap,
      quotePay,
      acceptPay,
      receiveLightning,
      sendRouter,
      outcomeOf,
      errorOf,
    }),
    // the actions close over these
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      markets,
      discoveryReady,
      discoveryScope,
      swapAvailable,
      swaps,
      svcWallet,
      wallet.pubkey,
      emulatorPubkey,
      aspInfo.url,
      aspInfo.network,
      aspInfo.dust,
      outcomeOf,
      errorOf,
    ],
  )

  return <SwapsContext.Provider value={value}>{children}</SwapsContext.Provider>
}
