import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { base64, hex } from '@scure/base'
import { asset, RestIndexerProvider, Transaction, type NetworkName } from '@arkade-os/sdk'
import {
  addAssetSwap,
  BTC_ASSET_ID,
  cancelOffer,
  classifyDepositSpend,
  createOffer,
  decodeOffer,
  findMarket,
  getAssetSwaps,
  restoreAssetSwaps,
  retireSettledOfferContracts,
  spendTxidsOf,
  spendUpdate,
  updateAssetSwap,
  watchOfferSwaps,
  type AssetSwap,
  type OfferSwapWatcher,
  type SpendKind,
} from '@arkade-os/swap'
import { DiscoveredMarket, OfferPlan } from '@arkade-os/solver-discovery'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { assetSwapRepository, type AssetSwapQuoteSnapshot, type WalletAssetSwap } from '../lib/swapRepository'
import { getTxHistory } from '../lib/asp'
import { getEmulatorPubkeyForNetwork, getEmulatorPubkeyHexForNetwork } from '../lib/constants'
import { discoverMarkets } from '../lib/swapMarkets'
import { getSolverCardsVersion, subscribeSolverCards } from '../lib/solverCards'
import { consoleError } from '../lib/logs'
import { toast } from '../components/Toast'

interface AssetSwapsContextProps {
  /** Markets from the network's solver registry. */
  markets: DiscoveredMarket[]
  /** True when there are markets and the covenant co-signer's key is known. */
  swapAvailable: boolean
  swaps: WalletAssetSwap[]
  createSwap: (plan: OfferPlan, quote?: AssetSwapQuoteSnapshot) => Promise<WalletAssetSwap>
  cancelSwap: (id: string) => Promise<void>
}

export const AssetSwapsContext = createContext<AssetSwapsContextProps>({
  markets: [],
  swapAvailable: false,
  swaps: [],
  createSwap: async () => {
    throw new Error('asset swaps not initialized')
  },
  cancelSwap: async () => {
    throw new Error('asset swaps not initialized')
  },
})

export const AssetSwapsProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { dataReady, svcWallet, reloadWallet, setAssetSwaps, txs, ungroupedTxs } = useContext(WalletContext)

  const [markets, setMarkets] = useState<DiscoveredMarket[]>([])
  const [swaps, setSwaps] = useState<WalletAssetSwap[]>([])

  // the watcher and the reconciliation both read the current list from outside
  // a render, where `swaps` would be the value captured when they were created
  const swapsRef = useRef(swaps)
  swapsRef.current = swaps

  const readSwaps = async (): Promise<WalletAssetSwap[]> =>
    (await getAssetSwaps(assetSwapRepository)) as WalletAssetSwap[]

  /** Adopt a list the repository just returned, keeping the ref in step. */
  const applySwaps = (list: AssetSwap[]): WalletAssetSwap[] => {
    const next = list as WalletAssetSwap[]
    swapsRef.current = next
    setSwaps(next)
    return next
  }

  /**
   * One notice per swap outcome.
   *
   * Four paths write the same terminal status — the watcher event, the
   * unseen-spend pass, the restore scan and `cancelSwap` — and any two can
   * resolve the same spend at once. The record write is idempotent through
   * `spendUpdate`; a toast is not, so the outcome is what gets deduplicated
   * rather than the write.
   *
   * Keyed by outcome, not by swap, so a record that legitimately moves twice
   * (`cancelling` reverted, then cancelled for real) is still announced.
   */
  const announced = useRef(new Set<string>())
  const announceOutcome = (swap: Pick<AssetSwap, 'id' | 'status' | 'toAsset'>) => {
    const key = `${swap.id}:${swap.status}`
    if (announced.current.has(key)) return
    announced.current.add(key)
    if (swap.status === 'fulfilled') toast.success(`Swap completed, ${tickerFor(swap.toAsset)} received`)
    else if (swap.status === 'cancelled') toast.success('Swap cancelled, funds returned')
  }

  /** A swap the chain has not reported an outcome for. `pending` is the absence
   * of an answer and `cancelling` is a cancel whose spend has not landed; every
   * other status is one. Both reconciliation passes below ask this, so they
   * cannot disagree about which records are still theirs to resolve. */
  const isOpen = (swap: AssetSwap) => swap.status === 'pending' || swap.status === 'cancelling'

  /** The deposit as the indexer or the contract manager reports it: its
   * outpoint, and the txids that spent it. Both are needed to classify. */
  type SpentDeposit = { txid: string; vout: number; arkTxId?: string; spentBy?: string }

  /**
   * What a spend of the deposit was, read from the covenant leaf it took.
   *
   * The one authoritative answer, and the one every writer here must use. The
   * alternative — inferring from the history row for the spend, cancel if the
   * want-asset did not arrive — read a fill as a cancel: the SDK builds that
   * row by netting the deposit against the outputs the same tx created for the
   * wallet, and while the fill's output is not yet in the cache the row is a
   * bare send of the deposit. A stored status is permanent, so that guess was.
   *
   * Both spend txids are fetched, not just the ark tx: a deposit spent through
   * a checkpoint names the checkpoint in `spentBy` and the ark tx in
   * `arkTxId`, and only the checkpoint's input carries the leaf.
   *
   * `indeterminate` on any failure — indexer unreachable, malformed psbt — so
   * the caller leaves the record open and a later pass asks again.
   */
  const classifyDeposit = async (swap: AssetSwap, deposit: SpentDeposit): Promise<SpendKind> => {
    const candidates = spendTxidsOf(deposit)
    if (candidates.length === 0 || !aspInfo.url || !aspInfo.signerPubkey) return 'indeterminate'
    try {
      const { txs } = await new RestIndexerProvider(aspInfo.url).getVirtualTxs(candidates)
      return classifyDepositSpend(
        decodeOffer(hex.decode(swap.offerHex)),
        // x-only, matching the key the covenants were funded against
        hex.decode(aspInfo.signerPubkey).slice(1),
        txs.map((psbt) => Transaction.fromPSBT(base64.decode(psbt))),
        { txid: deposit.txid, vout: deposit.vout },
      )
    } catch (err) {
      consoleError(err, 'failed to classify swap deposit spend')
      return 'indeterminate'
    }
  }

  // The store is async now, so the list arrives after the first render rather
  // than with it. Re-read on every dataReady transition: a wallet reset clears
  // the repository, and the emptied list has to reach the UI.
  useEffect(() => {
    // a reset empties the store and a restore rebuilds the same ids, so what
    // has been announced cannot outlive the records it was announced for
    announced.current.clear()
    readSwaps()
      .then(applySwaps)
      .catch((err) => consoleError(err, 'failed to read asset swaps'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady])

  // publish to the wallet provider, which merges swaps into the activity list;
  // it owns `txs`, so the list travels up rather than being read back down
  useEffect(() => setAssetSwaps(swaps), [swaps, setAssetSwaps])

  // Read from config, not fetched: clients have no network path to the emulator,
  // so a reachability probe would fail in any correct deployment and hide swaps.
  const emulatorPubkey = useMemo(
    () => (aspInfo.network ? getEmulatorPubkeyForNetwork(aspInfo.network as NetworkName) : undefined),
    [aspInfo.network],
  )

  const runDiscovery = (network: NetworkName, useCache: boolean) => {
    discoverMarkets(network, useCache)
      // Corridor (RFQ) markets — the bundled Lightning-send card — are not
      // tradeable here: this provider builds offers, and a corridor is
      // negotiated with a solver instead. Keeping them would let one Lightning
      // card turn the whole swap surface on with nothing behind it.
      .then((all) => setMarkets(all.filter((m) => !m.quote_corridor)))
      .catch((err) => consoleError(err, 'solver discovery failed'))
  }

  // Pinned cards are a market source living outside React, so discovery re-runs
  // on their version too: a card the Nostr restore writes lands well after the
  // per-network run, and left the swap screen reading "coming soon".
  const cardsVersion = useSyncExternalStore(subscribeSolverCards, getSolverCardsVersion, getSolverCardsVersion)
  const discoveredNetwork = useRef<string>()

  useEffect(() => {
    if (!aspInfo.network) return
    const switched = discoveredNetwork.current !== aspInfo.network
    discoveredNetwork.current = aspInfo.network
    // `switched` doubles as `useCache`: a network switch empties the list and
    // may serve from the TTL cache, while a card write refreshes in place and
    // must bypass it, since that cache is exactly what a new card invalidates.
    if (switched) setMarkets([])
    runDiscovery(aspInfo.network as NetworkName, switched)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.network, cardsVersion])

  // After a restore the swap store is empty while the funding/fill txs are
  // back in history, so swaps would show as bare sent/received rows. Scan the
  // sent virtual txs for offer packets and rebuild the lost records by
  // binding each funding vtxo to the tx that spent it (fill or cancel).
  //
  // The scan is incremental but not one-shot: answered txids persist, so
  // late-synced history is picked up by later runs and nothing is fetched
  // twice, while a record still open is re-asked until the chain answers it.
  // That second part is what a rebuilt record needs. `createOffer` registers
  // the covenant and the watcher rides those contract events; a record the
  // scan rebuilt has no contract behind it, so no watcher event and no
  // `reconcileUnseenSpends` pass can ever reach it. Its only route to an
  // outcome is another scan.
  const scanningRef = useRef(false)
  const rescanRef = useRef(false)
  // Bumped to re-enter the effect when a queued rescan has to start, since no
  // dependency of its own has changed by then.
  const [scanTick, setScanTick] = useState(0)
  // Ungrouped rows, not `txs`: the scan takes candidates from `sent` rows, and
  // `txs` turns a swap's funding row into a grouped `swap` one as soon as its
  // record exists. Feeding it `txs` would hide the tx the record was built
  // from, so a record could be created and then never re-answered.
  //
  // Read inside the scan so a re-run sees the history that arrived mid-flight.
  // Committed values only, or a discarded render marks txids that never landed.
  const txsRef = useRef(ungroupedTxs)
  useLayoutEffect(() => {
    txsRef.current = ungroupedTxs
  }, [ungroupedTxs])

  // A token rather than a cancellation flag: this cleanup fires only when the
  // wallet changed or the provider went away, and `txs`, which must not abandon
  // a running scan, is deliberately not a dependency.
  const scanTokenRef = useRef({ live: true })
  useEffect(() => {
    const token = { live: true }
    scanTokenRef.current = token
    return () => {
      token.live = false
    }
  }, [aspInfo.url, aspInfo.signerPubkey, dataReady])

  useEffect(() => {
    if (!aspInfo.url || !aspInfo.signerPubkey || !dataReady || ungroupedTxs.length === 0) return
    // A run is already in flight and cannot see this newer history: ask it to go
    // round again instead of dropping the change. Returning without this is what
    // made a skipped run a lost one.
    if (scanningRef.current) {
      rescanRef.current = true
      return
    }
    // the repository clears asynchronously on a wallet reset, so this is
    // re-checked before every write below rather than once
    const token = scanTokenRef.current
    const stale = () => !token.live
    const scan = async () => {
      const [existing, scanned] = await Promise.all([readSwaps(), assetSwapRepository.getScannedTxids()])
      // Both skip lists exempt open records, and they have to agree: an id in
      // `existingIds` or a txid in `scanned` is dropped before the scan reads
      // it. The cost of exempting them is one psbt and one vtxo lookup per open
      // swap per history change, and it stops the moment the swap settles.
      const open = new Map(existing.filter(isOpen).map((swap) => [swap.id, swap]))
      const { restored, scannedTxids } = await restoreAssetSwaps(
        new RestIndexerProvider(aspInfo.url),
        txsRef.current,
        new Set(existing.filter((swap) => !isOpen(swap)).map((swap) => swap.id)),
        {
          // x-only, matching the key the covenants were funded against
          serverPubkey: hex.decode(aspInfo.signerPubkey).slice(1),
          scanned: new Set([...scanned].filter((txid) => !open.has(txid))),
        },
      )
      if (stale()) return
      // a run with nothing new to answer for opens no transaction at all
      if (scannedTxids.length > 0) await assetSwapRepository.markTxidsScanned(scannedTxids)
      if (restored.length === 0) return
      let next: WalletAssetSwap[] | undefined
      const resolved: AssetSwap[] = []
      for (const swap of restored) {
        if (stale()) return
        const stored = open.get(swap.id)
        if (!stored) {
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
          continue
        }
        // `pending` is the absence of an answer, not one: writing it back would
        // say nothing, and over a cancel in flight it would lose that status.
        if (swap.status === 'pending' || swap.status === stored.status) continue
        // Only the outcome. The scan rebuilds every field from chain, so
        // writing the record whole would drop what only this wallet holds: the
        // quote snapshot, and the funded address a cancel needs, which a
        // restored record carries as an empty string.
        next = (await updateAssetSwap(assetSwapRepository, swap.id, {
          status: swap.status,
          ...(swap.spentTxid ? { spentTxid: swap.spentTxid } : {}),
          ...(swap.completedAt ? { completedAt: swap.completedAt } : {}),
        })) as WalletAssetSwap[]
        resolved.push(swap)
      }
      if (!next || stale()) return
      const list = applySwaps(next)
      for (const swap of resolved) announceOutcome(swap)
      // a covenant this run settled is still in the watched set. Liveness is a
      // property of every record at a script, so the list goes whole.
      if (resolved.length > 0 && svcWallet) {
        await retireSettledOfferContracts(await svcWallet.getContractManager(), list)
        if (stale()) return
      }
      // re-merge the activity list so the tx couple collapses into Swap rows
      reloadWallet().catch(consoleError)
    }
    scanningRef.current = true
    scan()
      .catch((err) => consoleError(err, 'swap restore scan failed'))
      .finally(() => {
        scanningRef.current = false
        // the CURRENT token, not this run's: a run whose token died is exactly
        // the one whose queued work still has to happen, under its replacement
        if (!rescanRef.current || !scanTokenRef.current.live) return
        rescanRef.current = false
        // through the effect, not a direct call: this closure is bound to the
        // wallet it started with, a fresh run reads the current one
        setScanTick((tick) => tick + 1)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.url, aspInfo.signerPubkey, dataReady, ungroupedTxs, scanTick])

  // read through a ref so the watcher (which deliberately does not rebind on
  // market refreshes) always names assets from the current list
  const marketsRef = useRef(markets)
  marketsRef.current = markets
  const tickerFor = (assetId: string): string => {
    if (assetId === BTC_ASSET_ID) return 'sats'
    for (const market of marketsRef.current) {
      if (market.quote_asset.id === assetId) return market.quote_asset.ticker
      if (market.base_asset.id === assetId) return market.base_asset.ticker
    }
    return assetId.slice(0, 8)
  }

  const createSwap = async (plan: OfferPlan, quote?: AssetSwapQuoteSnapshot): Promise<WalletAssetSwap> => {
    if (!svcWallet) throw new Error('wallet not available')
    if (!emulatorPubkey) throw new Error('swap service unavailable')
    const depositIsBtc = plan.deposit.asset.id === BTC_ASSET_ID
    // the covenant constrains only what the fill must deliver; the deposit is
    // whatever the funding tx puts in the offer vtxo. Keyed on the RECEIVE
    // side: keying on the deposit would push an asset↔asset plan into the
    // want-btc branch, binding the receive asset's atomic amount as a sat
    // want the solver could fill for dust.
    const offer = await createOffer(svcWallet, aspInfo.url, {
      wantAmount: plan.receive.atomic,
      ...(plan.receive.asset.id === BTC_ASSET_ID
        ? { offerAsset: asset.AssetId.fromString(plan.deposit.asset.id) }
        : { wantAsset: asset.AssetId.fromString(plan.receive.asset.id) }),
      // Since 0.0.3 the package resolves the co-signer key from its own
      // per-network pin; the wallet's configured value still overrides it, so a
      // deployment the package has no pin for keeps working.
      emulatorPubkey: getEmulatorPubkeyHexForNetwork(aspInfo.network as NetworkName),
    })
    // the record is keyed by the funding txid, so it cannot exist before the
    // send; createOffer has already registered the covenant, and a crash in
    // between leaves a deposit the restore scan rebuilds from its offer packet
    const txid = await svcWallet.send({
      address: offer.address,
      // asset deposits ride on a dust sat carrier (sdk default when omitted)
      amount: depositIsBtc ? Number(plan.deposit.atomic) : undefined,
      assets: depositIsBtc ? undefined : [{ assetId: plan.deposit.asset.id, amount: plan.deposit.atomic }],
      extensions: [offer.extension],
    })
    const swap: WalletAssetSwap = {
      id: txid,
      fromAsset: plan.deposit.asset.id,
      toAsset: plan.receive.asset.id,
      fromAmount: plan.deposit.atomic.toString(),
      toAmount: plan.receive.atomic.toString(),
      swapAddress: offer.address,
      swapPkScript: hex.encode(offer.swapPkScript),
      offerHex: offer.offerHex,
      fundingTxid: txid,
      status: 'pending',
      createdAt: Date.now(),
      quote,
    }
    applySwaps(await addAssetSwap(assetSwapRepository, swap))
    reloadWallet().catch(consoleError)
    return swap
  }

  const cancelSwap = async (id: string): Promise<void> => {
    if (!svcWallet) throw new Error('wallet not available')
    const swap = (await readSwaps()).find((s) => s.id === id)
    if (!swap) throw new Error('swap not found')
    // leave 'pending' before spending so the watcher can't read the cancel
    // spend as a fulfillment (cancelOffer writes the same status through the
    // repository; this one is what the UI sees immediately)
    applySwaps(await updateAssetSwap(assetSwapRepository, id, { status: 'cancelling' }))
    try {
      const cancelTxid = await cancelOffer(svcWallet, aspInfo.url, swap.offerHex, {
        repository: assetSwapRepository,
        fundingTxid: swap.fundingTxid,
        swapAddress: swap.swapAddress,
      })
      // cancelOffer records its own outcome when it can match the record, which
      // is what lets the watcher leave our own cancels alone; write it here
      // only if it did not.
      const after = await readSwaps()
      const stored = after.find((candidate) => candidate.id === id)
      if (stored?.status === 'cancelling') {
        applySwaps(await updateAssetSwap(assetSwapRepository, id, { status: 'cancelled', spentTxid: cancelTxid }))
      } else {
        applySwaps(after)
      }
      if (stored?.status !== 'fulfilled') {
        announceOutcome({ ...swap, status: 'cancelled' })
        reloadWallet().catch(consoleError)
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
          if (await resolveCancellingSpend(swap, deposit)) return
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

  const resolveCancellingSpend = async (swap: WalletAssetSwap, deposit: SpentDeposit): Promise<boolean> => {
    // the ark txid, which is what the resolver matches a spend on
    const spentTxid = deposit.arkTxId || deposit.spentBy
    if (!spentTxid) return false
    const kind = await classifyDeposit(swap, deposit)
    if (kind === 'indeterminate') return false

    // Re-read after the async lookup so a completed cancelOffer call or the
    // watcher always wins over this reconciliation.
    const current = (await readSwaps()).find((candidate) => candidate.id === swap.id)
    if (current?.status !== 'cancelling') return true
    const changes = spendUpdate(current, { txid: spentTxid, kind, at: Date.now() })
    if (!changes) return true
    applySwaps(await updateAssetSwap(assetSwapRepository, swap.id, changes))
    announceOutcome({ ...swap, status: kind })
    reloadWallet().catch(consoleError)
    return true
  }

  /**
   * Spends the watcher never received.
   *
   * `watchOfferSwaps` learns a spend only from a live subscription event, and
   * the SDK's other two discovery paths reach it with nothing usable: the boot
   * sync runs before any subscriber exists (`ContractManager.initialize` awaits
   * `reconcileWatched()` before `startWatching()`), and the failsafe poll emits
   * the stale cached rows it diffed against, which carry no spend txid. Either
   * way the record keeps `pending`, and `assetSwapResolver` indexes only
   * `fundingTxid` and `spentTxid`, so the fill tx cannot bind to the swap and
   * one swap renders as two rows: the funding row `ungroupedOfferTx`
   * synthesizes, plus the fill as a bare received one.
   *
   * This pass and the restore scan cover each other's blind spot, because they
   * read different sources. This one reads the wallet's contract rows, so it
   * needs the covenant registered — which `createOffer` does, and a rebuilt
   * record never had. The scan reads chain, so it needs the funding tx to
   * surface in history as a *sent* row — which it does not while the covenant
   * is registered and the deposit still counts as the wallet's own.
   *
   * The spend is classified from the covenant leaf it took, exactly as the
   * watcher and the scan classify theirs (`classifyDeposit`). History is read
   * only for the fill's timestamp, and the pass does not wait for that row:
   * the leaf answers as soon as the indexer serves the spending tx.
   *
   * A spend another path resolves while this one is between its re-read and its
   * write costs a redundant write, not a redundant notice: `spendUpdate` makes
   * the write idempotent and `announceOutcome` deduplicates the toast.
   */
  const reconcileUnseenSpends = async (stale: () => boolean) => {
    if (!svcWallet) return
    const open = (await readSwaps()).filter(isOpen)
    if (open.length === 0) return

    const manager = await svcWallet.getContractManager()
    const contracts = await manager.getContractsWithVtxos({
      script: [...new Set(open.map((swap) => swap.swapPkScript))],
    })
    const spent = contracts.flatMap(({ vtxos }) => vtxos).filter((vtxo) => vtxo.isSpent)
    // the steady state, and worth a check to skip the history read below
    if (spent.length === 0) return

    const history = await getTxHistory(svcWallet)
    const settled = new Set<string>()
    for (const swap of open) {
      const deposit = spent.find((v) => v.contractScript === swap.swapPkScript && v.txid === swap.fundingTxid)
      // the ark txid, which is what the resolver matches a fill on
      const spentTxid = deposit?.arkTxId || deposit?.spentBy
      if (!deposit || !spentTxid) continue

      // a stored status is permanent, so nothing short of the leaf gets written
      const kind = await classifyDeposit(swap, deposit)
      if (kind === 'indeterminate') continue

      // the watcher or a cancel in flight is the authority if it got here first
      const current = (await readSwaps()).find((candidate) => candidate.id === swap.id)
      if (!current || !isOpen(current)) continue

      // the fill's own row is the completion time when it has landed; it can
      // trail the spend, and the outcome does not wait for it
      const row = history.find((tx) => [tx.boardingTxid, tx.redeemTxid, tx.roundTxid].includes(spentTxid))
      const changes = spendUpdate(current, {
        txid: spentTxid,
        kind,
        at: row ? row.createdAt * 1000 : Date.now(), // history in seconds, records in milliseconds
      })
      if (!changes) continue
      // every await above outlives a wallet switch, so re-ask on the near side
      // of each side effect: writing past one would move a record into the
      // wallet the user just left, or repaint it into the one they arrived at
      if (stale()) return
      const updated = await updateAssetSwap(assetSwapRepository, swap.id, changes)
      if (stale()) return
      applySwaps(updated)
      settled.add(swap.swapPkScript)
      announceOutcome({ ...swap, status: kind })
    }
    if (settled.size === 0 || stale()) return
    // only the scripts this run resolved: liveness is a property of all records
    // at a script, so the filter keeps the check sound
    await retireSettledOfferContracts(
      manager,
      swapsRef.current.filter((swap) => settled.has(swap.swapPkScript)),
    )
    if (stale()) return
    reloadWallet().catch(consoleError)
  }

  /**
   * Re-run on every history change, not once at start.
   *
   * The pass can only classify a spend once the transaction that made it has
   * reached history, and with the app left open that arrives long after the
   * watcher started — the fill itself is what puts it there. Running once at
   * start covers only a spend that predates the session.
   *
   * Chained rather than gated by a flag, so a change landing mid-run is
   * answered instead of dropped, and each queued run carries its own liveness
   * so a wallet switch abandons it.
   */
  const reconcileQueue = useRef<Promise<void>>(Promise.resolve())
  useEffect(() => {
    // the leaf is read off the server's copy of the spend, against its key;
    // both arrive async, and the pass re-enters when they do
    if (!svcWallet || !aspInfo.url || !aspInfo.signerPubkey || txs.length === 0) return
    let stopped = false
    reconcileQueue.current = reconcileQueue.current
      .then(() => (stopped ? undefined : reconcileUnseenSpends(() => stopped)))
      .catch((err) => consoleError(err, 'unseen spend reconciliation failed'))
    return () => {
      stopped = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcWallet, txs, aspInfo.url, aspInfo.signerPubkey])

  /** A status the watcher persisted. It writes before it notifies, so the
   * record is durable by the time this runs — all that is left is telling the
   * user and refreshing balances. */
  const announce = (updated: WalletAssetSwap) => {
    const before = swapsRef.current.find((s) => s.id === updated.id)
    applySwaps(
      before
        ? swapsRef.current.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
        : [updated, ...swapsRef.current],
    )
    if (before?.status === updated.status) return
    if (updated.status !== 'fulfilled' && updated.status !== 'cancelled') return
    announceOutcome(updated)
    reloadWallet().catch(consoleError)
  }

  // The watcher rides the wallet's contract events — registration in
  // createOffer is what makes an offer visible to it — and persists each
  // classified spend itself.
  //
  // It subscribes to spends only, so a swept deposit is not noticed live;
  // the restore scan re-asks an open record until the chain answers, and a
  // swept one comes back `recoverable`.
  useEffect(() => {
    if (!svcWallet || !aspInfo.url) return
    let watcher: OfferSwapWatcher | undefined
    let stopped = false
    watchOfferSwaps({
      wallet: svcWallet,
      arkServerUrl: aspInfo.url,
      repository: assetSwapRepository,
      onUpdate: (updated) => announce(updated as WalletAssetSwap),
    })
      .then((started) => {
        if (stopped) started.stop()
        else watcher = started
      })
      .catch((err) => consoleError(err, 'swap status watcher failed'))
    return () => {
      stopped = true
      watcher?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcWallet, aspInfo.url])

  const swapAvailable = markets.length > 0 && Boolean(emulatorPubkey)
  const value = useMemo(
    () => ({ markets, swapAvailable, swaps, createSwap, cancelSwap }),
    // createSwap/cancelSwap close over these
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markets, swapAvailable, swaps, svcWallet, emulatorPubkey, aspInfo.url, aspInfo.network],
  )

  return <AssetSwapsContext.Provider value={value}>{children}</AssetSwapsContext.Provider>
}
