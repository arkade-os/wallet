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

type LocktimeDomain = 'height' | 'time'

/** What the running wallet already trusts. */
export interface ArkadeContext {
  serverKey: Uint8Array
  emulatorKey: Uint8Array
  hrp: string
  dust: bigint
  vtxoMinAmount: bigint
  locktimeDomain: LocktimeDomain
}

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
  info: Pick<ArkInfo, 'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'unilateralExitDelay'>,
): ArkadeContext => {
  const network = info.network as NetworkName
  return {
    serverKey: hex.decode(toXOnlySignerHex(info.signerPubkey)),
    // An empty key matches no Taxi, so a network without a pin refuses rather than guesses.
    emulatorKey: getEmulatorPubkeyForNetwork(network) ?? new Uint8Array(),
    hrp: getNetwork(network).hrp,
    dust: info.dust,
    vtxoMinAmount: info.vtxoMinAmount,
    // arkd's own rule: an exit delay under 512 counts blocks.
    locktimeDomain: info.unilateralExitDelay < 512n ? 'height' : 'time',
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
  makerPublicKey: Uint8Array,
): Promise<ReceiverPaidCarrier> => {
  const assetId = taxiAssetId(ctx.assetId)
  const fare = taxi.fareId ? { fareId: taxi.fareId } : {}
  const quote = await clientFor(taxi, ctx.fetch).requestReceiveQuote({
    receiverAddress: ctx.receiverAddress,
    makerPublicKey,
    assetId,
    payer: 'receiver',
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
      ...fare,
      maxServiceFareSats: 0n,
      minRecoveryLocktime: { kind: ctx.locktimeDomain, value: 1n },
      minInputExpiryFloor: { kind: ctx.locktimeDomain, value: 1n },
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
