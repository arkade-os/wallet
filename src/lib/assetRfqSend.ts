import type { IWallet } from '@arkade-os/sdk'
import type { AspInfo } from '../providers/asp'
import { boundedFetch } from '@arkade-taxi/client/wallet'
import type { AssetRfqSendDeps, PayRailUi } from './assetRfqWorkflow'
import { walletArkadeContext } from './receiverTaxi'
import { unreservedCoins } from './swapRepository'
import { consoleError } from './logs'
export {
  hasSatsForReceiverTaxi,
  payAssetRequest,
  PaymentDeclined,
  routesToReceiverTaxi,
  type AssetPaymentTerms,
  type PayRailUi,
} from './assetRfqWorkflow'
export const walletAssetRfqDeps = (args: {
  aspInfo: AspInfo
  wallet: IWallet
  ui: PayRailUi
  quoteAssetPayment: AssetRfqSendDeps['quoteAssetPayment']
  acceptAssetPayment: AssetRfqSendDeps['acceptAssetPayment']
}): AssetRfqSendDeps => ({
  wallet: args.wallet,
  arkade: walletArkadeContext(args.aspInfo),
  ui: args.ui,
  fetch: boundedFetch,
  pageProtocol: window.location.protocol,
  unreservedCoins,
  quoteAssetPayment: args.quoteAssetPayment,
  acceptAssetPayment: args.acceptAssetPayment,
  onError: consoleError,
})
