/**
 * Pay an asset request with bitcoin through a solver RFQ, using the receiver's
 * Taxi as the carrier when it checks out, so the payer buys no carrier at all.
 *
 * Any failure before funding drops the Taxi and quietly buys a carrier from the
 * same solver, then tries the next solver. Nothing after funding starts is ever
 * retried: see the commit point in `payAssetRequest`.
 */
import {
  EsploraProvider,
  asset,
  type ArkInfo,
  type ExtendedVirtualCoin,
  type IWallet,
  type NetworkName,
} from '@arkade-os/sdk'
import {
  SwapRefusal,
  fundOffer,
  marketAssetId,
  requestArkadeSwap,
  type ArkadeCarrierChoice,
  type AssetSwap,
  type AssetSwapRepository,
} from '@arkade-os/swap'
import { sideLimits, type DiscoveredMarket, type Side } from '@arkade-os/solver-discovery'
import type { Bip21Taxi } from './bip21'
import { getEmulatorPubkeyOverrideForNetwork } from './constants'
import { getRestApiExplorerURL } from './explorers'
import { consoleError } from './logs'
import { withRfqTransport, type RfqRendezvous } from './nostrRfq'
import {
  arkadeContextOf,
  callerMinimum,
  probeReceiverTaxi,
  receiverPaidCarrier,
  type ArkadeContext,
  type ReceiverPaidCarrier,
} from './receiverTaxi'
import { assetSwapRepository } from './swapRepository'

export interface AssetPaymentRequest {
  arkAddress: string
  assetId: string
  /** Atomic units the receiver gets. */
  amount: bigint
  taxi?: Bip21Taxi
}

/** What the payer approves: identical in shape whichever carrier was negotiated. */
export interface AssetPaymentTerms {
  payAmountSats: bigint
  assetId: string
  assetAmount: bigint
  /** Set when the price she approved before had lapsed, so this one was asked for afresh. */
  refreshed?: true
}

/** Every way this rail can reach the user. The Taxi decision uses none of it. */
export interface PayRailUi {
  confirmPayment(terms: AssetPaymentTerms): Promise<boolean>
}

export class PaymentDeclined extends Error {
  constructor() {
    super('Payment cancelled')
    this.name = 'PaymentDeclined'
  }
}

export interface AssetRfqSendDeps {
  wallet: IWallet
  arkServerUrl: string
  arkade: ArkadeContext
  /** In preference order. */
  solvers: readonly RfqRendezvous[]
  ui: PayRailUi
  fetch: typeof fetch
  pageProtocol: string
  repository: AssetSwapRepository
  emulatorPubkey?: string
  requestArkadeSwap: typeof requestArkadeSwap
  fundOffer: typeof fundOffer
}

type Negotiated = Awaited<ReturnType<typeof requestArkadeSwap>>

type Coin = Pick<ExtendedVirtualCoin, 'txid' | 'vout' | 'value' | 'expiresAt' | 'expiresAtHeight' | 'assets'>
type Floor = ReceiverPaidCarrier['inputExpiryFloor']

const dropTaxi = (reason: string, cause?: unknown) =>
  consoleError(cause ?? reason, `dropped the receiver's Taxi (${reason})`)

// The solver can ask the Taxi for the fill only once it sees her deposit, and the Taxi refuses the fill and
// its submission once the receive quote expires. This covers her send, the solver noticing it (a 3s sweep at
// worst), the Taxi's fill quote (2.4-3.0s measured) and the co-signed submission, about 15s, doubled for skew.
export const FILL_MARGIN_SECONDS = 30

/** Her last moment to fund; through a Taxi, early enough that the solver can still fill. */
const fundingDeadline = (negotiated: Negotiated, taxi?: ReceiverPaidCarrier): number => {
  const { valid_until: validUntil } = negotiated.quote
  const solverDeadline = Math.min(validUntil, negotiated.carrier?.expiresAt ?? validUntil)
  return taxi ? Math.min(solverDeadline, taxi.choice.quote.expiresAt - FILL_MARGIN_SECONDS) : solverDeadline
}

const expired = (deadline: number) => Date.now() / 1000 >= deadline

/** The coins `fundOffer` chooses from: spendable, and not reserved by another funding in flight. */
const fundableCoins = async (deps: AssetRfqSendDeps): Promise<Coin[]> => {
  const [spendable, swaps] = await Promise.all([
    deps.wallet.getSpendableVtxos({ withRecoverable: false }),
    deps.repository.getAllSwaps(),
  ])
  const reserved = new Set(
    swaps.flatMap(({ fundingIntent: intent }) =>
      intent && (intent.state === 'prepared' || intent.state === 'submitted')
        ? intent.inputs.map(({ txid, vout }) => `${txid}:${vout}`)
        : [],
    ),
  )
  return spendable.filter((coin) => !reserved.has(`${coin.txid}:${coin.vout}`))
}

/** As `fundOffer` reads it: a coin with no expiry in `kind`, or with both kinds, clears no floor. */
const expiryIn = (coin: Coin, kind: Floor['kind']): bigint | undefined => {
  if ((coin.expiresAt === undefined) === (coin.expiresAtHeight === undefined)) return undefined
  if (kind === 'time') return coin.expiresAt && BigInt(Math.floor(coin.expiresAt.getTime() / 1000))
  return coin.expiresAtHeight === undefined ? undefined : BigInt(coin.expiresAtHeight)
}

/** The floors her coins can fund from, latest first; an expiry before `minimum` could fund no acceptable covenant. */
const fundingFloors = (coins: Coin[], kind: Floor['kind'], minimum: bigint): bigint[] =>
  [...new Set(coins.map((coin) => expiryIn(coin, kind)))]
    .filter((expiry): expiry is bigint => expiry !== undefined && expiry >= minimum)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

/** Enough for `fundOffer`'s selection, which spends one more dust on change when it takes an asset-bearing coin. */
const floorCovers = (coins: Coin[], floor: Floor, amount: bigint, dust: bigint): boolean => {
  const eligible = coins.filter((coin) => (expiryIn(coin, floor.kind) ?? -1n) >= floor.value)
  const total = eligible.reduce((sum, coin) => sum + BigInt(coin.value), 0n)
  return total >= amount + (eligible.some((coin) => coin.assets?.length) ? dust : 0n)
}

interface TaxiRoute {
  carrier: ReceiverPaidCarrier
  coins: Coin[]
  /** Floors below the one asked for, latest first; empty once re-quoted, since it is re-quoted only once. */
  lower: bigint[]
  requote: (floor: bigint) => Promise<TaxiRoute | undefined>
}

const taxiCarrier = async (req: AssetPaymentRequest, deps: AssetRfqSendDeps): Promise<TaxiRoute | undefined> => {
  const { taxi } = req
  if (!taxi) return undefined
  const ctx = {
    ...deps.arkade,
    assetId: req.assetId,
    receiverAddress: req.arkAddress,
    fetch: deps.fetch,
    pageProtocol: deps.pageProtocol,
  }
  const probe = await probeReceiverTaxi(taxi, ctx)
  if (!probe.ok) return void dropTaxi(probe.reason)
  try {
    const [coins, minimum, makerPublicKey] = await Promise.all([
      fundableCoins(deps),
      callerMinimum(deps.arkade),
      deps.wallet.identity.xOnlyPublicKey(),
    ])
    const quoteAt = async (fundingExpiry: bigint, lower: bigint[]): Promise<TaxiRoute | undefined> => {
      try {
        const carrier = await receiverPaidCarrier(taxi, probe.info, ctx, { makerPublicKey, fundingExpiry, minimum })
        return { carrier, coins, lower, requote: (floor) => quoteAt(floor, []) }
      } catch (error) {
        return void dropTaxi('receive quote refused', error)
      }
    }
    // Her latest floor first: the Taxi recovers a whole margin before the floor, so an earlier one is refused sooner.
    const [latest, ...lower] = fundingFloors(coins, deps.arkade.locktimeDomain, minimum)
    if (latest === undefined) return void dropTaxi('no coin outlives the minimum floor')
    return await quoteAt(latest, lower)
  } catch (error) {
    return void dropTaxi('receive quote refused', error)
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
    for (let i = 0; i < routes.length; i++) {
      const viaTaxi = routes[i]
      const route: { carrier: ArkadeCarrierChoice; receiveAddress?: string } = viaTaxi
        ? { carrier: viaTaxi.carrier.choice }
        : { carrier: { mode: 'purchase' }, receiveAddress: req.arkAddress }
      try {
        const negotiated = await withRfqTransport(solver, (transport) =>
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
          dropTaxi('its quote expires too soon to fill')
          taxi = undefined
          continue
        }
        const covers = (floor: Floor) => floorCovers(coins!, floor, negotiated.fundAmount, deps.arkade.dust)
        if (carrier && !covers(carrier.inputExpiryFloor)) {
          const { kind, value } = carrier.inputExpiryFloor
          const lower = viaTaxi!.lower.find((floor) => floor < value && covers({ kind, value: floor }))
          taxi =
            lower === undefined ? void dropTaxi('coins clearing its floor fall short') : await viaTaxi!.requote(lower)
          if (taxi) routes.splice(i + 1, 0, taxi)
          continue
        }
        return { negotiated, taxi: carrier }
      } catch (error) {
        lastError = error
        if (viaTaxi) {
          dropTaxi(error instanceof SwapRefusal ? error.reason : 'solver refused it', error)
          taxi = undefined
        } else {
          consoleError(error, `solver ${solver.solverPubkey} could not quote the asset`)
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
    if (taxi && expired(validUntil)) {
      // Nothing is funded yet: one fresh Taxi quote, then a purchase, so a slow answer cannot loop.
      dropTaxi('confirmed too late for the solver to fill')
      if (lapsed > 0) request = { ...request, taxi: undefined }
      continue
    }
    // THE COMMIT POINT. Everything above may fall back; nothing from here may. A funding
    // failure can follow a broadcast, and retrying it as a purchase could pay twice.
    return deps.fundOffer(deps.wallet, deps.arkServerUrl, {
      repository: deps.repository,
      id: negotiated.rfqId,
      offerHex: negotiated.offerHex,
      deposit: { amount: negotiated.fundAmount },
      validUntil,
      ...(taxi ? { inputExpiryFloor: taxi.inputExpiryFloor } : {}),
    })
  }
}

const BTC_LEG = /^arkade:[^/]+\/slip44:(?:0|1)$/

/** Mirrors `findMarket`'s leg matching, but keeps every candidate rather than the best. */
const legIs = (market: DiscoveredMarket, side: Side, assetId: string): boolean => {
  const leg = side === 'base' ? market.base_asset : market.quote_asset
  const canonical = marketAssetId(market, side) ?? ''
  if (assetId === 'btc') return leg.id === 'btc' || BTC_LEG.test(canonical)
  return leg.id === assetId || canonical.endsWith(`/asset:${assetId}`)
}

/** Solvers that sell `assetId` for arkade BTC over nostr, each once, in market order. */
export const assetRfqSolvers = (markets: DiscoveredMarket[], assetId: string): RfqRendezvous[] => {
  const seen = new Set<string>()
  return markets.flatMap((market) => {
    const assetSide = (['base', 'quote'] as const).find((side) => legIs(market, side, assetId))
    const btcSide = assetSide === 'base' ? 'quote' : 'base'
    if (!assetSide || !legIs(market, btcSide, 'btc')) return []
    // A side's bounds are what the solver pays out on it; a disabled one sells nothing.
    if (!sideLimits(market, assetSide)) return []
    const relays = market.transports?.nostr?.relays ?? []
    if (!market.discovery_pubkey || relays.length === 0 || seen.has(market.discovery_pubkey)) return []
    seen.add(market.discovery_pubkey)
    return [{ solverPubkey: market.discovery_pubkey, transports: { nostr: { relays } } }]
  })
}

/** The Send form buys the asset through the receiver's Taxi only when the payer can't send it from her own balance. */
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

/** The rail pays in bitcoin; under a dust's worth nothing could fund, so no Taxi should be asked. */
export const hasSatsForReceiverTaxi = (liquidSats: number, dust: bigint): boolean =>
  BigInt(Math.floor(liquidSats)) >= dust

/** The production wiring: this wallet's server, its swap store, and the browser's fetch. */
export const walletAssetRfqDeps = (args: {
  aspInfo: Pick<ArkInfo, 'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'vtxoTreeExpiry'> & {
    url: string
  }
  wallet: IWallet
  markets: DiscoveredMarket[]
  assetId: string
  ui: PayRailUi
}): AssetRfqSendDeps => {
  const network = args.aspInfo.network as NetworkName
  const explorer = getRestApiExplorerURL(network)
  const tipHeight = async () => {
    if (!explorer) throw new Error(`no explorer to read the ${network} chain tip from`)
    return (await new EsploraProvider(explorer).getChainTip()).height
  }
  return {
    wallet: args.wallet,
    arkServerUrl: args.aspInfo.url,
    arkade: arkadeContextOf(args.aspInfo, tipHeight),
    solvers: assetRfqSolvers(args.markets, args.assetId),
    ui: args.ui,
    fetch: (input, init) => fetch(input, init),
    pageProtocol: window.location.protocol,
    repository: assetSwapRepository,
    emulatorPubkey: getEmulatorPubkeyOverrideForNetwork(network),
    requestArkadeSwap,
    fundOffer,
  }
}
