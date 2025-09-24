import {
  Network,
  decodeInvoice,
  ArkadeLightning,
  BoltzSwapProvider,
  PendingReverseSwap,
  PendingSubmarineSwap,
  isSubmarineSwapRefundable,
} from '@arkade-os/boltz-swap'
import { RestArkProvider, RestIndexerProvider, Wallet, ServiceWorkerWallet } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { sendOffChain } from './asp'
import { consoleError } from './logs'

export class LightningSwapProvider {
  private readonly apiUrl: string
  private readonly provider: ArkadeLightning
  private readonly wallet: Wallet | ServiceWorkerWallet

  constructor(apiUrl: string, aspInfo: AspInfo, wallet: Wallet | ServiceWorkerWallet) {
    const network = aspInfo.network as Network
    const arkProvider = new RestArkProvider(aspInfo.url)
    const swapProvider = new BoltzSwapProvider({ apiUrl, network })
    const indexerProvider = new RestIndexerProvider(aspInfo.url)

    this.apiUrl = apiUrl
    this.wallet = wallet
    this.provider = new ArkadeLightning({ wallet, arkProvider, swapProvider, indexerProvider })
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
    if (!this.provider) throw new Error('Swap provider not available')
    return this.provider.getFees()
  }

  getLimits = async () => {
    if (!this.provider) throw new Error('Swap provider not available')
    return this.provider.getLimits()
  }

  getSwapHistory = () => {
    if (!this.provider) throw new Error('Swap provider not available')
    return this.provider.getSwapHistory()
  }

  refreshSwapsStatus = () => {
    if (!this.provider) throw new Error('Swap provider not available')
    return this.provider.refreshSwapsStatus()
  }

  // receive

  createReverseSwap = async (sats: number): Promise<PendingReverseSwap> => {
    if (!sats) throw new Error('Invalid amount')
    if (!this.provider) throw new Error('Swap provider not available')

    const pendingSwap = await this.provider.createReverseSwap({
      amount: sats,
      description: 'Lightning Invoice',
    })
    if (!pendingSwap) throw new Error('Failed to create reverse swap')

    return pendingSwap
  }

  waitAndClaim = async (pendingSwap: PendingReverseSwap) => {
    if (!pendingSwap) throw new Error('Invalid pending swap')
    if (!this.provider) throw new Error('Swap provider not available')

    try {
      await this.provider.waitAndClaim(pendingSwap)
      return
    } catch (e) {
      throw this.someError(e, 'Error claiming VHTLC')
    }
  }

  claimVHTLC = async (pendingSwap: PendingReverseSwap) => {
    return this.provider.claimVHTLC(pendingSwap)
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
      } catch (e) {
        throw this.someError(e, 'Swap failed: VHTLC refund failed')
      }
      throw new Error('Swap failed: VHTLC refunded')
    }
  }

  createSubmarineSwap = async (invoice: string): Promise<PendingSubmarineSwap> => {
    if (!invoice) throw new Error('Invalid invoice')
    const pendingSwap = await this.provider.createSubmarineSwap({ invoice })
    if (!pendingSwap) throw new Error('Failed to create swap')
    return pendingSwap
  }

  waitForSwapSettlement = async (pendingSwap: PendingSubmarineSwap) => {
    return this.provider.waitForSwapSettlement(pendingSwap)
  }

  refundVHTLC = async (pendingSwap: PendingSubmarineSwap) => {
    return this.provider.refundVHTLC(pendingSwap)
  }

  refundFailedSubmarineSwaps = async () => {
    const swaps = await this.provider.getSwapHistory()

    for (const swap of swaps.filter(isSubmarineSwapRefundable)) {
      console.log('Refunding failed submarine swap', swap)
      try {
        await this.refundVHTLC(swap)
        console.log('Successfully refunded swap:', swap.response.id)
      } catch (e) {
        consoleError(e, `Failed to refund swap ${swap.response.id}`)
      }
    }
  }
}
