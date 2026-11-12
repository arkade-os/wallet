/**
 * The public standing book.
 *
 * The page subscribes. Rows are decoded from the indexer's filtered offer
 * stream and kept here; they are not written into ContractManager, because
 * that repository is the wallet's own contracts and these scripts belong to
 * whoever funded them. Our own posts still go through `createOffer`, which
 * registers the covenant it derives. A reload reconciles the cache once.
 */
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { hex } from '@scure/base'
import { ArkAddress, RestIndexerProvider, type NetworkName } from '@arkade-os/sdk'
import {
  baseOf,
  buildBook,
  deadOrders,
  isBtc,
  pairKeyOf,
  pairKeyOfOrder,
  placeOrder,
  pullOrder,
  readBook,
  takeOrder,
  type Book,
  type BookOrder,
  type BookRow,
  type OrderTerms,
  matchRow,
} from '../lib/book'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { assetSwapRepository } from '../lib/swapRepository'
import {
  getEmulatorPubkeyForNetwork,
  getEmulatorPubkeyOverrideForNetwork,
  getEmulatorUrlForNetwork,
} from '../lib/constants'
import { getStorageItem, setStorageItemSafely } from '../lib/storage'
import { consoleError } from '../lib/logs'

const NETWORKS: readonly NetworkName[] = ['bitcoin', 'mutinynet', 'regtest', 'signet', 'testnet']

const asNetwork = (value: string | undefined): NetworkName | undefined =>
  value && (NETWORKS as readonly string[]).includes(value) ? (value as NetworkName) : undefined

export type TradeOutcome = { kind: 'filled'; txid: string } | { kind: 'placed'; fundingTxid: string }

interface OrderBookContextProps {
  orders: BookOrder[]
  bookFor: (pairKey: string) => Book
  takeable: boolean
  ready: boolean
  /** Fill a resting order when one gives exactly what is wanted. Otherwise rest. */
  trade: (terms: OrderTerms) => Promise<TradeOutcome>
  /** The row `trade` would fill, so the sheet can say so before it submits. */
  matchFor: (terms: OrderTerms) => BookRow | undefined
  pull: (orderId: string) => Promise<void>
}

const emptyBook = (pairKey: string): Book => ({ pairKey, asks: [], bids: [] })

const notReady = (): Promise<never> => Promise.reject(new Error('order book not initialized'))

export const OrderBookContext = createContext<OrderBookContextProps>({
  orders: [],
  bookFor: emptyBook,
  takeable: false,
  ready: false,
  trade: notReady,
  matchFor: () => undefined,
  pull: notReady,
})

type StoredOrder = Omit<BookOrder, 'give' | 'want' | 'depositSats'> & {
  give: { assetId: string; amount: string }
  want: { assetId: string; amount: string }
  depositSats: string
}

const toStored = (order: BookOrder): StoredOrder => ({
  ...order,
  give: { assetId: order.give.assetId, amount: order.give.amount.toString() },
  want: { assetId: order.want.assetId, amount: order.want.amount.toString() },
  depositSats: order.depositSats.toString(),
})

const fromStored = (order: StoredOrder): BookOrder => ({
  ...order,
  give: { assetId: order.give.assetId, amount: BigInt(order.give.amount) },
  want: { assetId: order.want.assetId, amount: BigInt(order.want.amount) },
  depositSats: BigInt(order.depositSats),
})

const cacheKey = (url: string) => `order_book_v1:${url}`

export const OrderBookProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { dataReady, reloadWallet, svcWallet } = useContext(WalletContext)
  const [orders, setOrders] = useState<BookOrder[]>([])
  const [ready, setReady] = useState(false)
  const [myPkScript, setMyPkScript] = useState<string>()

  const network = asNetwork(aspInfo.network)
  const emulatorUrl = network ? getEmulatorUrlForNetwork(network) : undefined
  // The helper decodes a fresh Uint8Array on every call. Memoize it so the
  // subscription effect does not tear down and reconnect each render.
  const emulatorPubkey = useMemo(() => (network ? getEmulatorPubkeyForNetwork(network) : undefined), [network])
  const ordersRef = useRef(orders)
  ordersRef.current = orders

  const remember = (next: BookOrder[]) => {
    ordersRef.current = next
    setOrders(next)
    if (aspInfo.url) setStorageItemSafely(cacheKey(aspInfo.url), JSON.stringify(next.map(toStored)), 'order book cache')
  }

  useEffect(() => {
    if (!svcWallet) return
    let cancelled = false
    svcWallet
      .getAddress()
      .then((address) => {
        if (!cancelled) setMyPkScript(hex.encode(ArkAddress.decode(address).pkScript))
      })
      .catch((err) => consoleError(err, 'could not read our payout script'))
    return () => {
      cancelled = true
    }
  }, [svcWallet])

  useEffect(() => {
    if (!aspInfo.url || !dataReady || !emulatorPubkey) return
    const controller = new AbortController()
    const indexer = new RestIndexerProvider(aspInfo.url)

    const start = async () => {
      const cached = getStorageItem<StoredOrder[]>(cacheKey(aspInfo.url), [], JSON.parse)
      let restored: BookOrder[] = []
      try {
        restored = cached.map(fromStored)
      } catch {
        restored = []
      }
      if (restored.length > 0) {
        try {
          const dead = new Set(await deadOrders(indexer, restored))
          restored = restored.filter((order) => !dead.has(order.id))
        } catch (err) {
          // Show the cache. A stale row fails at take time, which reads as someone else took it.
          consoleError(err, 'could not reconcile the cached book')
        }
      }
      if (controller.signal.aborted) return
      remember(restored)
      setReady(true)
      await readBook({
        indexer,
        emulatorPubkey,
        signal: controller.signal,
        onDelta: ({ orders: arrived, goneIds }) => {
          if (arrived.length === 0 && goneIds.length === 0) return
          const gone = new Set(goneIds)
          const byId = new Map(
            ordersRef.current.filter((order) => !gone.has(order.id)).map((order) => [order.id, order]),
          )
          for (const order of arrived) byId.set(order.id, order)
          remember([...byId.values()])
        },
        onError: (err) => consoleError(err, 'order book stream'),
      })
    }

    start().catch((err) => {
      if (!controller.signal.aborted) consoleError(err, 'order book failed to start')
    })
    return () => controller.abort()
    // remember closes over aspInfo.url, which is stable for the life of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspInfo.url, dataReady, emulatorPubkey])

  const scripts = useMemo(() => new Set(myPkScript ? [myPkScript] : []), [myPkScript])

  const bookFor = (pairKey: string): Book => buildBook(orders, pairKey, scripts)

  const matchFor = (terms: OrderTerms): BookRow | undefined =>
    matchRow(buildBook(orders, pairKeyOf(terms.give.assetId, terms.want.assetId), scripts), terms, Boolean(emulatorUrl))

  const trade = async (terms: OrderTerms): Promise<TradeOutcome> => {
    if (!svcWallet || !network) throw new Error('order book not initialized')
    const row = matchFor(terms)
    if (row) {
      if (!emulatorUrl) throw new Error('taking an order needs an emulator, and this network has none')
      const txid = await takeOrder(svcWallet, { order: row, arkServerUrl: aspInfo.url, emulatorUrl })
      await reloadWallet().catch((err) => consoleError(err, 'reload after fill'))
      return { kind: 'filled', txid }
    }
    const placed = await placeOrder(svcWallet, {
      ...terms,
      emulatorPubkey: getEmulatorPubkeyOverrideForNetwork(network),
    })
    await reloadWallet().catch((err) => consoleError(err, 'reload after order'))
    return { kind: 'placed', fundingTxid: placed.fundingTxid }
  }

  const pull = async (orderId: string): Promise<void> => {
    const order = ordersRef.current.find((row) => row.id === orderId)
    if (!order || !svcWallet) throw new Error('that order is no longer resting')
    if (myPkScript && order.makerPkScript !== myPkScript) throw new Error('only the order you posted can be cancelled')
    await pullOrder(svcWallet, order, assetSwapRepository)
    remember(ordersRef.current.filter((row) => row.id !== orderId))
    await reloadWallet().catch((err) => consoleError(err, 'reload after cancel'))
  }

  const value = useMemo(
    () => ({ orders, bookFor, takeable: Boolean(emulatorUrl), ready, trade, matchFor, pull }),
    // The callbacks close over the latest orders through the render that built them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, scripts, emulatorUrl, ready, svcWallet, network, aspInfo.url, myPkScript],
  )

  return <OrderBookContext.Provider value={value}>{children}</OrderBookContext.Provider>
}

export const useOrderBook = (): OrderBookContextProps => useContext(OrderBookContext)

/** Asset ids quoted against sats, for a list that should not hide a market you do not hold yet. */
export const quotedAssetIds = (orders: readonly BookOrder[]): string[] => {
  const ids = new Set<string>()
  for (const order of orders) {
    const base = baseOf(pairKeyOfOrder(order))
    if (base && !isBtc(base)) ids.add(base)
  }
  return [...ids]
}
