import {
  Network,
  decodeInvoice,
  ArkadeLightning,
  BoltzSwapProvider,
  PendingReverseSwap,
  PendingSubmarineSwap,
  isSubmarineSwapRefundable,
  isPendingSubmarineSwap,
  isPendingReverseSwap,
} from '@arkade-os/boltz-swap'
import { RestArkProvider, RestIndexerProvider, Wallet, ServiceWorkerWallet } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { sendOffChain } from './asp'
import { consoleError } from './logs'
import { Config } from './types'
import { BackupProvider } from './backup'
import * as Sentry from '@sentry/react'

export class LightningSwapProvider {
  private readonly apiUrl: string
  private readonly config: Config
  private readonly provider: ArkadeLightning
  private readonly wallet: Wallet | ServiceWorkerWallet
  private readonly backupProvider: BackupProvider

  constructor(apiUrl: string, aspInfo: AspInfo, wallet: Wallet | ServiceWorkerWallet, config: Config) {
    const network = aspInfo.network as Network
    const arkProvider = new RestArkProvider(aspInfo.url)
    const swapProvider = new BoltzSwapProvider({ apiUrl, network })
    const indexerProvider = new RestIndexerProvider(aspInfo.url)
    this.backupProvider = new BackupProvider({ pubkey: config.pubkey })

    this.apiUrl = apiUrl
    this.config = config
    this.wallet = wallet
    this.provider = new ArkadeLightning({ wallet, arkProvider, swapProvider, indexerProvider })
  }

  private backup = async (swap: PendingReverseSwap | PendingSubmarineSwap) => {
    if (!this.config.nostrBackup) return
    try {
      if (isPendingSubmarineSwap(swap)) {
        const pendingSwaps = await this.provider.getPendingSubmarineSwaps()
        const existingSwap = pendingSwaps.find((s) => s.id === swap.id)
        if (existingSwap) swap = existingSwap
        await this.backupProvider.backupSubmarineSwap(swap)
      } else if (isPendingReverseSwap(swap)) {
        const pendingSwaps = await this.provider.getPendingReverseSwaps()
        const existingSwap = pendingSwaps.find((s) => s.id === swap.id)
        if (existingSwap) swap = existingSwap
        await this.backupProvider.backupReverseSwap(swap)
      }
    } catch (error) {
      consoleError(error, 'Failed to backup swap to Nostr')
    }
  }

  private someError = (error: any, message: string) => {
    consoleError(error, message)
    return new Error(message)
  }

  decodeInvoice = (invoice: string) => {
    return decodeInvoice(invoice)
  }

  getApiUrl = () => {
    return this.apiUrl
  }

  getFees = async () => {
    return this.provider.getFees()
  }

  getLimits = async () => {
    return this.provider.getLimits()
  }

  getSwapHistory = () => {
    return this.provider.getSwapHistory()
  }

  refreshSwapsStatus = () => {
    return this.provider.refreshSwapsStatus()
  }

  // receive

  createReverseSwap = async (sats: number): Promise<PendingReverseSwap> => {
    if (!Number.isFinite(sats) || sats <= 0) throw new Error('Invalid amount')

    const pendingSwap = await this.provider.createReverseSwap({
      amount: sats,
      description: 'Lightning Invoice',
    })
    if (!pendingSwap) throw new Error('Failed to create reverse swap')

    console.log('Created reverse swap:', pendingSwap.id)
    await this.backup(pendingSwap)

    return pendingSwap
  }

  waitAndClaim = async (pendingSwap: PendingReverseSwap) => {
    if (!pendingSwap) throw new Error('Invalid pending swap')
    try {
      return await this.provider.waitAndClaim(pendingSwap)
    } catch (error) {
      Sentry.logger.info(`Failed to claim swap ${pendingSwap.response.id}`, { error, swap: pendingSwap })
      throw this.someError(error, 'Error claiming VHTLC')
    }
  }

  claimVHTLC = async (pendingSwap: PendingReverseSwap) => {
    await this.provider.claimVHTLC(pendingSwap)
    console.log('Claimed reverse swap:', pendingSwap.id)
    await this.backup(pendingSwap)
  }

  // send

  payInvoice = async (pendingSwap: PendingSubmarineSwap): Promise<{ txid: string; preimage: string }> => {
    if (!pendingSwap) throw new Error('No pending swap found')
    if (!pendingSwap.response.address) throw new Error('No swap address found')
    if (!pendingSwap.response.expectedAmount) throw new Error('No swap amount found')

    const satoshis = pendingSwap.response.expectedAmount
    const swapAddress = pendingSwap.response.address

    const txid = await sendOffChain(this.wallet, satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      const { preimage } = await this.waitForSwapSettlement(pendingSwap)
      return { txid, preimage }
    } catch (e: unknown) {
      const refundable = typeof (e as any)?.isRefundable === 'boolean' ? (e as any).isRefundable : false
      if (!refundable) throw this.someError(e, 'Swap failed: VHTLC not refundable')
      try {
        await this.refundVHTLC(pendingSwap)
      } catch (error) {
        Sentry.logger.info(`Failed to refund swap ${pendingSwap.response.id}`, { error, swap: pendingSwap })
        throw this.someError(error, 'Swap failed: VHTLC refund failed')
      }
      throw new Error('Swap failed: VHTLC refunded')
    }
  }

  createSubmarineSwap = async (invoice: string): Promise<PendingSubmarineSwap> => {
    if (!invoice) throw new Error('Invalid invoice')
    const pendingSwap = await this.provider.createSubmarineSwap({ invoice })
    if (!pendingSwap) throw new Error('Failed to create swap')
    console.log('Created submarine swap:', pendingSwap.response.id)
    await this.backup(pendingSwap)
    return pendingSwap
  }

  waitForSwapSettlement = async (
    pendingSwap: PendingSubmarineSwap,
  ): Promise<{
    preimage: string
  }> => {
    return await this.provider.waitForSwapSettlement(pendingSwap)
  }

  refundVHTLC = async (pendingSwap: PendingSubmarineSwap) => {
    await this.provider.refundVHTLC(pendingSwap)
    console.log('Refunded submarine swap:', pendingSwap.response.id)
    await this.backup(pendingSwap)
  }

  refundFailedSubmarineSwaps = async () => {
    const swaps = await this.provider.getSwapHistory()
    for (const swap of swaps.filter(isSubmarineSwapRefundable)) {
      try {
        await this.refundVHTLC(swap)
      } catch (error) {
        Sentry.logger.info(`Failed to refund swap ${swap.response.id}`, { error, swap })
        consoleError(error, `Failed to refund swap ${swap.response.id}`)
      }
    }
  }
}
