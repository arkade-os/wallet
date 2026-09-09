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
import {
  asset,
  RestIndexerProvider,
  Transaction,
  toXOnlySignerHex,
  type NetworkName,
  type VirtualCoin,
} from '@arkade-os/sdk'
import {
  addAssetSwap,
  BTC_ASSET_ID,
  cancelOffer,
  classifyDepositSpend,
  createOffer,
  decodeOffer,
  findMarket,
  getAssetSwaps,
  isRfqMarket,
  restoreAssetSwapRepository,
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
import { getEmulatorPubkeyForNetwork, getEmulatorPubkeyHexForNetwork } from '../lib/constants'
import { discoverMarkets } from '../lib/swapMarkets'
import { getSolverCardsVersion, subscribeSolverCards } from '../lib/solverCards'
import { consoleError } from '../lib/logs'
import { toast } from '../components/Toast'

/** The deposit as the indexer or the contract manager reports it: its outpoint,
 * and the txids that spent it. `spentBy` is the checkpoint and `arkTxId` the
 * ark tx; a spend through a checkpoint carries the covenant leaf in the former. */
type SpentDeposit = Pick<VirtualCoin, 'txid' | 'vout' | 'spentBy' | 'arkTxId'>

/** The server key as the covenants were funded against it: x-only. The info
 * endpoint serves it compressed today; this accepts either form and throws on
 * anything else, where a bare slice of an x-only key would silently yield one
 * of the wrong length and every classification would come back indeterminate. */
const xOnlyServerKey = (signerPubkey: string): Uint8Array => hex.decode(toXOnlySignerHex(signerPubkey))

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
      .then((all) => setMarkets(all.filter((m) => !isRfqMarket(m))))
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
  // twice. Open records travel through the package's explicit `reopen` path,
  // which preserves their wallet-only fields while re-asking the chain for a
  // definite outcome. Coverage restoration above also re-registers rebuilt
  // covenants so later spends reach the live watcher.
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
  const scanTokenRef = useRef(new AbortController())
  useEffect(() => {
    const token = new AbortController()
    scanTokenRef.current = token
    return () => token.abort()
  }, [svcWallet, aspInfo.url, aspInfo.signerPubkey, dataReady])

  useEffect(() => {
    if (!svcWallet || !aspInfo.url || !aspInfo.signerPubkey || !dataReady) return
    // A run is already in flight and cannot see this newer history: ask it to go
    // round again instead of dropping the change. Returning without this is what
    // made a skipped run a lost one.
    if (scanningRef.current) {
      rescanRef.current = true
      return
    }
    const token = scanTokenRef.current
    const stale = () => token.signal.aborted
    const scan = async () => {
      const result = await restoreAssetSwapRepository({
        wallet: svcWallet,
        arkServerUrl: aspInfo.url,
        indexer: new RestIndexerProvider(aspInfo.url),
        repository: assetSwapRepository,
        txs: txsRef.current,
        serverPubkey: xOnlyServerKey(aspInfo.signerPubkey),
        signal: token.signal,
        prepareNew: (swap) => {
          // Quote-time facts are not on chain. Backfill the fee from the
          // pair's current card until it rides in the funding packet.
          const feeBps = findMarket(marketsRef.current, swap.fromAsset, swap.toAsset)?.market?.fee_bps
          return feeBps === undefined ? swap : ({ ...swap, quote: { feeBps } } as AssetSwap)
        },
      })
      if (result.aborted || stale()) return
      if (result.coverageError) {
        consoleError(result.coverageError, 'swap covenant coverage restore failed')
      }
      if (result.changes.length === 0) return
      const list = applySwaps(result.swaps)
      const resolved = result.changes
        .filter(({ previous, current }) => previous && previous.status !== current.status)
        .map(({ current }) => current)
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
        if (!rescanRef.current || scanTokenRef.current.signal.aborted) return
        rescanRef.current = false
        // through the effect, not a direct call: this closure is bound to the
        // wallet it started with, a fresh run reads the current one
        setScanTick((tick) => tick + 1)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcWallet, aspInfo.url, aspInfo.signerPubkey, dataReady, ungroupedTxs, scanTick])

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

  /**
   * The spending txs the indexer serves for these txids, parsed and keyed by
   * txid: one round-trip for however many the caller needs. A psbt that fails
   * to parse is dropped rather than failing the batch, as the restore scan
   * does, so the other spend of the same deposit can still answer.
   */
  const fetchSpendTxs = async (txids: string[]): Promise<Map<string, Transaction>> => {
    const parsed = new Map<string, Transaction>()
    if (txids.length === 0) return parsed
    const { txs } = await new RestIndexerProvider(aspInfo.url).getVirtualTxs(txids)
    for (const psbt of txs) {
      try {
        const tx = Transaction.fromPSBT(base64.decode(psbt))
        parsed.set(tx.id, tx)
      } catch (err) {
        consoleError(err, 'unparseable spending tx from indexer')
      }
    }
    return parsed
  }

  /**
   * What a spend of the deposit was, read from the covenant leaf it took, and
   * the txid the record carries for it: the ark txid, which is what the
   * resolver matches a spend on.
   *
   * The one authoritative answer, and the one every writer here uses. The
   * alternative — inferring from the history row for the spend, cancel if the
   * want-asset did not arrive — read a fill as a cancel. The SDK builds that
   * row by netting the deposit against the outputs the same tx created for the
   * wallet, and the two sides are not equally fresh: `getContractsWithVtxos`
   * syncs the covenant's script against the indexer on every call, while
   * history is built from the cached wallet-script vtxos, which only the
   * subscription updates. A pass that runs between the fill landing and that
   * update sees the deposit spent with no output for it, a bare send of the
   * deposit. A stored status is permanent, so that guess was.
   *
   * Nothing when the deposit reports no spend or the leaf has no answer yet —
   * a spend the indexer did not serve, a covenant that does not rebuild against
   * this key — so the caller leaves the record open and a later pass asks again.
   *
   * TODO: this is the watcher's own `classify` step, which `@arkade-os/swap`
   * keeps private; delete it once the package exports a fetching classifier.
   */
  const classifyDeposit = (
    swap: AssetSwap,
    deposit: SpentDeposit,
    spendTxs: Map<string, Transaction>,
  ): { txid: string; kind: Exclude<SpendKind, 'indeterminate'> } | undefined => {
    const txid = deposit.arkTxId || deposit.spentBy
    if (!txid || !aspInfo.signerPubkey) return undefined
    try {
      const kind = classifyDepositSpend(
        decodeOffer(hex.decode(swap.offerHex)),
        xOnlyServerKey(aspInfo.signerPubkey),
        spendTxidsOf(deposit)
          .map((id) => spendTxs.get(id))
          .filter((tx): tx is Transaction => tx !== undefined),
        { txid: deposit.txid, vout: deposit.vout },
      )
      return kind === 'indeterminate' ? undefined : { txid, kind }
    } catch (err) {
      consoleError(err, 'failed to classify swap deposit spend')
      return undefined
    }
  }

  /**
   * Writes the leaf's answer for a spent deposit onto a record still open, and
   * announces it. The one routine behind both writers that start from a
   * deposit the indexer reports spent: the unseen-spend pass, and a cancel that
   * threw after the deposit was gone.
   *
   * The record is re-read right before the write so the watcher, or a cancel
   * that completed meanwhile, wins: `spendUpdate` returns nothing for a
   * terminal record, and that is the only open-check either writer relies on.
   * The completion time is the fill's own history row when it has landed; it
   * can trail the spend, and the outcome does not wait for it.
   *
   * `answered` is whether the leaf had an answer, `written` whether this call
   * was the one that wrote it. The awaits outlive a wallet switch, so `stale`
   * is asked on the near side of each side effect: writing past one would move
   * a record into the wallet the user just left, or repaint it into the one
   * they arrived at.
   */
  const resolveSpentDeposit = async (
    swap: AssetSwap,
    deposit: SpentDeposit,
    spendTxs: Map<string, Transaction>,
    stale: () => boolean,
  ): Promise<{ answered: boolean; written: boolean }> => {
    const spend = classifyDeposit(swap, deposit, spendTxs)
    if (!spend) return { answered: false, written: false }
    const row = txsRef.current.find((tx) => [tx.boardingTxid, tx.redeemTxid, tx.roundTxid].includes(spend.txid))
    const current = (await readSwaps()).find((candidate) => candidate.id === swap.id)
    const changes =
      current &&
      spendUpdate(current, {
        ...spend,
        at: row ? row.createdAt * 1000 : Date.now(), // history in seconds, records in milliseconds
      })
    if (!changes || stale()) return { answered: true, written: false }
    const updated = await updateAssetSwap(assetSwapRepository, swap.id, changes)
    if (stale()) return { answered: true, written: false }
    applySwaps(updated)
    announceOutcome({ ...swap, status: spend.kind })
    return { answered: true, written: true }
  }

  /** A cancel that threw after the deposit was spent: something took it, and
   * the leaf says what. True once it has answered, whichever writer got there
   * first; false leaves the record `cancelling` for the watcher. */
  const resolveCancellingSpend = async (swap: WalletAssetSwap, deposit: SpentDeposit): Promise<boolean> => {
    const spendTxs = await fetchSpendTxs(spendTxidsOf(deposit))
    const { answered, written } = await resolveSpentDeposit(swap, deposit, spendTxs, () => false)
    if (written) reloadWallet().catch(consoleError)
    return answered
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
   * This pass reads the wallet's contract rows, so it needs the covenant
   * registered; `createOffer` does that immediately and the SDK repository
   * restore repairs it for records rebuilt from seed. The scan reads chain
   * directly and reopens stored records from their offer packet.
   *
   * The spend is classified from the covenant leaf it took, exactly as the
   * watcher and the scan classify theirs (`classifyDeposit`), off one indexer
   * read for every spend the pass has to look at. It does not wait for the
   * fill's history row: the leaf answers as soon as the indexer serves the
   * spending tx.
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
    const vtxos = contracts.flatMap((contract) => contract.vtxos)
    const spent = open.flatMap((swap) => {
      const deposit = vtxos.find(
        (v) => v.isSpent && v.contractScript === swap.swapPkScript && v.txid === swap.fundingTxid,
      )
      return deposit ? [{ swap, deposit }] : []
    })
    // the steady state
    if (spent.length === 0) return

    const spendTxs = await fetchSpendTxs([...new Set(spent.flatMap(({ deposit }) => spendTxidsOf(deposit)))])
    if (stale()) return
    const settled = new Set<string>()
    for (const { swap, deposit } of spent) {
      const { written } = await resolveSpentDeposit(swap, deposit, spendTxs, stale)
      if (stale()) return
      if (written) settled.add(swap.swapPkScript)
    }
    if (settled.size === 0) return
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
   * A spend can land at any point in the session, and `txs` changing is the
   * wallet's signal that something moved: the deposit's own spend reaches
   * history as a row, so the change that matters always arrives as one.
   * Running once at start covers only a spend that predates the session.
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
    // createSwap/cancelSwap close over these; the signer key reaches cancelSwap
    // through classifyDeposit, which reads the leaf against it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markets, swapAvailable, swaps, svcWallet, emulatorPubkey, aspInfo.url, aspInfo.network, aspInfo.signerPubkey],
  )

  return <AssetSwapsContext.Provider value={value}>{children}</AssetSwapsContext.Provider>
}
