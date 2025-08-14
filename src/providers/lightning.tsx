import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { LightningSwap } from '../lib/lightning'
import { consoleError } from '../lib/logs'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { PendingReverseSwap, PendingSubmarineSwap, SwapError } from '@arkade-os/boltz-swap'
import { sendOffChain } from '../lib/asp'

interface LightningContextProps {
  createReverseSwap: (amount: number) => Promise<void | PendingReverseSwap>
  createSubmarineSwap: (invoice: string) => Promise<void | PendingSubmarineSwap>
  getLimits: () => Promise<void | { min: number; max: number }> // TODO: change to LimitsResponse from boltz-swap
  payInvoice: (pendingSwap: PendingSubmarineSwap) => Promise<string>
  waitAndClaim: (pendingSwap: PendingReverseSwap) => Promise<void>
  swapProvider: LightningSwap | null
}

export const LightningContext = createContext<LightningContextProps>({
  getLimits: async () => {},
  createSubmarineSwap: async () => {},
  createReverseSwap: async () => {},
  payInvoice: async () => '',
  swapProvider: null,
  waitAndClaim: async () => {},
})

export const LightningProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)

  const [swapProvider, setSwapProvider] = useState<LightningSwap | null>(null)

  // create swap provider on first run with svcWallet
  useEffect(() => {
    if (!aspInfo.network || !svcWallet) return
    if (aspInfo.network === 'signet') return // TODO: better handling
    const provider = new LightningSwap(aspInfo, svcWallet)
    setSwapProvider(provider)
  }, [aspInfo, svcWallet])

  const someError = (error: any, message: string) => {
    consoleError(error, message)
    return new Error(message)
  }

  // create a submarine swap to pay a ln invoice (result will be used in payInvoice())
  const createSubmarineSwap = async (invoice: string): Promise<PendingSubmarineSwap> => {
    if (!invoice) throw new Error('Invalid invoice')
    if (!swapProvider) throw new Error('Swap provider not available')

    const pendingSwap = await swapProvider.createSubmarineSwap(invoice)
    if (!pendingSwap) throw new Error('Failed to create swap')

    return pendingSwap
  }

  // pay a lightning invoice (submarine swap was made before, available on sendInfo.pendingSwap)
  const payInvoice = async (pendingSwap: PendingSubmarineSwap): Promise<string> => {
    if (!pendingSwap) throw new Error('No pending swap found')
    if (!svcWallet) throw new Error('Wallet service not available')
    if (!swapProvider) throw new Error('Swap provider not available')
    if (!pendingSwap.response.address) throw new Error('No swap address found')
    if (!pendingSwap.response.expectedAmount) throw new Error('No swap amount found')

    const satoshis = pendingSwap.response.expectedAmount
    const swapAddress = pendingSwap.response.address

    const txid = await sendOffChain(svcWallet, satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      await swapProvider.waitForSwapSettlement(pendingSwap)
      return txid // provider claimed the VHTLC
    } catch (e) {
      const { isRefundable } = e as SwapError
      if (!isRefundable) throw someError(e, 'Swap failed: VHTLC not refundable')
      try {
        await swapProvider.refundVHTLC(pendingSwap)
      } catch (e) {
        throw someError(e, 'Swap failed: VHTLC refund failed')
      }
      throw new Error('Swap failed: VHTLC refunded')
    }
  }

  const createReverseSwap = async (amount: number): Promise<PendingReverseSwap> => {
    if (!amount) throw new Error('Invalid amount')
    if (!swapProvider) throw new Error('Swap provider not available')

    const pendingSwap = await swapProvider.createReverseSwap(amount)
    if (!pendingSwap) throw new Error('Failed to create reverse swap')

    return pendingSwap
  }

  const waitAndClaim = async (pendingSwap: PendingReverseSwap) => {
    if (!pendingSwap) throw new Error('Invalid pending swap')
    if (!swapProvider) throw new Error('Swap provider not available')

    try {
      await swapProvider.waitAndClaim(pendingSwap)
      return
    } catch (e) {
      throw someError(e, 'Error claiming VHTLC')
    }
  }

  const getLimits = async () => {
    if (!swapProvider) throw new Error('Swap provider not available')
    return swapProvider.getLimits()
  }

  return (
    <LightningContext.Provider
      value={{ createSubmarineSwap, createReverseSwap, getLimits, payInvoice, waitAndClaim, swapProvider }}
    >
      {children}
    </LightningContext.Provider>
  )
}
