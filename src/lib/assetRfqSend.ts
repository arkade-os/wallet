import { type ArkInfo, type IWallet, type NetworkName } from '@arkade-os/sdk'
import { fundOffer, requestArkadeSwap } from '@arkade-os/swap'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { assetRfqSolvers, boundedFetch, type AssetRfqSendDeps, type PayRailUi } from '@arkade-os/taxi'
import { getEmulatorPubkeyOverrideForNetwork } from './constants'
import { consoleError } from './logs'
import { withRfqTransport } from './nostrRfq'
import { walletArkadeContext } from './receiverTaxi'
import { assetSwapRepository, unreservedCoins } from './swapRepository'

export {
  assetRfqSolvers,
  FILL_MARGIN_SECONDS,
  hasSatsForReceiverTaxi,
  payAssetRequest,
  PaymentDeclined,
  routesToReceiverTaxi,
  type AssetPaymentRequest,
  type AssetPaymentTerms,
  type AssetRfqSendDeps,
  type PayRailUi,
} from '@arkade-os/taxi'

export const walletAssetRfqDeps = (args: {
  aspInfo: Pick<ArkInfo, 'network' | 'signerPubkey' | 'dust' | 'vtxoMinAmount' | 'vtxoTreeExpiry'> & {
    url: string
  }
  wallet: IWallet
  markets: DiscoveredMarket[]
  assetId: string
  ui: PayRailUi
}): AssetRfqSendDeps => {
  return {
    wallet: args.wallet,
    arkServerUrl: args.aspInfo.url,
    arkade: walletArkadeContext(args.aspInfo),
    solvers: assetRfqSolvers(args.markets, args.assetId),
    ui: args.ui,
    fetch: boundedFetch,
    pageProtocol: window.location.protocol,
    repository: assetSwapRepository,
    emulatorPubkey: getEmulatorPubkeyOverrideForNetwork(args.aspInfo.network as NetworkName),
    requestArkadeSwap,
    fundOffer,
    unreservedCoins: (wallet) => unreservedCoins(wallet, assetSwapRepository),
    withRfqTransport,
    onError: consoleError,
  }
}
