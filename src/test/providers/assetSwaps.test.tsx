import { useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AspContext } from '../../providers/asp'
import { AssetSwapsContext, AssetSwapsProvider } from '../../providers/assetSwaps'
import { WalletContext } from '../../providers/wallet'
import { addAssetSwap, getAssetSwaps, type AssetSwap } from '../../lib/swap/store'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

const cancelOffer = vi.hoisted(() => vi.fn())

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
  return <button onClick={() => cancelSwap(pendingSwap.id)}>Cancel</button>
}

describe('AssetSwapsProvider cancellation', () => {
  beforeEach(() => {
    localStorage.clear()
    cancelOffer.mockReset().mockResolvedValue('cancel-txid')
    addAssetSwap(pendingSwap)
  })

  afterEach(() => localStorage.clear())

  it('persists the cancellation transaction ID with the terminal status', async () => {
    const reloadWallet = vi.fn().mockResolvedValue(undefined)
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

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(getAssetSwaps()[0]).toMatchObject({ status: 'cancelled', spentTxid: 'cancel-txid' }))
    expect(cancelOffer).toHaveBeenCalledOnce()
    expect(reloadWallet).toHaveBeenCalledOnce()
  })
})
