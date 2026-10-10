import { type ArkInfo } from '@arkade-os/sdk'
import { createClaimWatch, type ClaimWatch, type RememberedTaxi } from '@arkade-taxi/client/wallet'
import { consoleError } from './logs'
import { walletArkadeContext } from './receiverTaxi'

export {
  ClaimSpent,
  claimKey,
  deliveredAssetId,
  offerKey,
  receiverFareOf,
  taxiActivityFromOffer,
  watchReceiverClaims,
  type ClaimPlan,
  type ReceiverClaim,
} from '@arkade-taxi/client/wallet'

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
