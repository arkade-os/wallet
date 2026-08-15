import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { hex } from '@scure/base'
import { ArkAddress, RestArkProvider, RestIndexerProvider, type NetworkName } from '@arkade-os/sdk'
import { cancelOffer } from '@arkade-os/swap'
import {
  buildBook,
  deadOrders,
  pairKeyOf,
  pairsOf,
  placeOrder,
  readBook,
  takeOrder,
  type Book,
  type BookOrder,
  type BookRow,
} from '../lib/book'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { assetSwapRepository } from '../lib/swapRepository'
import { getEmulatorPubkeyForNetwork, getEmulatorPubkeyHexForNetwork, getEmulatorUrlForNetwork } from '../lib/constants'
import { getStorageItem, setStorageItemSafely } from '../lib/storage'
import { consoleError } from '../lib/logs'
import { toast } from '../components/Toast'

interface PlaceParams {
  give: { assetId: string; amount: bigint }
  want: { assetId: string; amount: bigint }
}

interface OrderBookContextProps {
  /** Every live order across every pair. */
  orders: BookOrder[]
  /** Pairs with at least one resting order, busiest first. */
  pairs: { pairKey: string; count: number }[]
  bookFor: (pairKey: string) => Book
  /** Orders whose payout script is ours — the ones we can pull. */
  myOrders: BookOrder[]
  /** Whether this deployment can submit a fill at all. */
  takeable: boolean
  /** The stream is running and the book is as complete as it gets. */
  ready: boolean
  /** Fill a resting order if this one crosses it, otherwise rest. */
  trade: (params: PlaceParams) => Promise<TradeOutcome>
  /** The row `trade` would fill for these terms, or undefined if it would rest.
   * Exported so the composer can tell the truth before anything is submitted. */
  matchFor: (params: PlaceParams) => BookRow | undefined
  take: (orderId: string) => Promise<string>
  pull: (orderId: string) => Promise<void>
}

export type TradeOutcome = { kind: 'filled'; txid: string } | { kind: 'placed' }

const notReady = () => {
  throw new Error('order book not initialized')
}

export const OrderBookContext = createContext<OrderBookContextProps>({
  orders: [],
  pairs: [],
  bookFor: (pairKey: string) => ({ pairKey, asks: [], bids: [] }),
  myOrders: [],
  trade: notReady,
  matchFor: () => undefined,
  takeable: false,
  ready: false,
  take: notReady,
  pull: notReady,
})

const CACHE_KEY = 'order_book_v1'

/** Orders survive a reload as JSON, so bigints go out as strings and come back
 * parsed. A cached row is only a hint — `deadOrders` reconciles the whole set
 * against the indexer on mount before any of it is shown as live. */
type StoredOrder = Omit<BookOrder, 'give' | 'want' | 'depositSats'> & {
  give: { assetId: string; amount: string }
  want: { assetId: string; amount: string }
  depositSats: string
}

const toStored = (o: BookOrder): StoredOrder => ({
  ...o,
  give: { assetId: o.give.assetId, amount: o.give.amount.toString() },
  want: { assetId: o.want.assetId, amount: o.want.amount.toString() },
  depositSats: o.depositSats.toString(),
})

const fromStored = (o: StoredOrder): BookOrder => ({
  ...o,
  give: { assetId: o.give.assetId, amount: BigInt(o.give.amount) },
  want: { assetId: o.want.assetId, amount: BigInt(o.want.amount) },
  depositSats: BigInt(o.depositSats),
})

export const OrderBookProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { dataReady, svcWallet, reloadWallet } = useContext(WalletContext)

  const [orders, setOrders] = useState<BookOrder[]>([])
  const [ready, setReady] = useState(false)
  const [myPkScript, setMyPkScript] = useState<string>()

  const network = aspInfo.network as NetworkName | undefined
  const emulatorUrl = network ? getEmulatorUrlForNetwork(network) : undefined
  const [emulatorPubkey, setEmulatorPubkey] = useState<Uint8Array>()

  // The co-signer decides which offers are even fillable here, so without it
  // there is no book to show. Prefer the pin: it is what stops a host swapping
  // the key under a running client, and that property is the whole reason the
  // table exists. Fall back to asking the emulator ONLY where no pin exists —
  // a local stack mints a fresh key per deployment, so there is nothing to
  // review it against, and the alternative is a permanently dark book.
  useEffect(() => {
    if (!network) return setEmulatorPubkey(undefined)
    const pinned = getEmulatorPubkeyForNetwork(network)
    if (pinned || !emulatorUrl) return setEmulatorPubkey(pinned)

    let cancelled = false
    fetch(`${emulatorUrl}/v1/info`)
      .then((res) => res.json())
      .then((info) => {
        if (cancelled || typeof info?.signerPubkey !== 'string') return
        const key = hex.decode(info.signerPubkey)
        setEmulatorPubkey(key.length === 33 ? key.slice(1) : key)
      })
      .catch((err) => consoleError(err, 'could not read the emulator co-signer'))
    return () => {
      cancelled = true
    }
  }, [network, emulatorUrl])

  // The stream outlives every render, so it reads the current id set through a
  // ref rather than the value captured when it was started.
  const ordersRef = useRef(orders)
  ordersRef.current = orders

  const apply = (next: BookOrder[]) => {
    ordersRef.current = next
    setOrders(next)
    setStorageItemSafely(CACHE_KEY, JSON.stringify(next.map(toStored)), 'order book cache')
  }

  useEffect(() => {
    if (!svcWallet) return
    svcWallet
      .getAddress()
      .then((address) => setMyPkScript(hex.encode(ArkAddress.decode(address).pkScript)))
      .catch((err) => consoleError(err, 'could not read our own payout script'))
  }, [svcWallet])

  // Follow the transaction stream. Both halves of an order's life arrive as
  // push events, so there is nothing to poll and nothing to refetch here.
  useEffect(() => {
    if (!aspInfo.url || !network || !dataReady || !emulatorPubkey) return

    const controller = new AbortController()
    const arkProvider = new RestArkProvider(aspInfo.url)
    const indexer = new RestIndexerProvider(aspInfo.url)

    const start = async () => {
      // The stream only reports what happens while it is open, so the cached
      // book is reconciled once before it is trusted. Rows that died while the
      // app was closed never reach the UI as live.
      const cached = getStorageItem<StoredOrder[]>(CACHE_KEY, [], JSON.parse)
      let restored: BookOrder[] = []
      try {
        restored = cached.map(fromStored)
      } catch {
        restored = [] // a cache written by an older shape is not worth salvaging
      }
      if (restored.length > 0) {
        try {
          const dead = new Set(await deadOrders(indexer, restored))
          restored = restored.filter((o) => !dead.has(o.id))
        } catch (err) {
          // unreachable indexer: show the cache rather than an empty book. A
          // stale row costs a failed take, which the fill path already reads as
          // "someone else took it".
          consoleError(err, 'could not reconcile the cached book')
        }
      }
      apply(restored)
      setReady(true)

      await readBook({
        arkProvider,
        emulatorPubkey,
        signal: controller.signal,
        liveIds: () => new Set(ordersRef.current.map((o) => o.id)),
        onOrder: (order) => {
          if (ordersRef.current.some((o) => o.id === order.id)) return
          apply([order, ...ordersRef.current])
        },
        onGone: (ids) => {
          const gone = new Set(ids)
          apply(ordersRef.current.filter((o) => !gone.has(o.id)))
        },
        onError: (err) => consoleError(err, 'order book stream'),
      })
    }

    start().catch((err) => consoleError(err, 'order book failed to start'))
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.url, network, dataReady, emulatorPubkey])

  const deps = () => {
    if (!svcWallet || !aspInfo.url || !network) throw new Error('wallet not available')
    return { wallet: svcWallet, arkServerUrl: aspInfo.url, network, dust: BigInt(aspInfo.dust) }
  }

  const place = async (params: PlaceParams) => {
    await placeOrder(deps(), {
      ...params,
      emulatorPubkey: getEmulatorPubkeyHexForNetwork(network as NetworkName),
    })
    // the stream reports our own order like anyone else's; nothing to insert here
    toast.success('order placed')
    reloadWallet().catch(consoleError)
  }

  const take = async (orderId: string) => {
    const order = ordersRef.current.find((o) => o.id === orderId)
    if (!order) throw new Error('that order is no longer resting')
    if (!emulatorUrl) throw new Error('taking is unavailable on this network')
    if (!aspInfo.signerPubkey) throw new Error('server key unknown')

    const txid = await takeOrder(deps(), {
      order,
      // x-only, matching the key the covenant was funded against
      serverPubkey: hex.decode(aspInfo.signerPubkey).slice(1),
      emulatorUrl,
    })
    // drop it immediately rather than waiting for the stream to say so — we
    // just spent it, and a row that lingers invites a second tap
    apply(ordersRef.current.filter((o) => o.id !== orderId))
    toast.success('filled')
    reloadWallet().catch(consoleError)
    return txid
  }

  const pull = async (orderId: string) => {
    const order = ordersRef.current.find((o) => o.id === orderId)
    if (!order) throw new Error('that order is no longer resting')
    if (!svcWallet || !aspInfo.url) throw new Error('wallet not available')

    await cancelOffer(svcWallet, aspInfo.url, order.offerHex, {
      repository: assetSwapRepository,
      // No swapAddress: cancelOffer decodes it as an ArkAddress to pin the
      // server key, and a BookOrder carries the covenant's pkScript, not its
      // address. Passing the script here threw inside decode and left the order
      // sitting in the ladder. Omitting it is the documented fallback — the
      // call just uses the client's current server key, losing only the
      // detection of a key rotated since funding.
      fundingTxid: order.fundingTxid,
    })
    apply(ordersRef.current.filter((o) => o.id !== orderId))
    toast.success('order cancelled, funds returned')
    reloadWallet().catch(consoleError)
  }

  const myPkScripts = useMemo(() => new Set(myPkScript ? [myPkScript] : []), [myPkScript])

  /**
   * The resting row these terms would fill, if any.
   *
   * Stated in the covenant's own language rather than in sides: a row I can
   * take is one that **gives exactly what I want, and wants no more than I am
   * offering**. Exactly, because a fill is all-or-nothing — the covenant has no
   * remainder path, so a row worth 1,000 cannot settle an order for 100. That
   * is the whole reason two opposing orders can sit crossed and never meet.
   *
   * `mine` is excluded: taking your own order would spend your deposit to pay
   * yourself, burning the fee for nothing.
   *
   * Both sides arrive pre-sorted best-first, so the first match is the best
   * price available.
   */
  const matchFor = ({ give, want }: PlaceParams): BookRow | undefined => {
    const book = buildBook(orders, pairKeyOf(give.assetId, want.assetId), myPkScripts)
    return [...book.asks, ...book.bids].find(
      (row) =>
        !row.mine &&
        // Both directions are fillable: takeOrder pays sats into an ask and
        // delivers the asset into a bid, returning its own surplus in the same
        // asset packet. Nothing about the side is filtered here — a match the
        // UI reports is a promise, and only terms it can actually keep belong
        // in it, which is what the four clauses below check.
        row.give.assetId === want.assetId &&
        row.give.amount === want.amount &&
        row.want.assetId === give.assetId &&
        row.want.amount <= give.amount,
    )
  }

  /**
   * Submit an order: fill a crossing row if there is one, otherwise rest.
   *
   * This is the whole difference between a book and a pile of orders. There is
   * no matching engine anywhere in Arkade — two resting covenants never settle
   * each other, because settling one requires spending it, and only a taker
   * does that. So the moment a user's terms cross the book, the app must take
   * rather than post, or the order simply joins the pile.
   */
  const trade = async (params: PlaceParams): Promise<TradeOutcome> => {
    const match = matchFor(params)
    if (match && emulatorUrl) return { kind: 'filled', txid: await take(match.id) }
    await place(params)
    return { kind: 'placed' }
  }

  const value = useMemo(
    () => ({
      orders,
      pairs: pairsOf(orders),
      bookFor: (pairKey: string) => buildBook(orders, pairKey, myPkScripts),
      trade,
      matchFor,
      myOrders: orders.filter((o) => myPkScripts.has(o.makerPkScript)),
      takeable: Boolean(emulatorUrl),
      ready,
      take,
      pull,
    }),
    // place/take/pull close over these
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, myPkScripts, emulatorUrl, ready, svcWallet, aspInfo.url, aspInfo.dust, aspInfo.signerPubkey, network],
  )

  return <OrderBookContext.Provider value={value}>{children}</OrderBookContext.Provider>
}
