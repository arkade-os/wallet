import type { IWallet } from '@arkade-os/sdk'
import {
  createTaxiSender,
  TaxiUnavailableError,
  type DirectTaxiSendArgs as TaxiSendArgs,
  type PendingTaxiRecord,
} from '@arkade-os/taxi'
import { hex } from '@scure/base'
import type { AspInfo } from '../providers/asp'
import { consoleError } from './logs'
import { walletArkadeContext, TAXI_REFUSAL_TEXT } from './receiverTaxi'
import { assetSwapRepository, unreservedCoins } from './swapRepository'
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
  type PendingTaxiRecord,
} from '@arkade-os/taxi'

const sender = (aspInfo?: AspInfo) =>
  createTaxiSender({
    storage: localStorage,
    runExclusive: async (key, run) => {
      if (!navigator.locks) throw new Error('This browser cannot safely coordinate Taxi payments')
      return navigator.locks.request(key, run)
    },
    getContext: async () => {
      if (!aspInfo) throw new Error('Trusted Arkade context is unavailable')
      return walletArkadeContext(aspInfo)
    },
    serverUnrollScript: hex.decode(aspInfo?.checkpointTapscript ?? ''),
    unreservedCoins: (wallet) => unreservedCoins(wallet, assetSwapRepository),
    pageProtocol: window.location.protocol,
    recordActivity: recordTaxiActivity,
    recordStatus: recordTaxiStatus,
    onHistoryError: (error) => consoleError(error, 'cannot record the Taxi payment in history'),
  })

export const getPendingDirectTaxi = (wallet: Pick<IWallet, 'identity'>, network: string) =>
  sender().getPendingDirectTaxi(wallet, network)

export const journalDirectTaxi = (record: PendingTaxiRecord): void => sender().journalDirectTaxi(record)

export const withTaxiPaymentLock = <T>(
  wallet: Pick<IWallet, 'identity'>,
  network: string,
  run: (senderKey: string) => Promise<T>,
): Promise<T> => sender().withTaxiPaymentLock(wallet, network, run)

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
    return await sender(aspInfo).sendDirectTaxi({ ...args, network: aspInfo.network })
  } catch (cause) {
    if (cause instanceof TaxiUnavailableError)
      throw new Error(`Taxi unavailable: ${TAXI_REFUSAL_TEXT[cause.reason]}`, { cause })
    throw cause
  }
}
