import {
  Wallet,
  Network,
  decodeInvoice,
  ArkadeLightning,
  BoltzSwapProvider,
  PendingReverseSwap,
  PendingSubmarineSwap,
} from '@arkade-os/boltz-swap'
import { RestArkProvider, RestIndexerProvider } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { BoltzUrl } from './constants'

export class LightningSwap {
  private readonly provider: ArkadeLightning
  private readonly swapProvider: BoltzSwapProvider

  constructor(aspInfo: AspInfo, wallet: Wallet) {
    const arkProvider = new RestArkProvider(aspInfo.url)
    const swapProvider = new BoltzSwapProvider({
      network: aspInfo.network as Network,
      apiUrl: BoltzUrl,
    })
    const indexerProvider = new RestIndexerProvider(aspInfo.url)

    this.swapProvider = swapProvider
    this.provider = new ArkadeLightning({ wallet, arkProvider, swapProvider, indexerProvider })
  }

  decodeInvoice = (invoice: string) => {
    return decodeInvoice(invoice)
  }

  getLimits = async () => {
    return this.swapProvider.getLimits()
  }

  // receive

  createReverseSwap = async (sats: number) => {
    return this.provider.createReverseSwap({
      amount: sats,
      description: 'Lightning Invoice',
    })
  }

  waitAndClaim = async (pendingSwap: PendingReverseSwap) => {
    return this.provider.waitAndClaim(pendingSwap)
  }

  claimVHTLC = async (pendingSwap: PendingReverseSwap) => {
    return this.provider.claimVHTLC(pendingSwap)
  }

  // send

  createSubmarineSwap = async (invoice: string) => {
    return this.provider.createSubmarineSwap({
      invoice,
    })
  }

  waitForSwapSettlement = async (pendingSwap: PendingSubmarineSwap) => {
    return this.provider.waitForSwapSettlement(pendingSwap)
  }

  refundVHTLC = async (pendingSwap: PendingSubmarineSwap) => {
    return this.provider.refundVHTLC(pendingSwap)
  }
}

export const calcSwapFee = (satoshis: number): number => {
  return Math.ceil(satoshis * 0.0001) // TODO: replace this
}
