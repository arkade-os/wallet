import type { IWallet } from '@arkade-os/sdk'
import {
  createTaxiSender,
  TaxiUnavailableError,
  type DirectTaxiSendArgs as TaxiSendArgs,
} from '@arkade-taxi/client/wallet'
import { hex } from '@scure/base'
import type { AspInfo } from '../providers/asp'
import { consoleError } from './logs'
import { walletArkadeContext, TAXI_REFUSAL_TEXT } from './receiverTaxi'
import { unreservedCoins } from './swapRepository'
import { readAssetPayment } from './pendingAssetPayment'
import {
  readTaxiActivity,
  recordTaxiActivity,
  recordTaxiStatus,
  refreshTaxiActivity,
  taxiActivityKey,
  type TaxiActivity,
} from './taxiActivity'

export {
  FailedDirectTaxi,
  PendingDirectTaxi,
  ReturnedDirectTaxi,
  taxiActivityFromPending,
  type DirectTaxiMode,
  type DirectTaxiTerms,
} from '@arkade-taxi/client/wallet'

const sender = (aspInfo?: AspInfo, assetPaymentSender?: string) =>
  createTaxiSender({
    storage: localStorage,
    runExclusive: async (key, run) => {
      if (!navigator.locks) throw new Error('This browser cannot safely coordinate Taxi payments')
      return navigator.locks.request(key, () => {
        if (aspInfo && assetPaymentSender && readAssetPayment(assetPaymentSender, aspInfo.network))
          throw new Error('Check asset payment before starting another')
        return run()
      })
    },
    getContext: async () => {
      if (!aspInfo) throw new Error('Trusted Arkade context is unavailable')
      return walletArkadeContext(aspInfo)
    },
    serverUnrollScript: hex.decode(aspInfo?.checkpointTapscript ?? ''),
    unreservedCoins: (wallet) => unreservedCoins(wallet),
    pageProtocol: window.location.protocol,
    recordActivity: recordTaxiActivity,
    recordStatus: recordTaxiStatus,
    onHistoryError: (error) => consoleError(error, 'cannot record the Taxi payment in history'),
  })

export const getPendingDirectTaxi = (wallet: Pick<IWallet, 'identity'>, network: string) =>
  sender().getPendingDirectTaxi(wallet, network)

export const withTaxiPaymentLock = <T>(
  wallet: Pick<IWallet, 'identity'>,
  network: string,
  run: (senderKey: string) => Promise<T>,
): Promise<T> => sender().withTaxiPaymentLock(wallet, network, run)

export const getPendingAssetPayment = async (wallet: Pick<IWallet, 'identity'>, network: string) =>
  readAssetPayment(hex.encode(await wallet.identity.xOnlyPublicKey()), network)

export const resumePendingDirectTaxi = (wallet: Pick<IWallet, 'identity'>, network: string, transferId: string) =>
  sender().resumePendingDirectTaxi(wallet, network, transferId)

export const checkTaxiPayment = async (record: TaxiActivity, wallet: Pick<IWallet, 'identity'> | undefined) => {
  await refreshTaxiActivity(record)
  const fresh = readTaxiActivity(record.network).find((other) => taxiActivityKey(other) === taxiActivityKey(record))
  if (record.role !== 'sender' || !wallet || !fresh || fresh.state === 'gone' || fresh.submissionPhase === 'failed')
    return
  await resumePendingDirectTaxi(wallet, record.network, record.transferId)
}

interface DirectTaxiSendArgs extends Omit<TaxiSendArgs, 'network'> {
  aspInfo: AspInfo
}

export const sendDirectTaxi = async ({ aspInfo, ...args }: DirectTaxiSendArgs): Promise<string> => {
  try {
    const senderKey = hex.encode(await args.wallet.identity.xOnlyPublicKey())
    return await sender(aspInfo, senderKey).sendDirectTaxi({ ...args, network: aspInfo.network })
  } catch (cause) {
    if (cause instanceof TaxiUnavailableError)
      throw new Error(`Taxi unavailable: ${TAXI_REFUSAL_TEXT[cause.reason]}`, { cause })
    throw cause
  }
}
