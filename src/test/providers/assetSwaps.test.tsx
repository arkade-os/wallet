import { useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AspContext } from '../../providers/asp'
import { AssetSwapsContext, AssetSwapsProvider } from '../../providers/assetSwaps'
import { WalletContext } from '../../providers/wallet'
import { addAssetSwap, getAssetSwaps, type AssetSwap, updateAssetSwap } from '../../lib/swap/store'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

const cancelOffer = vi.hoisted(() => vi.fn())
const getVtxos = vi.hoisted(() => vi.fn())

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  RestIndexerProvider: class {
    getVtxos = getVtxos
  },
}))

vi.mock('../../lib/swap/offer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swap/offer')>()),
  cancelOffer,
}))

const pendingSwap: AssetSwap = {
  id: 'funding-txid',
  fromAsset: 'btc',
  toAsset: 'asset-beta',
  fromAmount: '10000',
  toAmount: '500',
  swapAddress: 'tark1q...',
  swapPkScript: `5120${'ab'.repeat(32)}`,
  offerHex: '0100',
  fundingTxid: 'funding-txid',
  status: 'pending',
  createdAt: 1,
}

function CancelHarness() {
  const { cancelSwap } = useContext(AssetSwapsContext)
  return <button onClick={() => cancelSwap(pendingSwap.id).catch(() => {})}>Cancel</button>
}

function renderProvider(reloadWallet = vi.fn().mockResolvedValue(undefined)) {
  render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: '', url: '' } } as any}
    >
      <WalletContext.Provider value={{ ...mockWalletContextValue, reloadWallet, svcWallet: { identity: {} } } as any}>
        <AssetSwapsProvider>
          <CancelHarness />
        </AssetSwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
  return reloadWallet
}

describe('AssetSwapsProvider cancellation', () => {
  beforeEach(() => {
    localStorage.clear()
    cancelOffer.mockReset().mockResolvedValue('cancel-txid')
    getVtxos.mockReset()
    addAssetSwap(pendingSwap)
  })

  afterEach(() => localStorage.clear())

  it('persists the cancellation transaction ID with the terminal status', async () => {
    const reloadWallet = renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(getAssetSwaps()[0]).toMatchObject({ status: 'cancelled', spentTxid: 'cancel-txid' }))
    expect(cancelOffer).toHaveBeenCalledOnce()
    expect(reloadWallet).toHaveBeenCalledOnce()
  })

  it('does not restore a stale status after another path resolves the cancellation', async () => {
    cancelOffer.mockRejectedValue(new Error('cancel failed'))
    let resolveVtxos!: (value: { vtxos: { txid: string; virtualStatus: { state: string } }[] }) => void
    getVtxos.mockReturnValue(new Promise((resolve) => (resolveVtxos = resolve)))

    renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(getAssetSwaps()[0].status).toBe('cancelling'))

    updateAssetSwap(pendingSwap.id, { status: 'fulfilled' })
    resolveVtxos({ vtxos: [{ txid: pendingSwap.fundingTxid, virtualStatus: { state: 'settled' } }] })

    await waitFor(() => expect(getAssetSwaps()[0].status).toBe('fulfilled'))
  })
})
