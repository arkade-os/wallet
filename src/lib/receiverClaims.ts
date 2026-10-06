import { type ArkInfo } from '@arkade-os/sdk'
import { createClaimWatch, watchReceiverClaims as watchClaims, type ClaimWatch } from '@arkade-taxi/client/wallet'
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
} from '@arkade-taxi/client/wallet'

export const watchReceiverClaims = (watch: ClaimWatch): (() => void) => watchClaims({ ...watch, onError: consoleError })

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
