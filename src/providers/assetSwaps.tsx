import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { hex } from '@scure/base'
import { asset, RestEmulatorProvider, RestIndexerProvider } from '@arkade-os/sdk'
import { DiscoveredMarket, OfferPlan } from '@arkade-os/solver-discovery'
import { Network } from '@arkade-os/boltz-swap'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { cancelOffer, createOffer, OFFER_PACKET_TYPE } from '../lib/swap/offer'
import { BTC_ASSET_ID, discoverMarkets } from '../lib/swap/markets'
import { addAssetSwap, AssetSwap, getAssetSwaps, updateAssetSwap } from '../lib/swap/store'
import { getEmulatorUrlForNetwork } from '../lib/constants'
import { consoleError } from '../lib/logs'
import { toast } from '../components/Toast'

const POLL_INTERVAL_MS = 5_000

interface AssetSwapsContextProps {
  /** Markets from the network's solver registry. */
  markets: DiscoveredMarket[]
  /** True when there are markets and the covenant co-signer is reachable. */
  swapAvailable: boolean
  swaps: AssetSwap[]
  createSwap: (plan: OfferPlan) => Promise<AssetSwap>
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
  const { svcWallet, reloadWallet } = useContext(WalletContext)

  const [markets, setMarkets] = useState<DiscoveredMarket[]>([])
  const [emulatorUrl, setEmulatorUrl] = useState<string>()
  const [swaps, setSwaps] = useState<AssetSwap[]>([])

  useEffect(() => {
    setSwaps(getAssetSwaps())
  }, [])

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

  const tickerFor = (assetId: string): string => {
    if (assetId === BTC_ASSET_ID) return 'BTC'
    for (const market of markets) {
      if (market.quote_asset.id === assetId) return market.quote_asset.ticker
      if (market.base_asset.id === assetId) return market.base_asset.ticker
    }
    return assetId.slice(0, 8)
  }

  const createSwap = async (plan: OfferPlan): Promise<AssetSwap> => {
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
    }
    setSwaps(addAssetSwap(swap))
    reloadWallet().catch(consoleError)
    return swap
  }

  const cancelSwap = async (id: string): Promise<void> => {
    if (!svcWallet) throw new Error('wallet not available')
    const swap = getAssetSwaps().find((s) => s.id === id)
    if (!swap) throw new Error('swap not found')
    // leave 'pending' before spending so the poller can't read the cancel
    // spend as a fulfillment
    setSwaps(updateAssetSwap(id, { status: 'cancelling' }))
    try {
      await cancelOffer(svcWallet, aspInfo.url, swap.offerHex, swap.fundingTxid)
    } catch (err) {
      setSwaps(updateAssetSwap(id, { status: swap.status }))
      throw err
    }
    setSwaps(updateAssetSwap(id, { status: 'cancelled' }))
    toast.success('Swap cancelled, funds returned')
    reloadWallet().catch(consoleError)
  }

  // ponytail: plain polling while swaps are pending; the indexer SSE
  // subscription is the upgrade path if this ever gets chatty
  const pendingScripts = swaps
    .filter((s) => s.status === 'pending')
    .map((s) => s.swapPkScript)
    .join(',')

  useEffect(() => {
    if (!pendingScripts || !aspInfo.url) return
    const indexer = new RestIndexerProvider(aspInfo.url)
    const check = async () => {
      try {
        const { vtxos } = await indexer.getVtxos({ scripts: pendingScripts.split(',') })
        for (const vtxo of vtxos) {
          const state = vtxo.virtualStatus.state
          if (state !== 'spent' && state !== 'swept') continue
          // re-read the store so an in-flight check never overwrites a cancel
          // (cancelOffer also spends the swap vtxo)
          const swap = getAssetSwaps().find((s) => s.swapPkScript === vtxo.script && s.status === 'pending')
          if (!swap) continue
          if (state === 'spent') {
            setSwaps(updateAssetSwap(swap.id, { status: 'fulfilled', spentTxid: vtxo.arkTxId ?? vtxo.spentBy }))
            toast.success(`Swap completed, ${tickerFor(swap.toAsset)} received`)
            reloadWallet().catch(consoleError)
          } else {
            setSwaps(updateAssetSwap(swap.id, { status: 'recoverable' }))
          }
        }
      } catch (err) {
        consoleError(err, 'swap status check failed')
      }
    }
    check()
    const interval = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScripts, aspInfo.url])

  const swapAvailable = markets.length > 0 && Boolean(emulatorUrl)
  const value = useMemo(
    () => ({ markets, swapAvailable, swaps, createSwap, cancelSwap }),
    // createSwap/cancelSwap close over these
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markets, swapAvailable, swaps, svcWallet, emulatorUrl, aspInfo.url],
  )

  return <AssetSwapsContext.Provider value={value}>{children}</AssetSwapsContext.Provider>
}
