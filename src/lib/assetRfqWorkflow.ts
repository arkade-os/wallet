import { requestCarrierArkadeSwap as requestArkadeSwap } from './carrierRfq'
import type { ArkadeCarrierChoice } from './receiveCarrier'
import { asset, type ExtendedVirtualCoin, type IWallet } from '@arkade-os/sdk'
import {
  SwapRefusal,
  fundOffer,
  marketAssetId,
  type AssetSwap,
  type AssetSwapRepository,
  type RfqTransport,
} from '@arkade-os/swap'
import { sideLimits, type DiscoveredMarket, type Side } from '@arkade-os/solver-discovery'
import {
  PaymentDeclined,
  callerMinimum,
  probeReceiverTaxi,
  type ArkadeContext,
  type Bip21Taxi,
} from '@arkade-taxi/client/wallet'
export { PaymentDeclined }
import { receiverPaidCarrier, type ReceiverPaidCarrier } from './receiverPaidCarrier'
export interface RfqRendezvous {
  solverPubkey: string
  transports: { nostr: { relays: string[] } }
}

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

export interface AssetRfqSendDeps {
  wallet: IWallet
  arkServerUrl: string
  arkade: ArkadeContext

  solvers: readonly RfqRendezvous[]
  ui: PayRailUi
  fetch: typeof fetch
  pageProtocol: string
  repository: AssetSwapRepository
  emulatorPubkey?: string
  requestArkadeSwap: typeof requestArkadeSwap
  fundOffer: typeof fundOffer
  unreservedCoins: (wallet: IWallet) => Promise<ExtendedVirtualCoin[]>
  withRfqTransport: <T>(rendezvous: RfqRendezvous, negotiate: (transport: RfqTransport) => Promise<T>) => Promise<T>
  onError?: (error: unknown, message?: string) => void
}

type Negotiated = Awaited<ReturnType<typeof requestArkadeSwap>>

type Coin = Pick<ExtendedVirtualCoin, 'txid' | 'vout' | 'value' | 'expiresAt' | 'expiresAtHeight' | 'assets'>
type Floor = ReceiverPaidCarrier['inputExpiryFloor']

const dropTaxi = (deps: AssetRfqSendDeps, reason: string, cause?: unknown) =>
  (deps.onError ?? console.error)(cause ?? reason, `dropped the receiver's Taxi (${reason})`)

const refusesCarrierField = (error: unknown): boolean =>
  error instanceof SwapRefusal && error.reason === 'unsupported_payload' && !error.errorCode
export const FILL_MARGIN_SECONDS = 30

const fundingDeadline = (negotiated: Negotiated, taxi?: ReceiverPaidCarrier): number => {
  const { valid_until: validUntil } = negotiated.quote
  const solverDeadline = Math.min(validUntil, negotiated.carrier?.expiresAt ?? validUntil)
  return taxi ? Math.min(solverDeadline, taxi.choice.quote.expiresAt - FILL_MARGIN_SECONDS) : solverDeadline
}

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

const negotiate = async (
  req: AssetPaymentRequest,
  deps: AssetRfqSendDeps,
): Promise<{ negotiated: Negotiated; taxi?: ReceiverPaidCarrier }> => {
  if (deps.solvers.length === 0) throw new Error('No solver sells this asset for bitcoin')
  let taxi = await taxiCarrier(req, deps)
  let lastError: unknown
  for (const solver of deps.solvers) {
    const routes = taxi ? [taxi, undefined] : [undefined]
    let legacy = false
    for (let i = 0; i < routes.length; i++) {
      const viaTaxi = routes[i]
      const route: { carrier?: ArkadeCarrierChoice; receiveAddress?: string } = viaTaxi
        ? { carrier: viaTaxi.carrier.choice }
        : legacy
          ? { receiveAddress: req.arkAddress }
          : { carrier: { mode: 'purchase' }, receiveAddress: req.arkAddress }
      try {
        const negotiated = await deps.withRfqTransport(solver, (transport) =>
          deps.requestArkadeSwap(deps.wallet, deps.arkServerUrl, transport, {
            wantAsset: asset.AssetId.fromString(req.assetId),
            amount: req.amount,
            amountSide: 'to',
            ...(deps.emulatorPubkey ? { emulatorPubkey: deps.emulatorPubkey } : {}),
            ...route,
          }),
        )
        const { carrier, coins } = viaTaxi ?? {}
        if (carrier && expired(fundingDeadline(negotiated, carrier))) {
          dropTaxi(deps, 'its quote expires too soon to fill')
          taxi = undefined
          continue
        }
        const covers = (floor: Floor) => floorCovers(coins!, floor, negotiated.fundAmount, deps.arkade.dust)
        if (carrier && !covers(carrier.inputExpiryFloor)) {
          const { kind, value } = carrier.inputExpiryFloor
          const lower = viaTaxi!.lower.find((floor) => floor < value && covers({ kind, value: floor }))
          taxi =
            lower === undefined
              ? void dropTaxi(deps, 'coins clearing its floor fall short')
              : await viaTaxi!.requote(lower)
          if (taxi) routes.splice(i + 1, 0, taxi)
          continue
        }
        return { negotiated, taxi: carrier }
      } catch (error) {
        lastError = error
        if (viaTaxi) {
          dropTaxi(deps, error instanceof SwapRefusal ? error.reason : 'solver refused it', error)
          taxi = undefined
        } else if (!legacy && refusesCarrierField(error)) {
          legacy = true
          routes.push(undefined)
        } else {
          ;(deps.onError ?? console.error)(error, `solver ${solver.solverPubkey} could not quote the asset`)
        }
      }
    }
  }
  throw lastError
}

export const payAssetRequest = async (req: AssetPaymentRequest, deps: AssetRfqSendDeps): Promise<AssetSwap> => {
  let request = req
  for (let lapsed = 0; ; lapsed++) {
    const { negotiated, taxi } = await negotiate(request, deps)
    const terms: AssetPaymentTerms = {
      payAmountSats: negotiated.fundAmount,
      assetId: req.assetId,
      assetAmount: req.amount,
      ...(lapsed > 0 ? { refreshed: true } : {}),
    }
    if (!(await deps.ui.confirmPayment(terms))) throw new PaymentDeclined()
    const validUntil = fundingDeadline(negotiated, taxi)
    if (expired(validUntil)) {
      if (taxi) {
        dropTaxi(deps, 'confirmed too late for the solver to fill')
        if (lapsed > 0) request = { ...request, taxi: undefined }
      }
      continue
    }
    // A funding failure may follow broadcast; retrying another route could pay twice.
    return deps.fundOffer(deps.wallet, deps.arkServerUrl, {
      repository: deps.repository,
      id: negotiated.rfqId,
      offerHex: negotiated.offerHex,
      deposit: { amount: negotiated.fundAmount },
      validUntil,
      ...(taxi ? { inputExpiryFloor: taxi.inputExpiryFloor } : {}),
      prepareNew: (swap): AssetSwap & { payee: string } => ({
        ...swap,
        payee: req.arkAddress,
      }),
    })
  }
}

const BTC_LEG = /^arkade:[^/]+\/slip44:(?:0|1)$/

const legIs = (market: DiscoveredMarket, side: Side, assetId: string): boolean => {
  const leg = side === 'base' ? market.base_asset : market.quote_asset
  const canonical = marketAssetId(market, side) ?? ''
  if (assetId === 'btc') return leg.id === 'btc' || BTC_LEG.test(canonical)
  return leg.id === assetId || canonical.endsWith(`/asset:${assetId}`)
}

export const assetRfqSolvers = (markets: DiscoveredMarket[], assetId: string): RfqRendezvous[] => {
  const seen = new Set<string>()
  return markets.flatMap((market) => {
    const assetSide = (['base', 'quote'] as const).find((side) => legIs(market, side, assetId))
    const btcSide = assetSide === 'base' ? 'quote' : 'base'
    if (!assetSide || !legIs(market, btcSide, 'btc')) return []
    if (!sideLimits(market, assetSide)) return []
    const relays = market.transports?.nostr?.relays ?? []
    if (!market.discovery_pubkey || relays.length === 0 || seen.has(market.discovery_pubkey)) return []
    seen.add(market.discovery_pubkey)
    return [{ solverPubkey: market.discovery_pubkey, transports: { nostr: { relays } } }]
  })
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
