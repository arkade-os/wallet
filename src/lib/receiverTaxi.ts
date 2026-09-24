/**
 * The receiver's Taxi, seen from the payer: probe it, then ask it for a
 * receive quote the receiver pays for. Every identity checked here comes from
 * the wallet's own Arkade server; the Taxi only ever supplies its operator key,
 * and that must equal the one the receiver named.
 */
import { ArkAddress, asset, getNetwork, toXOnlySignerHex, type ArkInfo, type NetworkName } from '@arkade-os/sdk'
import type { ArkadeCarrierChoice } from '@arkade-os/swap'
import { TaxiClient, verifyReceiveQuote } from '@arkade-taxi/client'
import { hex } from '@scure/base'
import type { Bip21Taxi } from './bip21'
import { getEmulatorPubkeyForNetwork } from './constants'

export type TaxiInfo = Awaited<ReturnType<TaxiClient['info']>>
export type TaxiFare = TaxiInfo['assetRules'][number]['fares'][number]

export type ProbeRefusal =
  | 'unreachable'
  | 'operator-key-mismatch'
  | 'server-key-mismatch'
  | 'emulator-key-mismatch'
  | 'network-mismatch'
  | 'paused'
  | 'asset-not-served'
  | 'unsupported-unclaimed-mode'
  | 'recycle-not-allowed'
  | 'loan-cap-below-dust'
  | 'fare-unavailable'

export type ProbeResult = { ok: true; info: TaxiInfo } | { ok: false; reason: ProbeRefusal }

export type LocktimeDomain = 'height' | 'time'

/** What the running wallet already trusts. */
export interface ArkadeContext {
  serverKey: Uint8Array
  emulatorKey: Uint8Array
  hrp: string
  dust: bigint
  vtxoMinAmount: bigint
  locktimeDomain: LocktimeDomain
  /** Now, in `locktimeDomain`: unix seconds, or the chain tip's height. */
  clock: () => Promise<bigint>
}

// Per domain, in seconds or blocks. solver-app caps an asset quote's validity at 900s, and
// nothing funds after it; 30 blocks is 900s at mutinynet's 30s blocks, the fastest arkd runs.
const FUNDING_WINDOW: Record<LocktimeDomain, bigint> = { time: 900n, height: 30n }
// Bob's least time to claim after funding before the Taxi may recover: an hour, or six blocks.
const CLAIM_WINDOW: Record<LocktimeDomain, bigint> = { time: 3_600n, height: 6n }

/** The earliest floor and recovery locktime a receive quote may carry. */
export const callerMinimum = async (ctx: ArkadeContext): Promise<bigint> =>
  (await ctx.clock()) + FUNDING_WINDOW[ctx.locktimeDomain] + CLAIM_WINDOW[ctx.locktimeDomain]

export interface TaxiProbeContext extends ArkadeContext {
  assetId: string
  receiverAddress: string
  fetch: typeof fetch
  pageProtocol: string
}

export interface ReceiverPaidCarrier {
  choice: Extract<ArkadeCarrierChoice, { mode: 'recycleReceiver' }>
  inputExpiryFloor: { kind: LocktimeDomain; value: bigint }
}

export const arkadeContextOf = (
  info: Pick<ArkInfo, 'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'vtxoTreeExpiry'>,
  tipHeight: () => Promise<number>,
): ArkadeContext => {
  const network = info.network as NetworkName
  // A coin's expiry follows the batch expiry, which arkd counts in blocks below 512.
  const locktimeDomain = info.vtxoTreeExpiry !== undefined && info.vtxoTreeExpiry < 512n ? 'height' : 'time'
  return {
    serverKey: hex.decode(toXOnlySignerHex(info.signerPubkey)),
    // An empty key matches no Taxi, so a network without a pin refuses rather than guesses.
    emulatorKey: getEmulatorPubkeyForNetwork(network) ?? new Uint8Array(),
    hrp: getNetwork(network).hrp,
    dust: info.dust,
    vtxoMinAmount: info.vtxoMinAmount,
    locktimeDomain,
    clock:
      locktimeDomain === 'height'
        ? async () => BigInt(await tipHeight())
        : async () => BigInt(Math.floor(Date.now() / 1000)),
  }
}

export const taxiClient = (url: string, fetchImpl: typeof fetch) =>
  new TaxiClient({ baseUrl: url, fetch: (input, init) => fetchImpl(input, init) })

/** The Taxi's genesis txid is in internal byte order; the SDK's `AssetId` holds display order. */
const taxiAssetId = (id: string) => {
  const parsed = asset.AssetId.fromString(id)
  return { txid: Uint8Array.from(parsed.txid).reverse(), groupIndex: parsed.groupIndex }
}

const hrpOf = (address: string): string | undefined => {
  try {
    return ArkAddress.decode(address).hrp
  } catch {
    return undefined
  }
}

export const ruleFor = (info: TaxiInfo, assetId: string) => {
  let wanted: { txid: string; groupIndex: number }
  try {
    const id = taxiAssetId(assetId)
    wanted = { txid: hex.encode(id.txid), groupIndex: id.groupIndex }
  } catch {
    return undefined
  }
  return info.assetRules.find(
    (rule) =>
      typeof rule?.assetId?.txid === 'string' &&
      rule.assetId.txid.toLowerCase() === wanted.txid &&
      rule.assetId.groupIndex === wanted.groupIndex,
  )
}

const isMixedContent = (url: string, pageProtocol: string): boolean => {
  try {
    return pageProtocol === 'https:' && new URL(url).protocol === 'http:'
  } catch {
    return true
  }
}

const fetchInfo = async (url: string, ctx: TaxiProbeContext): Promise<TaxiInfo | undefined> => {
  // The browser would block it anyway; asking first only fails slower.
  if (isMixedContent(url, ctx.pageProtocol)) return undefined
  try {
    return await taxiClient(url, ctx.fetch).info()
  } catch {
    return undefined
  }
}

const wireUnits = (value: unknown): bigint | undefined =>
  typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) ? BigInt(value) : undefined

/**
 * What a fare charges the receiver, as the Taxi and the verifier price it; undefined for one the Taxi refuses
 * on a receiver-paid quote: a token fare, or a same-asset proportion, which has no delivery to scale with.
 * A proportional sats fare is a share of the loan, the whole dust, not of the delivery.
 */
export const receiverFareUnits = (fare: TaxiFare | undefined, loan: bigint): bigint | undefined => {
  const pricing = fare?.pricing
  if (pricing?.kind === 'flat')
    return fare!.currency === 'sats' || fare!.currency === 'sameAsset' ? wireUnits(pricing.units) : undefined
  if (pricing?.kind !== 'proportional' || fare!.currency !== 'sats') return undefined
  const [min, max] = [wireUnits(pricing.minUnits), pricing.maxUnits === null ? null : wireUnits(pricing.maxUnits)]
  if (!Number.isInteger(pricing.bps) || pricing.bps < 0 || pricing.bps > 10_000) return undefined
  if (min === undefined || max === undefined) return undefined
  const raw = (loan * BigInt(pricing.bps)) / 10_000n
  const floored = raw < min ? min : raw
  return max !== null && floored > max ? max : floored
}

const vetInfo = (taxi: Bip21Taxi, info: TaxiInfo, ctx: TaxiProbeContext): ProbeResult => {
  const refuse = (reason: ProbeRefusal): ProbeResult => ({ ok: false, reason })
  // `info()` has already refused any key that is not lowercase hex, as bip21 does for taxikey.
  if (info.operatorKey !== taxi.operatorKey) return refuse('operator-key-mismatch')
  if (info.serverKey !== hex.encode(ctx.serverKey)) return refuse('server-key-mismatch')
  if (info.emulatorKey !== hex.encode(ctx.emulatorKey)) return refuse('emulator-key-mismatch')
  if (hrpOf(ctx.receiverAddress) !== ctx.hrp) return refuse('network-mismatch')
  if (info.paused) return refuse('paused')
  const rule = ruleFor(info, ctx.assetId)
  if (rule?.enabled !== true) return refuse('asset-not-served')
  if (rule.unclaimedMode !== 'reclaim') return refuse('unsupported-unclaimed-mode')
  // What serving the asset takes on a receiver-paid quote, read from the same fields the verifier reads.
  if (rule.claim !== 'recycle' && rule.claim !== 'either') return refuse('recycle-not-allowed')
  const cap = rule.maxTopupSats === null ? wireUnits(info.maxPerPaymentTopupSats) : wireUnits(rule.maxTopupSats)
  if (cap === undefined || cap < ctx.dust) return refuse('loan-cap-below-dust')
  return { ok: true, info }
}

export const probeReceiverTaxi = async (taxi: Bip21Taxi, ctx: TaxiProbeContext): Promise<ProbeResult> => {
  const info = await fetchInfo(taxi.url, ctx)
  if (!info) return { ok: false, reason: 'unreachable' }
  const vetted = vetInfo(taxi, info, ctx)
  if (!vetted.ok) return vetted
  // Named none, the Taxi prices its first fare.
  const fares = ruleFor(info, ctx.assetId)?.fares
  const fare = !Array.isArray(fares) ? undefined : taxi.fareId ? fares.find((f) => f?.id === taxi.fareId) : fares[0]
  return receiverFareUnits(fare, ctx.dust) === undefined ? { ok: false, reason: 'fare-unavailable' } : vetted
}

/** The receiver's own Taxi, held to exactly the probe a payer will run; only its operator key is taken on its word. */
export const probeOwnTaxi = async (url: string, ctx: TaxiProbeContext): Promise<ProbeResult> => {
  const info = await fetchInfo(url, ctx)
  return info ? vetInfo({ url, operatorKey: info.operatorKey }, info, ctx) : { ok: false, reason: 'unreachable' }
}

/** Ask the probed Taxi for a quote the receiver pays, and verify it before anything relies on it. */
export const receiverPaidCarrier = async (
  taxi: Bip21Taxi,
  info: TaxiInfo,
  ctx: TaxiProbeContext,
  payer: {
    makerPublicKey: Uint8Array
    /** The earliest expiry among the coins the payer can fund with, in `ctx.locktimeDomain`. */
    fundingExpiry: bigint
    /** From `callerMinimum`. */
    minimum: bigint
  },
): Promise<ReceiverPaidCarrier> => {
  const { makerPublicKey } = payer
  const assetId = taxiAssetId(ctx.assetId)
  const fare = taxi.fareId ? { fareId: taxi.fareId } : {}
  const fundingExpiry = { kind: ctx.locktimeDomain, value: payer.fundingExpiry }
  const minimum = { kind: ctx.locktimeDomain, value: payer.minimum }
  const quote = await taxiClient(taxi.url, ctx.fetch).requestReceiveQuote({
    receiverAddress: ctx.receiverAddress,
    makerPublicKey,
    assetId,
    payer: 'receiver',
    fundingExpiry,
    ...fare,
  })
  const verified = verifyReceiveQuote({
    quote,
    info,
    trustedServerKey: ctx.serverKey,
    trustedEmulatorKey: ctx.emulatorKey,
    dust: ctx.dust,
    vtxoMinAmount: ctx.vtxoMinAmount,
    hrp: ctx.hrp,
    expect: {
      receiverAddress: ctx.receiverAddress,
      makerPublicKey,
      assetId,
      payer: 'receiver',
      fundingExpiry,
      ...fare,
      maxServiceFareSats: 0n,
      minRecoveryLocktime: minimum,
      minInputExpiryFloor: minimum,
    },
  })
  const { quoteId, receiveAddress, assetId: sdkAssetId, physicalSats, loanSats, expiresAt } = verified.descriptor
  const floor = verified.quote.inputExpiryFloor
  return {
    choice: {
      mode: 'recycleReceiver',
      quote: {
        quoteId,
        receiveAddress,
        makerPublicKey: verified.descriptor.makerPublicKey,
        assetId: sdkAssetId,
        physicalSats,
        loanSats,
        expiresAt,
      },
      taxi: { url: taxi.url, operatorKey: taxi.operatorKey },
    },
    inputExpiryFloor: { kind: floor.kind, value: BigInt(floor.value) },
  }
}
