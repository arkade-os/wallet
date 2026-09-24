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

export type ProbeRefusal =
  | 'unreachable'
  | 'operator-key-mismatch'
  | 'server-key-mismatch'
  | 'emulator-key-mismatch'
  | 'network-mismatch'
  | 'paused'
  | 'asset-not-served'
  | 'unsupported-unclaimed-mode'

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

const clientFor = (taxi: Bip21Taxi, fetchImpl: typeof fetch) =>
  new TaxiClient({ baseUrl: taxi.url, fetch: (input, init) => fetchImpl(input, init) })

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

const ruleFor = (info: TaxiInfo, assetId: string) => {
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

export const probeReceiverTaxi = async (taxi: Bip21Taxi, ctx: TaxiProbeContext): Promise<ProbeResult> => {
  const refuse = (reason: ProbeRefusal): ProbeResult => ({ ok: false, reason })
  // The browser would block it anyway; asking first only fails slower.
  if (isMixedContent(taxi.url, ctx.pageProtocol)) return refuse('unreachable')
  let info: TaxiInfo
  try {
    info = await clientFor(taxi, ctx.fetch).info()
  } catch {
    return refuse('unreachable')
  }
  // `info()` has already refused any key that is not lowercase hex, as bip21 does for taxikey.
  if (info.operatorKey !== taxi.operatorKey) return refuse('operator-key-mismatch')
  if (info.serverKey !== hex.encode(ctx.serverKey)) return refuse('server-key-mismatch')
  if (info.emulatorKey !== hex.encode(ctx.emulatorKey)) return refuse('emulator-key-mismatch')
  if (hrpOf(ctx.receiverAddress) !== ctx.hrp) return refuse('network-mismatch')
  if (info.paused) return refuse('paused')
  const rule = ruleFor(info, ctx.assetId)
  if (rule?.enabled !== true) return refuse('asset-not-served')
  if (rule.unclaimedMode !== 'reclaim') return refuse('unsupported-unclaimed-mode')
  return { ok: true, info }
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
  const quote = await clientFor(taxi, ctx.fetch).requestReceiveQuote({
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
