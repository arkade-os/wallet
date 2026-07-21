import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { hex } from '@scure/base'
import { asset, RestEmulatorProvider, RestIndexerProvider, type VirtualCoin } from '@arkade-os/sdk'
import { DiscoveredMarket, OfferPlan } from '@arkade-os/solver-discovery'
import { Network } from '@arkade-os/boltz-swap'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { cancelOffer, createOffer, decodeOffer, OFFER_PACKET_TYPE } from '../lib/swap/offer'
import { BTC_ASSET_ID, discoverMarkets } from '../lib/swap/markets'
import { getScannedTxids, isCancelSpend, markTxidsScanned, restoreAssetSwaps } from '../lib/swap/restore'
import { addAssetSwap, AssetSwap, type AssetSwapQuoteSnapshot, getAssetSwaps, updateAssetSwap } from '../lib/swap/store'
import { getTxHistory } from '../lib/asp'
import { getEmulatorUrlForNetwork } from '../lib/constants'
import { consoleError } from '../lib/logs'
import { sleep } from '../lib/sleep'
import { toast } from '../components/Toast'

const STREAM_RETRY_MS = 5_000
const SAFETY_RECONCILE_MS = 60_000

interface AssetSwapsContextProps {
  /** Markets from the network's solver registry. */
  markets: DiscoveredMarket[]
  /** True when there are markets and the covenant co-signer is reachable. */
  swapAvailable: boolean
  swaps: AssetSwap[]
  createSwap: (plan: OfferPlan, quote?: AssetSwapQuoteSnapshot) => Promise<AssetSwap>
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
  const { dataReady, svcWallet, reloadWallet, txs } = useContext(WalletContext)

  const [markets, setMarkets] = useState<DiscoveredMarket[]>([])
  const [emulatorUrl, setEmulatorUrl] = useState<string>()
  const [swaps, setSwaps] = useState<AssetSwap[]>(getAssetSwaps)

  // discover markets and probe the emulator once the network is known;
  // stale results from a previous network must never land after a switch
  useEffect(() => {
    setMarkets([])
    setEmulatorUrl(undefined)
    if (!aspInfo.network) return
    let cancelled = false
    const network = aspInfo.network as Network
    discoverMarkets(network)
      .then((found) => {
        if (!cancelled) setMarkets(found)
      })
      .catch((err) => consoleError(err, 'solver discovery failed'))
    const url = getEmulatorUrlForNetwork(network)
    if (url) {
      new RestEmulatorProvider(url)
        .getInfo()
        .then(() => {
          if (!cancelled) setEmulatorUrl(url)
        })
        .catch((err) => consoleError(err, 'swap emulator unreachable'))
    }
    return () => {
      cancelled = true
    }
  }, [aspInfo.network])

  // After a restore the swap store is empty while the funding/fill txs are
  // back in history, so swaps would show as bare sent/received rows. Scan the
  // sent virtual txs for offer packets and rebuild the lost records by
  // binding each funding vtxo to the tx that spent it (fill or cancel). The
  // scan is incremental — answered txids persist, so late-synced history is
  // picked up by later runs and nothing is fetched twice.
  const scanningRef = useRef(false)
  useEffect(() => {
    if (!aspInfo.url || !dataReady || txs.length === 0 || scanningRef.current) return
    let cancelled = false
    scanningRef.current = true
    restoreAssetSwaps(
      new RestIndexerProvider(aspInfo.url),
      txs,
      new Set(getAssetSwaps().map((s) => s.id)),
      getScannedTxids(),
    )
      .then(({ restored, scannedTxids }) => {
        // a wallet reset may have wiped storage while the scan ran — never
        // write the old profile's records into the cleared store
        if (cancelled) return
        markTxidsScanned(scannedTxids)
        if (restored.length === 0) return
        let next: AssetSwap[] = []
        for (const swap of restored) next = addAssetSwap(swap)
        setSwaps(next)
        // re-merge the activity list so the tx couple collapses into Swap rows
        reloadWallet().catch(consoleError)
      })
      .catch((err) => consoleError(err, 'swap restore scan failed'))
      .finally(() => {
        scanningRef.current = false
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.url, dataReady, txs])

  // read through a ref so the monitor effect (which deliberately does not
  // rebind on market refreshes) always names assets from the current list
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

  const createSwap = async (plan: OfferPlan, quote?: AssetSwapQuoteSnapshot): Promise<AssetSwap> => {
    if (!svcWallet) throw new Error('wallet not available')
    if (!emulatorUrl) throw new Error('swap service unavailable')
    const depositIsBtc = plan.deposit.asset.id === BTC_ASSET_ID
    const offer = await createOffer(svcWallet, aspInfo.url, emulatorUrl, {
      wantAmount: plan.receive.atomic,
      ...(depositIsBtc
        ? { wantAsset: asset.AssetId.fromString(plan.receive.asset.id) }
        : { offerAsset: asset.AssetId.fromString(plan.deposit.asset.id) }),
    })
    const txid = await svcWallet.send({
      address: offer.address,
      // asset deposits ride on a dust sat carrier (sdk default when omitted)
      amount: depositIsBtc ? Number(plan.deposit.atomic) : undefined,
      assets: depositIsBtc ? undefined : [{ assetId: plan.deposit.asset.id, amount: plan.deposit.atomic }],
      extensions: [{ type: OFFER_PACKET_TYPE, payload: offer.payload }],
    })
    const swap: AssetSwap = {
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
    setSwaps(addAssetSwap(swap))
    reloadWallet().catch(consoleError)
    return swap
  }

  const cancelSwap = async (id: string): Promise<void> => {
    if (!svcWallet) throw new Error('wallet not available')
    const swap = getAssetSwaps().find((s) => s.id === id)
    if (!swap) throw new Error('swap not found')
    // leave 'pending' before spending so the monitor can't read the cancel
    // spend as a fulfillment
    setSwaps(updateAssetSwap(id, { status: 'cancelling' }))
    try {
      const cancelTxid = await cancelOffer(svcWallet, aspInfo.url, swap.offerHex, swap.fundingTxid, swap.swapAddress)
      // Persist the spend ID returned by the wallet so the receipt remains
      // complete after refresh and does not depend on a later monitor pass.
      if (getAssetSwaps().find((candidate) => candidate.id === id)?.status === 'cancelling') {
        setSwaps(updateAssetSwap(id, { status: 'cancelled', spentTxid: cancelTxid }))
        toast.success('Swap cancelled, funds returned')
        reloadWallet().catch(consoleError)
      }
    } catch (err) {
      // the cancel tx may have broadcast before the failure surfaced; only
      // revert while the deposit is provably unspent, otherwise stay
      // 'cancelling' and let the monitor resolve what the spend was
      try {
        const { vtxos } = await new RestIndexerProvider(aspInfo.url).getVtxos({ scripts: [swap.swapPkScript] })
        const deposit = vtxos.find((v) => v.txid === swap.fundingTxid)
        const state = deposit?.virtualStatus.state
        if (deposit && state === 'spent') {
          if (await resolveCancellingSpend(swap, deposit.arkTxId ?? deposit.spentBy)) return
        } else if (state === 'swept') {
          setSwaps(updateAssetSwap(id, { status: 'recoverable' }))
          return
        } else if (state) {
          setSwaps(updateAssetSwap(id, { status: swap.status }))
        }
      } catch {
        // indexer unreachable: keep 'cancelling'; the monitor resolves it later
      }
      throw err
    }
  }

  const resolveCancellingSpend = async (swap: AssetSwap, spentTxid?: string): Promise<boolean> => {
    if (!svcWallet || !spentTxid) return false
    const spend = (await getTxHistory(svcWallet)).find((tx) =>
      [tx.boardingTxid, tx.redeemTxid, tx.roundTxid].includes(spentTxid),
    )
    if (!spend) return false

    // Re-read after the async history lookup so a completed cancelOffer call
    // or another monitor pass always wins over this reconciliation.
    if (getAssetSwaps().find((candidate) => candidate.id === swap.id)?.status !== 'cancelling') return true
    const cancelled = isCancelSpend(decodeOffer(hex.decode(swap.offerHex)), spend)
    setSwaps(
      updateAssetSwap(swap.id, {
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

  // Pending and cancelling swaps stay watched until their spend can be
  // classified as fulfilled, cancelled or recoverable.
  const watchedScripts = swaps
    .filter((s) => s.status === 'pending' || s.status === 'cancelling')
    .map((s) => s.swapPkScript)
    .join(',')

  // tear the monitor down while the tab is hidden — zero background traffic;
  // the reconcile on refocus catches anything missed in the meantime
  const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // ponytail: one SSE subscription while swaps are pending, reconciled with a
  // single getVtxos on each (re)connect since the stream has no replay; a slow
  // safety reconcile stands in for a heartbeat watchdog on hung streams
  useEffect(() => {
    if (!watchedScripts || !aspInfo.url || !visible || !svcWallet) return
    const scripts = watchedScripts.split(',')
    const indexer = new RestIndexerProvider(aspInfo.url)
    const abort = new AbortController()

    const applyVtxos = (vtxos: VirtualCoin[]) => {
      for (const vtxo of vtxos) {
        const state = vtxo.virtualStatus.state
        if (state !== 'spent' && state !== 'swept') continue
        // re-read the store so an in-flight update never overwrites a newer
        // status; vtxo.txid is the funding txid, so identical offers (which
        // share one covenant address) resolve to the right record
        const swap = getAssetSwaps().find(
          (s) =>
            s.swapPkScript === vtxo.script &&
            s.id === vtxo.txid &&
            (s.status === 'pending' || s.status === 'cancelling'),
        )
        if (!swap) continue
        if (state === 'swept') {
          setSwaps(updateAssetSwap(swap.id, { status: 'recoverable' }))
        } else if (swap.status === 'cancelling') {
          // The solver may win after cancellation starts. Classify the spend
          // from wallet history instead of assuming every race is a cancel.
          resolveCancellingSpend(swap, vtxo.arkTxId ?? vtxo.spentBy).catch((err) =>
            consoleError(err, 'swap cancellation reconciliation failed'),
          )
        } else {
          setSwaps(
            updateAssetSwap(swap.id, {
              status: 'fulfilled',
              spentTxid: vtxo.arkTxId ?? vtxo.spentBy,
              completedAt: Date.now(),
            }),
          )
          toast.success(`Swap completed, ${tickerFor(swap.toAsset)} received`)
          reloadWallet().catch(consoleError)
        }
      }
    }

    const reconcile = async () => {
      const { vtxos } = await indexer.getVtxos({ scripts })
      applyVtxos(vtxos)
    }

    const subscribe = async () => {
      const subscriptionId = await indexer.subscribeForScripts(scripts)
      try {
        const stream = indexer.getSubscription(subscriptionId, abort.signal)
        // start the stream before the reconcile snapshot so a spend landing in
        // between reaches one of the two (the stream has no replay)
        let pending = stream.next()
        await reconcile()
        for (;;) {
          const { value, done } = await pending
          if (done || !value) break
          applyVtxos([...value.newVtxos, ...value.spentVtxos, ...value.sweptVtxos])
          pending = stream.next()
        }
      } finally {
        indexer.unsubscribeForScripts(subscriptionId).catch(() => {})
      }
    }

    const monitor = async () => {
      while (!abort.signal.aborted) {
        try {
          await subscribe()
        } catch (err) {
          if (!abort.signal.aborted) consoleError(err, 'swap status monitor failed')
        }
        if (abort.signal.aborted) return
        await sleep(STREAM_RETRY_MS)
      }
    }
    monitor()

    const safety = setInterval(() => {
      reconcile().catch((err) => consoleError(err, 'swap status check failed'))
    }, SAFETY_RECONCILE_MS)

    return () => {
      clearInterval(safety)
      abort.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedScripts, aspInfo.url, visible, svcWallet])

  const swapAvailable = markets.length > 0 && Boolean(emulatorUrl)
  const value = useMemo(
    () => ({ markets, swapAvailable, swaps, createSwap, cancelSwap }),
    // createSwap/cancelSwap close over these
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markets, swapAvailable, swaps, svcWallet, emulatorUrl, aspInfo.url],
  )

  return <AssetSwapsContext.Provider value={value}>{children}</AssetSwapsContext.Provider>
}
