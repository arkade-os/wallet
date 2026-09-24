/**
 * Pay an asset request with bitcoin through a solver RFQ, using the receiver's
 * Taxi as the carrier when it checks out, so the payer buys no carrier at all.
 *
 * Any failure before funding drops the Taxi and quietly buys a carrier from the
 * same solver, then tries the next solver. Nothing after funding starts is ever
 * retried: see the commit point in `payAssetRequest`.
 */
import { asset, type ArkInfo, type IWallet, type NetworkName } from '@arkade-os/sdk'
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
import { consoleError } from './logs'
import { withRfqTransport, type RfqRendezvous } from './nostrRfq'
import {
  arkadeContextOf,
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

const dropTaxi = (reason: string, cause?: unknown) =>
  consoleError(cause ?? reason, `dropped the receiver's Taxi (${reason})`)

const taxiCarrier = async (req: AssetPaymentRequest, deps: AssetRfqSendDeps) => {
  if (!req.taxi) return undefined
  const ctx = {
    ...deps.arkade,
    assetId: req.assetId,
    receiverAddress: req.arkAddress,
    fetch: deps.fetch,
    pageProtocol: deps.pageProtocol,
  }
  const probe = await probeReceiverTaxi(req.taxi, ctx)
  if (!probe.ok) return void dropTaxi(probe.reason)
  try {
    return await receiverPaidCarrier(req.taxi, probe.info, ctx, await deps.wallet.identity.xOnlyPublicKey())
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
    for (const viaTaxi of taxi ? [taxi, undefined] : [undefined]) {
      const route: { carrier: ArkadeCarrierChoice; receiveAddress?: string } = viaTaxi
        ? { carrier: viaTaxi.choice }
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
        return { negotiated, taxi: viaTaxi }
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
  const { negotiated, taxi } = await negotiate(req, deps)
  const terms = { payAmountSats: negotiated.fundAmount, assetId: req.assetId, assetAmount: req.amount }
  if (!(await deps.ui.confirmPayment(terms))) throw new PaymentDeclined()
  // THE COMMIT POINT. Everything above may fall back; nothing from here may. A funding
  // failure can follow a broadcast, and retrying it as a purchase could pay twice.
  const carrierExpiry = negotiated.carrier?.expiresAt ?? negotiated.quote.valid_until
  return deps.fundOffer(deps.wallet, deps.arkServerUrl, {
    repository: deps.repository,
    id: negotiated.rfqId,
    offerHex: negotiated.offerHex,
    deposit: { amount: negotiated.fundAmount },
    validUntil: Math.min(negotiated.quote.valid_until, carrierExpiry),
    ...(taxi ? { inputExpiryFloor: taxi.inputExpiryFloor } : {}),
  })
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

/** The production wiring: this wallet's server, its swap store, and the browser's fetch. */
export const walletAssetRfqDeps = (args: {
  aspInfo: Pick<ArkInfo, 'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'unilateralExitDelay'> & {
    url: string
  }
  wallet: IWallet
  markets: DiscoveredMarket[]
  assetId: string
  ui: PayRailUi
}): AssetRfqSendDeps => {
  const network = args.aspInfo.network as NetworkName
  return {
    wallet: args.wallet,
    arkServerUrl: args.aspInfo.url,
    arkade: arkadeContextOf(args.aspInfo),
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
