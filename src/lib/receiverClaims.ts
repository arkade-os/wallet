import { type ArkInfo, type Identity } from '@arkade-os/sdk'
import {
  ClaimSpent,
  claimVerified as executeClaim,
  createClaimWatch,
  watchReceiverClaims as watchClaims,
  type ClaimPlan,
  type ClaimWatch,
  type RecyclePlan,
  type VerifiedClaim,
} from '@arkade-os/taxi'
import { extractError } from './error'
import { consoleError } from './logs'
import { walletArkadeContext } from './receiverTaxi'
import type { RememberedTaxi } from './storage'

export {
  ClaimSpent,
  claimKey,
  deliveredAssetId,
  guardedClaimIdentity,
  isFreeReceiverClaim,
  offerKey,
  planReceiverClaim,
  receiverFareOf,
  taxiActivityFromOffer,
  type ClaimClient,
  type ClaimPlan,
  type ClaimWatch,
  type ReceiverClaim,
  type RecyclePlan,
  type VerifiedClaim,
} from '@arkade-os/taxi'

export const watchReceiverClaims = (watch: ClaimWatch): (() => void) => watchClaims({ ...watch, onError: consoleError })

export const claimVerified = async (
  offer: VerifiedClaim,
  plan: RecyclePlan | Extract<ClaimPlan, { kind: 'purchase' }>,
  identity: Identity,
): Promise<string> => {
  try {
    return await executeClaim(offer, plan, identity)
  } catch (error) {
    if (error instanceof ClaimSpent) error.message = extractError(error.reason)
    throw error
  }
}

export const walletClaimWatch = (args: {
  aspInfo: Pick<
    ArkInfo,
    'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'vtxoTreeExpiry' | 'checkpointTapscript'
  > & { url: string }
  taxis: readonly RememberedTaxi[]
  receiverAddress: string
  initialOffers?: ClaimWatch['initialOffers']
  onOffer: ClaimWatch['onOffer']
  onGone: ClaimWatch['onGone']
}): ClaimWatch => {
  const { aspInfo, ...rest } = args
  return createClaimWatch({
    ...rest,
    context: walletArkadeContext(aspInfo),
    network: aspInfo.network,
    arkdUrl: aspInfo.url,
    serverUnrollScript: aspInfo.checkpointTapscript,
    onError: consoleError,
  })
}
