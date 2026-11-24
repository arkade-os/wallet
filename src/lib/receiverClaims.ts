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

/** Every Executor renewal contract this wallet registered, whichever session or params it came from: Receive may
 * have shown any of them as the Ark address a Taxi request named. */
export const renewalAddresses = async (wallet: Pick<IWallet, 'getContractManager'>): Promise<string[]> => {
  const rows = await (await wallet.getContractManager()).getContracts({ type: 'executor' })
  return rows.filter((row) => row.params.template === 'renewal').map((row) => row.address)
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
