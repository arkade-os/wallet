import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CovenantTransfer } from '@arkade-taxi/client'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { ReceiverClaimsProvider } from '../../providers/receiverClaims'
import { rememberReceiverTaxi } from '../../lib/storage'
import type { ClaimWatch } from '../../lib/receiverClaims'
import { mockAspContextValue, mockSvcWallet, mockWalletContextValue } from '../screens/mocks'
import { BOB_ADDRESS, coins, satsFareClaim } from '../lib/receiverClaimsFixtures'
import { KEYS, TAXI_URL } from '../lib/receiverTaxiFixtures'

const stop = vi.hoisted(() => vi.fn())
const watchReceiverClaims = vi.hoisted(() => vi.fn<(watch: ClaimWatch) => () => void>(() => stop))
vi.mock('../../lib/receiverClaims', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/receiverClaims')>()),
  watchReceiverClaims,
}))

const svcWallet = {
  ...mockSvcWallet,
  getAddress: async () => BOB_ADDRESS,
  getSpendableVtxos: async () => coins([1000n]),
}

const tree = (network: string) => (
  <AspContext.Provider
    value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network, signerPubkey: KEYS.server } }}
  >
    <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet } as any}>
      <ReceiverClaimsProvider>
        <div />
      </ReceiverClaimsProvider>
    </WalletContext.Provider>
  </AspContext.Provider>
)

describe('ReceiverClaimsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    stop.mockClear()
    watchReceiverClaims.mockClear()
    rememberReceiverTaxi({ network: 'regtest', url: TAXI_URL, operatorKey: KEYS.operator })
    rememberReceiverTaxi({ network: 'mutinynet', url: 'https://taxi.other.example', operatorKey: KEYS.operator })
  })

  it("watches this network's remembered Taxis, and stops on a network change and on unmount", async () => {
    const { rerender, unmount } = render(tree('regtest'))
    await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalledTimes(1))
    expect(watchReceiverClaims.mock.calls[0][0]).toMatchObject({
      taxis: [{ network: 'regtest', url: TAXI_URL }],
      receiverAddress: BOB_ADDRESS,
    })
    rerender(tree('mutinynet'))
    await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalledTimes(2))
    expect(stop).toHaveBeenCalledTimes(1)
    unmount()
    expect(stop).toHaveBeenCalledTimes(2)
  })

  it('puts a verified claim in front of the user and claims nothing until he confirms', async () => {
    render(tree('regtest'))
    await waitFor(() => expect(watchReceiverClaims).toHaveBeenCalled())
    const recycle = vi.fn(async () => 'f'.repeat(64))
    const client = { info: vi.fn(), subscribeClaims: vi.fn(), verifyIncomingClaim: vi.fn(), recycle }
    act(() =>
      watchReceiverClaims.mock.calls[0][0].onOffer({
        taxi: { network: 'regtest', url: TAXI_URL, operatorKey: KEYS.operator },
        claim: satsFareClaim(7n),
        transfer: { transferId: 'tr-sats-7' } as unknown as CovenantTransfer,
        client,
      }),
    )
    expect(await screen.findByTestId('unclaimed-note')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Claim' })).toBeEnabled())
    expect(recycle).not.toHaveBeenCalled()
    // A click alone: the drawer's drag handlers need pointer capture, which jsdom lacks.
    fireEvent.click(screen.getByRole('button', { name: 'Claim' }))
    await waitFor(() => expect(recycle).toHaveBeenCalledTimes(1))
  })
})
