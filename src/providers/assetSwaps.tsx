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
import { hex } from '@scure/base'
import { asset, RestIndexerProvider, type NetworkName } from '@arkade-os/sdk'
import {
  addAssetSwap,
  BTC_ASSET_ID,
  cancelOffer,
  createOffer,
  decodeOffer,
  findMarket,
  getAssetSwaps,
  restoreAssetSwaps,
  updateAssetSwap,
  watchOfferSwaps,
  type AssetSwap,
  type OfferSwapWatcher,
} from '@arkade-os/swap'
import { DiscoveredMarket, OfferPlan } from '@arkade-os/solver-discovery'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { discoverMarkets } from '../lib/swapMarkets'
import { assetSwapRepository, type AssetSwapQuoteSnapshot, type WalletAssetSwap } from '../lib/swapRepository'
import { isCancelSpend } from '../lib/swapSpend'
import { getTxHistory } from '../lib/asp'
import { getEmulatorPubkeyForNetwork, getEmulatorPubkeyHexForNetwork } from '../lib/constants'
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
  const { dataReady, svcWallet, reloadWallet, setAssetSwaps, txs } = useContext(WalletContext)

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

  // The store is async now, so the list arrives after the first render rather
  // than with it. Re-read on every dataReady transition: a wallet reset clears
  // the repository, and the emptied list has to reach the UI.
  useEffect(() => {
    readSwaps()
      .then(applySwaps)
      .catch((err) => consoleError(err, 'failed to read asset swaps'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady])

  // publish to the wallet provider, which merges swaps into the activity list;
  // it owns `txs`, so the list travels up rather than being read back down
  useEffect(() => setAssetSwaps(swaps), [swaps, setAssetSwaps])

  // The covenant co-signer's key, read from config rather than fetched: clients
  // have no network path to the emulator, so the old reachability probe would
  // fail in any correct deployment and hide swaps entirely. Config presence is
  // the honest gate — it answers the question the UI actually needs ("can we
  // derive a covenant at all?") rather than one about the client's own
  // connectivity.
  //
  // Derived, not stored: `hex.decode` hands back a fresh Uint8Array every call,
  // so holding it in state re-published the context on every discovery run for
  // a value that never changed.
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

  // Discovery runs once the network is known (discoverMarkets' TTL cache is the
  // rate limiter), and again whenever the pinned solver cards change. A card is
  // a market source that lives outside React, so the store publishes a version
  // and this effect takes it as a dependency: without that, a card written
  // after the per-network run — the Nostr backup restoring one, which lands
  // well after the network resolves — left the swap screen reading "coming
  // soon" until the app was reloaded.
  const cardsVersion = useSyncExternalStore(subscribeSolverCards, getSolverCardsVersion, getSolverCardsVersion)
  const discoveredNetwork = useRef<string>()

  useEffect(() => {
    if (!aspInfo.network) return
    const switched = discoveredNetwork.current !== aspInfo.network
    discoveredNetwork.current = aspInfo.network
    // Only a switch empties the list: the previous network's markets must never
    // stay on screen, while a card write only adds to the current set and can
    // refresh in place. Cards also bypass the TTL cache on purpose — it holds
    // the registry's answer, which is exactly what a new card changes.
    if (switched) setMarkets([])
    runDiscovery(aspInfo.network as NetworkName, switched)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.network, cardsVersion])

  // After a restore the swap store is empty while the funding/fill txs are
  // back in history, so swaps would show as bare sent/received rows. Scan the
  // sent virtual txs for offer packets and rebuild the lost records by
  // binding each funding vtxo to the tx that spent it (fill or cancel). The
  // scan is incremental — answered txids persist, so late-synced history is
  // picked up by later runs and nothing is fetched twice.
  const scanningRef = useRef(false)
  const rescanRef = useRef(false)
  // Bumped to re-enter the effect when a queued rescan has to start, since no
  // dependency of its own has changed by then.
  const [scanTick, setScanTick] = useState(0)
  // Read inside the scan so a re-run sees the history that arrived while the
  // previous one was in flight, rather than the list its effect closed over.
  // Committed values only: a render React discards must not reach a scan that
  // is already running, or it would mark txids from history that never landed.
  const txsRef = useRef(txs)
  useLayoutEffect(() => {
    txsRef.current = txs
  }, [txs])

  // Which wallet a scan belongs to, as a token rather than a cancellation flag.
  // The cleanup fires exactly when the wallet changed or the provider went
  // away — the two cases a running scan must abandon its writes — while a
  // change to `txs`, which must NOT abandon one, is deliberately not a
  // dependency here. Every setup mints a fresh token, so StrictMode's
  // setup/cleanup/setup cannot strand a scan against a dead one.
  const scanTokenRef = useRef({ live: true })
  useEffect(() => {
    const token = { live: true }
    scanTokenRef.current = token
    return () => {
      token.live = false
    }
  }, [aspInfo.url, aspInfo.signerPubkey, dataReady])

  useEffect(() => {
    if (!aspInfo.url || !aspInfo.signerPubkey || !dataReady || txs.length === 0) return
    // A run is already in flight and cannot see this newer history: ask it to go
    // round again instead of dropping the change. Returning without this is what
    // made a skipped run a lost one.
    if (scanningRef.current) {
      rescanRef.current = true
      return
    }
    // a wallet reset may have cleared the repository while the scan ran —
    // never write the old wallet's records into it. The repository clears
    // asynchronously, so this is re-checked before every write below rather
    // than once.
    const token = scanTokenRef.current
    const stale = () => !token.live
    const scan = async () => {
      const [existing, scanned] = await Promise.all([readSwaps(), assetSwapRepository.getScannedTxids()])
      const { restored, scannedTxids } = await restoreAssetSwaps(
        new RestIndexerProvider(aspInfo.url),
        txsRef.current,
        new Set(existing.map((s) => s.id)),
        // x-only, matching the key the covenants were funded against
        { serverPubkey: hex.decode(aspInfo.signerPubkey).slice(1), scanned },
      )
      if (stale()) return
      // a run with nothing new to answer for opens no transaction at all
      if (scannedTxids.length > 0) await assetSwapRepository.markTxidsScanned(scannedTxids)
      if (restored.length === 0) return
      let next: WalletAssetSwap[] = []
      for (const swap of restored) {
        if (stale()) return
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
      reloadWallet().catch(consoleError)
    }
    scanningRef.current = true
    scan()
      .catch((err) => consoleError(err, 'swap restore scan failed'))
      .finally(() => {
        scanningRef.current = false
        // the CURRENT token, not this run's: a run whose own token died is
        // exactly the one whose queued work still has to happen, under the
        // wallet that replaced it. Only an unmount leaves no live token behind.
        if (!rescanRef.current || !scanTokenRef.current.live) return
        rescanRef.current = false
        // Re-enter through the effect rather than calling the scan again here:
        // this closure is bound to the wallet it started with, and a fresh
        // effect run reads the current one, re-checking every guard above.
        setScanTick((tick) => tick + 1)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.url, aspInfo.signerPubkey, dataReady, txs, scanTick])

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
        toast.success('Swap cancelled, funds returned')
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

    // Re-read after the async history lookup so a completed cancelOffer call
    // or the watcher always wins over this reconciliation.
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
    reloadWallet().catch(consoleError)
    return true
  }

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
    if (updated.status === 'fulfilled') {
      toast.success(`Swap completed, ${tickerFor(updated.toAsset)} received`)
      reloadWallet().catch(consoleError)
    } else if (updated.status === 'cancelled') {
      toast.success('Swap cancelled, funds returned')
      reloadWallet().catch(consoleError)
    }
  }

  // The watcher rides the wallet's contract events — registration in
  // createOffer is what makes an offer visible to it — and persists each
  // classified spend itself.
  //
  // Known gap: it subscribes to spends only, so a swept deposit is no longer
  // noticed live. That status now waits for the next restore scan, which still
  // produces it. Latency, not loss.
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
