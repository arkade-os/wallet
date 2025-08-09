import { ReactNode, createContext, useContext } from 'react'
import { LightningSwap } from '../lib/lightning'
import { consoleError } from '../lib/logs'
import { AspContext } from './asp'
import { WalletContext } from './wallet'
import { FlowContext } from './flow'
import { PendingReverseSwap, PendingSubmarineSwap, SwapError } from '@arkade-os/boltz-swap'
import { sendOffChain } from '../lib/asp'

interface LightningContextProps {
  createSwap: (invoice: string) => Promise<void | PendingSubmarineSwap>
  payInvoice: (invoice: string) => Promise<void>
  receiveSats: (amount: number) => Promise<void>
}

export const LightningContext = createContext<LightningContextProps>({
  createSwap: async () => {},
  payInvoice: async () => {},
  receiveSats: async () => {},
})

export const LightningProvider = ({ children }: { children: ReactNode }) => {
  const { aspInfo } = useContext(AspContext)
  const { svcWallet } = useContext(WalletContext)
  const { recvInfo, setRecvInfo, sendInfo, setSendInfo } = useContext(FlowContext)

  const someError = (error: any, message: string) => {
    consoleError(error, message)
    return new Error(message)
  }

  // create a submarine swap to pay a ln invoice
  const createSwap = async (invoice: string) => {
    if (!invoice) throw new Error('Invalid invoice')
    if (!svcWallet) throw new Error('Wallet service not available')

    const swapProvider = new LightningSwap(aspInfo, svcWallet)

    const pendingSwap = await swapProvider.createSubmarineSwap(invoice)
    if (!pendingSwap) throw new Error('Failed to create swap')

    setSendInfo({ ...sendInfo, pendingSwap })
  }

  // pay a lightning invoice (submarine swap as made before)
  const payInvoice = async (invoice: string) => {
    if (!sendInfo.satoshis) throw new Error('No amount found')
    if (!svcWallet) throw new Error('Wallet service not available')
    if (!sendInfo.pendingSwap) throw new Error('No pending swap found')
    if (!sendInfo.pendingSwap?.response.address) throw new Error('No swap address found')
    if (invoice !== sendInfo.pendingSwap.request.invoice) throw new Error('Invoice does not match pending swap')

    const satoshis = sendInfo.satoshis
    const pendingSwap = sendInfo.pendingSwap
    const swapAddress = pendingSwap?.response.address
    const swapProvider = new LightningSwap(aspInfo, svcWallet)

    const txid = await sendOffChain(svcWallet, satoshis, swapAddress)
    if (!txid) throw new Error('Failed to send offchain payment')

    try {
      await swapProvider.waitForSwapSettlement(pendingSwap)
      setSendInfo({ ...sendInfo, txid }) // provider claimed the VHTLC
    } catch (e) {
      const { isRefundable } = e as SwapError
      if (!isRefundable) {
        throw someError(e, 'Swap failed: VHTLC not refundable')
      }
      try {
        await swapProvider.refundVHTLC(pendingSwap)
      } catch (e) {
        throw someError(e, 'Swap failed: VHTLC refund failed')
      }
      throw new Error('Swap failed: VHTLC refunded')
    }
  }

  const receiveSats = async (amount: number) => {
    if (!amount) throw new Error('Invalid amount')
    if (!svcWallet) throw new Error('Wallet service not available')

    let pendingSwap: PendingReverseSwap | undefined
    const swapProvider = new LightningSwap(aspInfo, svcWallet)

    try {
      pendingSwap = await swapProvider.createReverseSwap(amount)
      if (!pendingSwap.response.invoice) throw new Error('Failed to create invoice')
      setRecvInfo({ ...recvInfo, invoice: pendingSwap.response.invoice })
    } catch (e) {
      throw someError(e, 'Error creating reverse swap')
    }

    try {
      await swapProvider.waitAndClaim(pendingSwap)
      setRecvInfo({ ...recvInfo, satoshis: pendingSwap.response.onchainAmount })
    } catch (e) {
      throw someError(e, 'Error claiming VHTLC')
    }
  }

  return (
    <LightningContext.Provider value={{ createSwap, payInvoice, receiveSats }}>{children}</LightningContext.Provider>
  )
}
