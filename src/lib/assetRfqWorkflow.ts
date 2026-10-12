import type { ExtendedVirtualCoin, IWallet } from '@arkade-os/sdk'
import { SwapRefusal, type Quote, type QuoteInput, type Swap } from '@arkade-os/swap'
import {
  PaymentDeclined,
  callerMinimum,
  probeReceiverTaxi,
  type ArkadeContext,
  type Bip21Taxi,
} from '@arkade-taxi/client/wallet'
import { receiverPaidCarrier, type ReceiverPaidCarrier } from './receiverPaidCarrier'
export { PaymentDeclined }

export interface AssetPaymentRequest {
  arkAddress: string
  assetId: string
  amount: bigint
  taxi?: Bip21Taxi
}
export interface AssetPaymentTerms {
  payAmountSats: bigint
  assetId: string
  assetAmount: bigint
  refreshed?: true
}
export interface PayRailUi {
  confirmPayment(terms: AssetPaymentTerms): Promise<boolean>
}
export type AssetPayment = NonNullable<QuoteInput['assetPayment']>
export interface AssetRfqSendDeps {
  wallet: IWallet
  arkade: ArkadeContext
  ui: PayRailUi
  fetch: typeof fetch
  pageProtocol: string
  unreservedCoins: (wallet: IWallet) => Promise<ExtendedVirtualCoin[]>
  quoteAssetPayment: (request: AssetPaymentRequest, payment: AssetPayment) => Promise<Quote>
  acceptAssetPayment: (quote: Quote) => Promise<Swap>
  onError?: (error: unknown, message?: string) => void
}

type Coin = Pick<ExtendedVirtualCoin, 'txid' | 'vout' | 'value' | 'expiresAt' | 'expiresAtHeight' | 'assets'>
type Floor = ReceiverPaidCarrier['inputExpiryFloor']

const dropTaxi = (deps: AssetRfqSendDeps, reason: string, cause?: unknown) =>
  (deps.onError ?? console.error)(cause ?? reason, `dropped the receiver's Taxi (${reason})`)

const fundingDeadline = (quote: Quote): number =>
  Math.min(quote.expiresAt, quote.assetPayment?.validUntil ?? quote.expiresAt)

const expired = (deadline: number) => Date.now() / 1000 >= deadline

const expiryIn = (coin: Coin, kind: Floor['kind']): bigint | undefined => {
  if ((coin.expiresAt === undefined) === (coin.expiresAtHeight === undefined)) return undefined
  if (kind === 'time') return coin.expiresAt && BigInt(Math.floor(coin.expiresAt.getTime() / 1000))
  return coin.expiresAtHeight === undefined ? undefined : BigInt(coin.expiresAtHeight)
}

const fundingFloors = (coins: Coin[], kind: Floor['kind'], minimum: bigint): bigint[] =>
  [...new Set(coins.map((coin) => expiryIn(coin, kind)))]
    .filter((expiry): expiry is bigint => expiry !== undefined && expiry >= minimum)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

const floorCovers = (coins: Coin[], floor: Floor, amount: bigint, dust: bigint): boolean => {
  const eligible = coins.filter((coin) => (expiryIn(coin, floor.kind) ?? -1n) >= floor.value)
  const total = eligible.reduce((sum, coin) => sum + BigInt(coin.value), 0n)
  return total >= amount + (eligible.some((coin) => coin.assets?.length) ? dust : 0n)
}

interface TaxiRoute {
  carrier: ReceiverPaidCarrier
  coins: Coin[]

  lower: bigint[]
  requote: (floor: bigint) => Promise<TaxiRoute | undefined>
}

const taxiCarrier = async (req: AssetPaymentRequest, deps: AssetRfqSendDeps): Promise<TaxiRoute | undefined> => {
  const { taxi } = req
  if (!taxi || taxi.payer === 'sender') return undefined
  const ctx = {
    ...deps.arkade,
    assetId: req.assetId,
    receiverAddress: req.arkAddress,
    fetch: deps.fetch,
    pageProtocol: deps.pageProtocol,
  }
  const probe = await probeReceiverTaxi(taxi, ctx)
  if (!probe.ok) return void dropTaxi(deps, probe.reason)
  try {
    const [coins, minimum, senderKey] = await Promise.all([
      deps.unreservedCoins(deps.wallet),
      callerMinimum(deps.arkade),
      deps.wallet.identity.xOnlyPublicKey(),
    ])
    const quoteAt = async (fundingExpiry: bigint, lower: bigint[]): Promise<TaxiRoute | undefined> => {
      try {
        const carrier = await receiverPaidCarrier(taxi, probe.info, ctx, {
          senderKey,
          fundingExpiry,
          minimum,
        })
        return { carrier, coins, lower, requote: (floor) => quoteAt(floor, []) }
      } catch (error) {
        return void dropTaxi(deps, 'receive quote refused', error)
      }
    }
    const [latest, ...lower] = fundingFloors(coins, deps.arkade.locktimeDomain, minimum)
    if (latest === undefined) return void dropTaxi(deps, 'no coin outlives the minimum floor')
    return await quoteAt(latest, lower)
  } catch (error) {
    return void dropTaxi(deps, 'receive quote refused', error)
  }
}

const negotiate = async (req: AssetPaymentRequest, deps: AssetRfqSendDeps): Promise<Quote> => {
  let taxi = await taxiCarrier(req, deps)
  let legacy = false
  for (;;) {
    const payment: AssetPayment = taxi
      ? { carrier: { ...taxi.carrier.choice, inputExpiryFloor: taxi.carrier.inputExpiryFloor } }
      : { receiveAddress: req.arkAddress, ...(legacy ? {} : { carrier: { mode: 'purchase' } }) }
    try {
      const quote = await deps.quoteAssetPayment(req, payment)
      if (taxi) {
        if (expired(fundingDeadline(quote))) {
          dropTaxi(deps, 'its quote expires too soon to fill')
          taxi = undefined
          continue
        }
        const covers = (floor: Floor) => floorCovers(taxi!.coins, floor, quote.give.amount, deps.arkade.dust)
        if (!covers(taxi.carrier.inputExpiryFloor)) {
          const { kind, value } = taxi.carrier.inputExpiryFloor
          const lower = taxi.lower.find((floor) => floor < value && covers({ kind, value: floor }))
          taxi =
            lower === undefined ? void dropTaxi(deps, 'coins clearing its floor fall short') : await taxi.requote(lower)
          continue
        }
      }
      return quote
    } catch (error) {
      if (taxi) {
        dropTaxi(deps, error instanceof SwapRefusal ? error.reason : 'solver refused it', error)
        taxi = undefined
      } else if (
        !legacy &&
        error instanceof SwapRefusal &&
        error.reason === 'unsupported_payload' &&
        !error.errorCode
      ) {
        legacy = true
      } else throw error
    }
  }
}

export const payAssetRequest = async (req: AssetPaymentRequest, deps: AssetRfqSendDeps): Promise<Swap> => {
  let request = req
  for (let lapsed = 0; ; lapsed++) {
    const quote = await negotiate(request, deps)
    if (
      !(await deps.ui.confirmPayment({
        payAmountSats: quote.give.amount,
        assetId: req.assetId,
        assetAmount: req.amount,
        ...(lapsed ? { refreshed: true } : {}),
      }))
    )
      throw new PaymentDeclined()
    if (expired(fundingDeadline(quote))) {
      if (quote.assetPayment?.carrier?.mode === 'recycle_receiver')
        dropTaxi(deps, 'confirmed too late for the solver to fill')
      if (lapsed > 0) request = { ...request, taxi: undefined }
      continue
    }
    // An accept error may follow submission. Never negotiate another payment after it.
    return deps.acceptAssetPayment(quote)
  }
}

export const routesToReceiverTaxi = (
  send: { account?: unknown; assets?: { assetId: string; amount: bigint }[] },
  decodedTaxi: { assetId: string } | undefined,
  assetBalance: bigint,
): boolean => {
  const [wanted] = send.assets ?? []
  return Boolean(
    decodedTaxi && !send.account && wanted?.assetId === decodedTaxi.assetId && wanted.amount > assetBalance,
  )
}

export const hasSatsForReceiverTaxi = (liquidSats: number, dust: bigint): boolean =>
  BigInt(Math.floor(liquidSats)) >= dust
