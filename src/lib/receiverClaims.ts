import { type ArkadeInfo, type IWallet } from '@arkade-os/sdk'
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

/** Renewal contracts of the wallet's own key, from any session or mode; a rotated key's row signs by descriptor. */
export const renewalAddresses = async (wallet: Pick<IWallet, 'getContractManager'>): Promise<string[]> => {
  const rows = await (await wallet.getContractManager()).getContracts({ type: 'executor' })
  return rows
    .filter((row) => row.params.template === 'renewal' && row.metadata?.signingDescriptor === undefined)
    .map((row) => row.address)
}

export const walletClaimWatch = (args: {
  aspInfo: Pick<
    ArkadeInfo,
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
