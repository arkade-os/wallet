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
} from '@arkade-taxi/client'
import { hex } from '@scure/base'
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
export const receiverFareOf = (claim: ReceiverClaim) => {
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

const triage = (claim: ReceiverClaim, taxi: RememberedTaxi, receiverAddress: string): Skip | undefined => {
  const descriptor = claim.claim
  if (claim.state !== 'locked' || !claim.claimable || !descriptor) return 'not-claimable'
  if (claim.receiverAddress !== receiverAddress) return 'not-this-wallet'
  if (descriptor.params.operatorKey !== taxi.operatorKey) return 'other-operator'
  const { receiverFare, claimMode, recoveryRecipient } = descriptor.params
  if (!receiverFare || claimMode !== 'recycle' || recoveryRecipient !== 'receiver') return 'not-receiver-paid'
  if (descriptor.unclaimedMode !== 'reclaim') return 'unknown-unclaimed-mode'
  return undefined
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

export interface ClaimWatch {
  taxis: readonly RememberedTaxi[]
  receiverAddress: string
  clientFor: (url: string) => ClaimClient
  /** The running context's keys; the operator key is the remembered Taxi's, never its feed's. */
  trust: Omit<IncomingClaimTrust, 'operatorKey'>
  spendConfig: (client: ClaimClient) => Promise<CovenantSpendConfig>
  onOffer: (offer: VerifiedClaim) => void
  onGone: (transferId: string) => void
}

/** Subscribe to each Taxi's claims for this wallet; returns the unsubscribe. */
export const watchReceiverClaims = (watch: ClaimWatch): (() => void) => {
  const considered = new Set<string>()
  let stopped = false

  const consider = async (taxi: RememberedTaxi, client: ClaimClient, claim: ReceiverClaim) => {
    const skip = triage(claim, taxi, watch.receiverAddress)
    if (skip === 'not-claimable') {
      considered.delete(claim.transferId)
      return watch.onGone(claim.transferId)
    }
    if (skip === 'unknown-unclaimed-mode') {
      return consoleError(
        claim.claim?.unclaimedMode,
        `not claiming Taxi transfer ${claim.transferId}: unknown unclaimedMode`,
      )
    }
    if (skip || considered.has(claim.transferId)) return
    considered.add(claim.transferId)
    let transfer: CovenantTransfer
    try {
      transfer = await client.verifyIncomingClaim(
        claim,
        expectationFor(claim),
        { ...watch.trust, operatorKey: hex.decode(taxi.operatorKey) },
        await watch.spendConfig(client),
      )
    } catch (error) {
      considered.delete(claim.transferId)
      return consoleError(error, `not claiming Taxi transfer ${claim.transferId}: it failed verification`)
    }
    if (!stopped) watch.onOffer({ taxi, claim, transfer, client })
  }

  const unsubscribes = watch.taxis.map((taxi) => {
    const client = watch.clientFor(taxi.url)
    const onClaims = ({ claims }: { claims: ReceiverClaim[] }) => {
      for (const claim of claims) consider(taxi, client, claim).catch(consoleError)
    }
    let outage = false
    try {
      return client.subscribeClaims({
        receiverAddresses: [watch.receiverAddress],
        onSnapshot: (snapshot) => {
          outage = false
          onClaims(snapshot)
        },
        onChanged: onClaims,
        // EventSource reconnects on its own: one log line per outage, not one per retry.
        onError: (error) => {
          const transport = error.code === ClientErrorCode.Network
          if (transport && outage) return
          outage = transport
          consoleError(error, `Taxi ${taxi.url} claim feed`)
        },
      })
    } catch (error) {
      consoleError(error, `could not watch Taxi ${taxi.url} for claims`)
      return () => {}
    }
  })

  return () => {
    stopped = true
    for (const unsubscribe of unsubscribes) unsubscribe()
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
  return offer.client.recycle(offer.transfer, input, receiverScript(offer.claim))
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
