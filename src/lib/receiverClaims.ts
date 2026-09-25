/**
 * The receiver's side of a Taxi delivery he pays for: which claims to put in
 * front of him, what claiming one costs, and the claim itself. Nothing here
 * claims unasked; `claimVerified` runs only on his confirmation.
 */
import {
  EsploraProvider,
  VtxoScript,
  asset,
  type ArkInfo,
  type ExtendedVirtualCoin,
  type Identity,
  type NetworkName,
} from '@arkade-os/sdk'
import {
  ClientErrorCode,
  fundingInputsFromVtxos,
  type CovenantSpendConfig,
  type CovenantTransfer,
  type IncomingClaimExpectation,
  type IncomingClaimTrust,
  type ReceiverWalletInput,
  type TaxiClient,
  type TaxiError,
} from '@arkade-taxi/client'
import { hex } from '@scure/base'
import { extractError } from './error'
import { getRestApiExplorerURL } from './explorers'
import { consoleError } from './logs'
import { arkadeContextOf, taxiClient } from './receiverTaxi'
import type { RememberedTaxi } from './storage'

export type ReceiverClaim = Parameters<TaxiClient['verifyIncomingClaim']>[0]
export type ClaimClient = Pick<TaxiClient, 'info' | 'subscribeClaims' | 'verifyIncomingClaim' | 'recycle'>

type PlanCoin = Pick<ExtendedVirtualCoin, 'txid' | 'vout' | 'value' | 'script'>

export type RecyclePlan<C extends PlanCoin = ExtendedVirtualCoin> = { kind: 'recycle'; coin: C; mergedSats: bigint } & (
  | { feeSats: bigint }
  | { feeUnits: bigint; deliveredUnits: bigint }
)

export type ClaimPlan<C extends PlanCoin = ExtendedVirtualCoin> =
  | RecyclePlan<C>
  | { kind: 'wait-for-reclaim'; reason: 'no-coin-covers-the-fare'; neededSats: bigint }
  | { kind: 'wait-for-reclaim'; reason: 'fare-exceeds-delivery' }

/** What the recycle leaf charges the receiver, or undefined when he is not the one paying. */
export const receiverFareOf = (claim: ReceiverClaim): { currency: 'sats' | 'asset'; units: bigint } | undefined => {
  const fare = claim.claim?.params.receiverFare
  return fare && { currency: fare.currency, units: BigInt(fare.units) }
}

const receiverScript = (claim: ReceiverClaim): Uint8Array =>
  new Uint8Array([0x51, 0x20, ...hex.decode(claim.claim!.params.receiverKey)])

/** The wallet's display id for the delivered asset; the wire carries the genesis txid in internal byte order. */
export const deliveredAssetId = (claim: ReceiverClaim): string | undefined => {
  const id = claim.claim?.params.assetId
  return id && asset.AssetId.create(hex.encode(hex.decode(id.txid).reverse()), id.groupIndex).toString()
}

export const planReceiverClaim = <C extends PlanCoin>(claim: ReceiverClaim, coins: readonly C[]): ClaimPlan<C> => {
  const fare = receiverFareOf(claim)
  if (!claim.claim || !fare) throw new Error(`Taxi transfer ${claim.transferId} is not one the receiver pays for`)
  const dust = BigInt(claim.claim.params.dust)
  const delivered = BigInt(claim.claim.assetUnits ?? 0)
  if (fare.currency === 'asset' && fare.units >= delivered)
    return { kind: 'wait-for-reclaim', reason: 'fare-exceeds-delivery' }
  // The Taxi fronted the whole dust, so recycle repays dust plus a sats fare out of the merged
  // output: coin - fare must still be at least dust, or the client's recycle refuses it.
  const feeSats = fare.currency === 'sats' ? fare.units : 0n
  const neededSats = dust + feeSats
  const script = hex.encode(receiverScript(claim))
  const coin = coins
    .filter((candidate) => candidate.script === script && BigInt(candidate.value) >= neededSats)
    .reduce<
      C | undefined
    >((smallest, candidate) => (smallest && smallest.value <= candidate.value ? smallest : candidate), undefined)
  if (!coin) return { kind: 'wait-for-reclaim', reason: 'no-coin-covers-the-fare', neededSats }
  const mergedSats = BigInt(coin.value) - feeSats
  return fare.currency === 'sats'
    ? { kind: 'recycle', coin, mergedSats, feeSats }
    : { kind: 'recycle', coin, mergedSats, feeUnits: fare.units, deliveredUnits: delivered - fare.units }
}

type Skip = 'not-claimable' | 'not-this-wallet' | 'other-operator' | 'not-receiver-paid' | 'unknown-unclaimed-mode'

/** The remembered Taxi a claim was made under, or why it is not one to offer. */
const triage = (
  claim: ReceiverClaim,
  taxis: readonly RememberedTaxi[],
  receiverAddress: string,
): Skip | RememberedTaxi => {
  const descriptor = claim.claim
  if (claim.state !== 'locked' || !claim.claimable || !descriptor) return 'not-claimable'
  if (claim.receiverAddress !== receiverAddress) return 'not-this-wallet'
  const taxi = taxis.find(({ operatorKey }) => operatorKey === descriptor.params.operatorKey)
  if (!taxi) return 'other-operator'
  const { receiverFare, claimMode, recoveryRecipient } = descriptor.params
  if (!receiverFare || claimMode !== 'recycle' || recoveryRecipient !== 'receiver') return 'not-receiver-paid'
  if (descriptor.unclaimedMode !== 'reclaim') return 'unknown-unclaimed-mode'
  return taxi
}

// The wallet remembers only the Taxi, so the asset and units come from the descriptor;
// verification then holds the covenant coin itself to them, and ClaimSheet shows them.
const expectationFor = (claim: ReceiverClaim): IncomingClaimExpectation => {
  const { params, assetUnits } = claim.claim!
  return {
    receiverAddress: claim.receiverAddress,
    ...(params.assetId
      ? { assetId: { txid: hex.decode(params.assetId.txid), groupIndex: params.assetId.groupIndex } }
      : {}),
    ...(assetUnits === undefined ? {} : { assetUnits: BigInt(assetUnits) }),
    recoveryRecipient: 'receiver',
    claimMode: 'recycle',
  }
}

export interface VerifiedClaim {
  taxi: RememberedTaxi
  claim: ReceiverClaim
  transfer: CovenantTransfer
  client: ClaimClient
}

// A transfer id is only unique within one Taxi, so nothing one Taxi says may touch another's offer.
const keyOf = (url: string, transferId: string) => `${url} ${transferId}`
export const offerKey = ({ taxi, claim }: Pick<VerifiedClaim, 'taxi' | 'claim'>) => keyOf(taxi.url, claim.transferId)

export interface ClaimWatch {
  taxis: readonly RememberedTaxi[]
  receiverAddress: string
  clientFor: (url: string) => ClaimClient
  /** The running context's keys; the operator key is the remembered Taxi's, never its feed's. */
  trust: Omit<IncomingClaimTrust, 'operatorKey'>
  spendConfig: (client: ClaimClient) => Promise<CovenantSpendConfig>
  onOffer: (offer: VerifiedClaim) => void
  /** Called with the `offerKey` of an offer its own Taxi has withdrawn. */
  onGone: (key: string) => void
}

const FIRST_RETRY_MS = 5_000
const MAX_RETRY_MS = 60_000
const EVENT_SOURCE_CLOSED = 2

const feedClosed = (error: TaxiError): boolean =>
  (error.cause as { target?: { readyState?: number } } | undefined)?.target?.readyState === EVENT_SOURCE_CLOSED

/** Subscribe to each Taxi's claims for this wallet, one stream per URL; returns the unsubscribe. */
export const watchReceiverClaims = (watch: ClaimWatch): (() => void) => {
  const verified = new Map<string, VerifiedClaim>()
  const verifying = new Set<string>()
  const withdrawnDuringVerification = new Set<string>()
  let stopped = false

  const consider = async (url: string, taxis: readonly RememberedTaxi[], client: ClaimClient, claim: ReceiverClaim) => {
    const id = claim.transferId
    const key = keyOf(url, id)
    const taxi = triage(claim, taxis, watch.receiverAddress)
    if (taxi === 'not-claimable') {
      if (verifying.has(key)) withdrawnDuringVerification.add(key)
      if (verified.delete(key)) watch.onGone(key)
      return
    }
    if (taxi === 'unknown-unclaimed-mode') {
      return consoleError(claim.claim?.unclaimedMode, `not claiming Taxi transfer ${id}: unknown unclaimedMode`)
    }
    if (typeof taxi === 'string') return
    // Re-offered as is: the receiver may have put it off, and it verified once already.
    const known = verified.get(key)
    if (known) return watch.onOffer(known)
    if (verifying.has(key)) return
    withdrawnDuringVerification.delete(key)
    verifying.add(key)
    let transfer: CovenantTransfer
    try {
      transfer = await client.verifyIncomingClaim(
        claim,
        expectationFor(claim),
        { ...watch.trust, operatorKey: hex.decode(taxi.operatorKey) },
        await watch.spendConfig(client),
      )
    } catch (error) {
      return consoleError(error, `not claiming Taxi transfer ${id}: it failed verification`)
    } finally {
      verifying.delete(key)
    }
    if (stopped || withdrawnDuringVerification.delete(key)) return
    const offer = { taxi, claim, transfer, client }
    verified.set(key, offer)
    watch.onOffer(offer)
  }

  const follow = (url: string, taxis: readonly RememberedTaxi[]): (() => void) => {
    const client = watch.clientFor(url)
    const onClaims = ({ claims }: { claims: ReceiverClaim[] }) => {
      for (const claim of claims) consider(url, taxis, client, claim).catch(consoleError)
    }
    let unsubscribe = () => {}
    let retry: ReturnType<typeof setTimeout> | undefined
    let delay = FIRST_RETRY_MS
    let outage = false
    const subscribe = () => {
      try {
        unsubscribe = client.subscribeClaims({
          receiverAddresses: [watch.receiverAddress],
          onSnapshot: (snapshot) => {
            outage = false
            delay = FIRST_RETRY_MS
            onClaims(snapshot)
          },
          onChanged: onClaims,
          onError: (error) => {
            const transport = error.code === ClientErrorCode.Network
            if (!(transport && outage)) consoleError(error, `Taxi ${url} claim feed`)
            outage = transport
            // EventSource retries a dropped connection itself, but a failed one (a non-200, such as
            // a proxy's 502 mid-redeploy) stays CLOSED: only a new subscription brings it back.
            if (!feedClosed(error) || retry !== undefined || stopped) return
            unsubscribe()
            retry = setTimeout(() => {
              retry = undefined
              if (!stopped) subscribe()
            }, delay)
            delay = Math.min(delay * 2, MAX_RETRY_MS)
          },
        })
      } catch (error) {
        consoleError(error, `could not watch Taxi ${url} for claims`)
      }
    }
    subscribe()
    return () => {
      clearTimeout(retry)
      unsubscribe()
    }
  }

  const byUrl = new Map<string, RememberedTaxi[]>()
  for (const taxi of watch.taxis) byUrl.set(taxi.url, [...(byUrl.get(taxi.url) ?? []), taxi])
  const stops = [...byUrl].map(([url, taxis]) => follow(url, taxis))

  return () => {
    stopped = true
    for (const stopFeed of stops) stopFeed()
  }
}

/** A recycle that ran and failed: the client's capability is one-shot, so only a reload can retry. */
export class ClaimSpent extends Error {
  constructor(readonly reason: unknown) {
    super(extractError(reason))
    this.name = 'ClaimSpent'
  }
}

/** Recycle a verified transfer, merging the planned coin; `offer` exists only once verification passed. */
export const claimVerified = async (offer: VerifiedClaim, plan: RecyclePlan, identity: Identity): Promise<string> => {
  const [funding] = fundingInputsFromVtxos([plan.coin])
  const [control, leaf] = VtxoScript.decode(funding.tapTree).findLeaf(hex.encode(funding.spendLeaf))
  const input: ReceiverWalletInput = {
    input: {
      txid: funding.txid,
      vout: funding.vout,
      value: funding.value,
      tapTree: funding.tapTree,
      tapLeafScript: [
        {
          version: control.version,
          internalKey: Uint8Array.from(control.internalKey),
          merklePath: control.merklePath.map((path) => Uint8Array.from(path)),
        },
        Uint8Array.from(leaf),
      ],
      ...(funding.assetPacket ? { assetPacket: funding.assetPacket } : {}),
    },
    expiry: funding.expiry,
    identity,
  }
  try {
    return await offer.client.recycle(offer.transfer, input, receiverScript(offer.claim))
  } catch (error) {
    throw new ClaimSpent(error)
  }
}

/** The production watch: this wallet's server and co-signer keys, and the browser's fetch. */
export const walletClaimWatch = (args: {
  aspInfo: Pick<
    ArkInfo,
    'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'vtxoTreeExpiry' | 'checkpointTapscript'
  > & { url: string }
  taxis: readonly RememberedTaxi[]
  receiverAddress: string
  onOffer: ClaimWatch['onOffer']
  onGone: ClaimWatch['onGone']
}): ClaimWatch => {
  const { aspInfo, ...rest } = args
  const network = aspInfo.network as NetworkName
  const explorer = getRestApiExplorerURL(network)
  const tipHeight = async () => {
    if (!explorer) throw new Error(`no explorer to read the ${network} chain tip from`)
    return (await new EsploraProvider(explorer).getChainTip()).height
  }
  const ctx = arkadeContextOf(aspInfo, tipHeight)
  return {
    ...rest,
    clientFor: (url) => taxiClient(url, (input, init) => fetch(input, init)),
    trust: { serverKey: ctx.serverKey, emulatorKey: ctx.emulatorKey, vtxoMinAmount: ctx.vtxoMinAmount, hrp: ctx.hrp },
    spendConfig: async (client) => {
      // The wallet knows no emulator URL; the Taxi names it, and the client checks its signer against ours.
      const { emulatorUrl } = await client.info()
      return {
        arkdUrl: aspInfo.url,
        emulatorUrl,
        network: aspInfo.network,
        serverUnrollScript: aspInfo.checkpointTapscript,
        ...(ctx.locktimeDomain === 'height' ? { chainHeight: Number(await ctx.clock()) } : {}),
      }
    },
  }
}
